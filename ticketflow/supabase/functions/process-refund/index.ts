// supabase/functions/process-refund/index.ts
// Edge Function: Super-Admin refund processor with automatic PayPal Refund API execution.
//
// Flow:
//   1. Authenticate caller JWT and verify Super-Admin role ('admin' in user_roles).
//   2. Fetch pending refund_request and its associated order.
//   3. If approved === true and order.payment_provider === 'paypal':
//      - Resolve PayPal capture ID from order.payment_reference (PayPal order ID)
//      - Execute full refund via PayPal v2 Captures Refund API (idempotent)
//   4. Invoke process_refund_request RPC to atomically update DB (refund_requests,
//      orders, ticket_validations, and restore ticket_types stock).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProcessRefundPayload {
  requestId: string;
  approved: boolean;
  adminNotes?: string | null;
}

async function getPayPalAccessToken(baseUrl: string, clientId: string, secret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`PayPal auth error: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function resolvePayPalCapture(
  baseUrl: string,
  accessToken: string,
  paymentReference: string,
): Promise<{ captureId: string; alreadyRefunded: boolean }> {
  // payment_reference is stored as the PayPal Order ID in create-order.
  // Look up the order to extract purchase_units[0].payments.captures[0].
  const res = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paymentReference)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    const orderData = await res.json();
    const capture = orderData?.purchase_units?.[0]?.payments?.captures?.[0];
    if (capture?.id) {
      return {
        captureId: capture.id as string,
        alreadyRefunded: capture.status === 'REFUNDED',
      };
    }
  }

  // Fallback in case payment_reference is already a capture ID
  return { captureId: paymentReference, alreadyRefunded: false };
}

async function refundPayPalCapture(
  baseUrl: string,
  accessToken: string,
  captureId: string,
  requestId: string,
  noteToPayer?: string | null,
): Promise<{ refundId: string; status: string }> {
  const bodyPayload: Record<string, string> = {};
  if (noteToPayer && noteToPayer.trim().length > 0) {
    bodyPayload.note_to_payer = noteToPayer.trim().slice(0, 255);
  }

  const res = await fetch(`${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `refund-req-${requestId}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    // If PayPal reports CAPTURE_FULLY_REFUNDED, treat as idempotent success
    if (errText.includes('CAPTURE_FULLY_REFUNDED')) {
      return { refundId: captureId, status: 'COMPLETED' };
    }
    throw new Error(`PayPal refund error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return { refundId: data.id as string, status: data.status as string };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  try {
    // 1. Verify caller JWT and Super-Admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'No autenticado.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !caller) {
      return jsonResponse({ success: false, error: 'Sesión inválida o expirada.' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return jsonResponse(
        { success: false, error: 'Solo el Super-Admin de la plataforma puede aprobar o rechazar reembolsos.' },
        403,
      );
    }

    // 2. Parse payload and fetch refund request + order
    const body = (await req.json()) as ProcessRefundPayload;
    const { requestId, approved, adminNotes } = body;

    if (!requestId || typeof approved !== 'boolean') {
      return jsonResponse({ success: false, error: 'Parámetros inválidos (requestId, approved).' }, 400);
    }

    const { data: refundReq, error: reqErr } = await supabaseAdmin
      .from('refund_requests')
      .select(
        'id, order_id, status, amount, reason, orders(id, status, total, customer_id, guest_email, guest_name, access_token, payment_provider, payment_reference, events(name, event_date, venues(name)), profiles(display_name))',
      )
      .eq('id', requestId)
      .single();

    if (reqErr || !refundReq) {
      return jsonResponse({ success: false, error: 'Solicitud de reembolso no encontrada.' }, 404);
    }

    if (refundReq.status !== 'pending') {
      return jsonResponse({ success: false, error: 'Esta solicitud ya fue procesada previamente.' }, 409);
    }

    const order = refundReq.orders as unknown as {
      id: string;
      status: string;
      total: number;
      customer_id: string | null;
      guest_email: string | null;
      guest_name: string | null;
      access_token: string | null;
      payment_provider: string | null;
      payment_reference: string | null;
      events?: { name?: string; event_date?: string; venues?: { name?: string } | null } | null;
      profiles?: { display_name?: string | null } | null;
    } | null;

    // 3. If approving a paid PayPal order, execute the refund in PayPal first
    let paypalRefundId: string | null = null;

    if (
      approved &&
      order &&
      order.payment_provider === 'paypal' &&
      order.payment_reference &&
      !order.payment_reference.startsWith('FREE-') &&
      Number(order.total) > 0
    ) {
      const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
      const mode = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

      if (!clientId || !clientSecret) {
        return jsonResponse(
          { success: false, error: 'Credenciales de PayPal no configuradas en el servidor para ejecutar el reembolso.' },
          503,
        );
      }

      const paypalBase = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);
      const { captureId, alreadyRefunded } = await resolvePayPalCapture(
        paypalBase,
        ppAccessToken,
        order.payment_reference,
      );

      if (!alreadyRefunded) {
        const ppRefund = await refundPayPalCapture(
          paypalBase,
          ppAccessToken,
          captureId,
          requestId,
          adminNotes,
        );
        if (ppRefund.status !== 'COMPLETED' && ppRefund.status !== 'PENDING') {
          return jsonResponse(
            { success: false, error: `PayPal devolvió estado inesperado en reembolso: ${ppRefund.status}` },
            502,
          );
        }
        paypalRefundId = ppRefund.refundId;
      } else {
        paypalRefundId = captureId;
      }
    }

    // 4. Commit atomic database state update via process_refund_request RPC
    const finalNotes = paypalRefundId
      ? `${adminNotes?.trim() || 'Reembolso aprobado'} [PayPal Refund ID: ${paypalRefundId}]`
      : (adminNotes?.trim() || null);

    const { data: rpcResult, error: rpcErr } = await supabaseAnon.rpc('process_refund_request', {
      p_request_id: requestId,
      p_approved: approved,
      p_admin_notes: finalNotes,
    });

    if (rpcErr) {
      console.error('process_refund_request RPC error:', rpcErr);
      return jsonResponse({ success: false, error: rpcErr.message }, 500);
    }

    // 5. Send transactional resolution email via Resend (non-blocking for DB state)
    let emailStatus: 'sent' | 'simulated' | 'skipped' | 'failed' = 'skipped';
    if (order) {
      try {
        let targetEmail: string | undefined = order.guest_email || undefined;
        if (!targetEmail && order.customer_id) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
          targetEmail = userData?.user?.email;
        }

        if (targetEmail) {
          const customerName =
            order.profiles?.display_name || order.guest_name || targetEmail.split('@')[0];
          const eventName = order.events?.name || 'Espectáculo';
          const venueName = order.events?.venues?.name || 'Recinto Oficial';
          const orderShortId = order.id.substring(0, 8).toUpperCase();
          const refundAmountFormatted = `$${Number(refundReq.amount || order.total || 0).toFixed(2)} MXN`;
          const storeBaseUrl =
            Deno.env.get('STORE_APP_URL') ||
            Deno.env.get('PUBLIC_STORE_URL') ||
            'https://boletocoqueto.vercel.app';
          const ticketUrl = order.access_token
            ? `${storeBaseUrl.replace(/\/$/, '')}/ticket/${order.id}?token=${order.access_token}`
            : `${storeBaseUrl.replace(/\/$/, '')}/my-tickets/${order.id}`;

          const badgeBg = approved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
          const badgeColor = approved ? '#34d399' : '#fbbf24';
          const badgeLabel = approved ? '✓ Reembolso Aprobado' : 'ℹ Solicitud de Reembolso Declinada';
          const headline = approved
            ? 'Tu reembolso ha sido procesado'
            : 'Actualización sobre tu solicitud de reembolso';
          const cleanAdminNotes = adminNotes?.trim() || (approved
            ? 'Tu solicitud fue aprobada y el importe ha sido devuelto a tu método de pago original.'
            : 'La solicitud no cumple con las condiciones de reembolso aplicables para este evento.');

          const htmlEmail = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${headline} — BoletoCoqueto</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155;">
                      <tr>
                        <td style="background-color: #090d16; padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
                          <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px; margin-bottom: 12px;">
                            ${badgeLabel}
                          </span>
                          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">${headline}</h1>
                          <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">Orden #${orderShortId} · ${eventName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px;">
                          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-top: 0;">
                            Hola <strong style="color: #ffffff;">${customerName}</strong>,
                          </p>
                          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                            ${
                              approved
                                ? `Te confirmamos que tu solicitud de reembolso para <strong>${eventName}</strong> (${venueName}) ha sido <strong>aprobada</strong>.`
                                : `Hemos revisado tu solicitud de reembolso para <strong>${eventName}</strong> (${venueName}) y en esta ocasión ha sido <strong>declinada</strong>.`
                            }
                          </p>

                          <div style="background-color: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155; margin: 24px 0;">
                            <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">
                              <strong>Orden:</strong> #${orderShortId}
                            </p>
                            ${
                              approved
                                ? `<p style="margin: 8px 0 4px 0; font-size: 15px; color: #34d399; font-weight: 800;">
                                     Monto reembolsado: ${refundAmountFormatted}
                                   </p>`
                                : ''
                            }
                            ${
                              paypalRefundId
                                ? `<p style="margin: 4px 0; font-size: 12px; color: #94a3b8; font-family: monospace;">
                                     Folio PayPal: ${paypalRefundId}
                                   </p>`
                                : ''
                            }
                            <p style="margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #1e293b; font-size: 13px; color: #e2e8f0;">
                              <strong>Nota de administración:</strong> "${cleanAdminNotes}"
                            </p>
                          </div>

                          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                            ${
                              approved
                                ? 'El saldo se verá reflejado automáticamente en tu cuenta de PayPal o tarjeta bancaria según los tiempos de procesamiento de tu institución financiera (generalmente de 1 a 5 días hábiles). El código QR de esta orden ha quedado cancelado.'
                                : 'Tus boletos y código QR siguen activos y son 100% válidos para tu ingreso al evento.'
                            }
                          </p>

                          <div style="text-align: center; margin: 28px 0 10px 0;">
                            <a href="${ticketUrl}" style="display: inline-block; background-color: #06b6d4; color: #020617; font-size: 13px; font-weight: 900; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                              Ver Estado de mi Orden
                            </a>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #090d16; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
                          <p style="margin: 0; font-size: 11px; color: #64748b;">
                            © 2026 BoletoCoqueto · Notificación automática de reembolsos.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;

          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            const fromEmail =
              Deno.env.get('RESEND_FROM_EMAIL') ||
              Deno.env.get('EMAIL_FROM') ||
              'BoletoCoqueto <onboarding@resend.dev>';
            const subject = approved
              ? `✓ Reembolso Aprobado — ${eventName} (Orden #${orderShortId})`
              : `Actualización de Solicitud de Reembolso — ${eventName} (Orden #${orderShortId})`;

            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [targetEmail],
                subject,
                html: htmlEmail,
              }),
            });

            if (emailRes.ok) {
              emailStatus = 'sent';
            } else {
              console.error('Resend refund email error:', await emailRes.text());
              emailStatus = 'failed';
            }
          } else {
            console.log(
              `[process-refund:simulated] Refund resolution email (${approved ? 'APPROVED' : 'REJECTED'}) for ${targetEmail} (order ${order.id}).`,
            );
            emailStatus = 'simulated';
          }
        }
      } catch (emailErr) {
        console.error('Non-blocking error sending refund email:', emailErr);
        emailStatus = 'failed';
      }
    }

    return jsonResponse({
      ...(rpcResult as Record<string, unknown>),
      paypalRefundId,
      emailStatus,
    });
  } catch (err) {
    console.error('process-refund error:', err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : 'Error interno al procesar el reembolso.' },
      500,
    );
  }
});
