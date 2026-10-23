// supabase/functions/send-ticket-email/index.ts
// Edge Function: Sends transactional order confirmation & ticket access email to buyer.
// Uses Resend API (or SMTP / fallback preview logger if key is not configured).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OrderEmailPayload {
  orderId: string;
  recipientEmail?: string;
  accessToken?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json() as OrderEmailPayload;
    const { orderId, accessToken } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId parameter.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch order details with relations
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*, events(*, venues(*), artists(*)), order_items(*, ticket_types(*)), profiles(display_name)')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found.' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify authorization: internal service_role, order's access_token, or authenticated owner/admin
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? '';
    const isServiceRole = bearerToken !== '' && bearerToken === serviceRoleKey;
    const hasValidAccessToken = Boolean(accessToken && order.access_token && accessToken === order.access_token);

    if (!isServiceRole && !hasValidAccessToken) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const supabaseAnon = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller }, error: callerErr } = await supabaseAnon.auth.getUser();
      if (callerErr || !caller) {
        return new Response(JSON.stringify({ error: 'Invalid session token.' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (order.customer_id !== caller.id) {
        const { data: adminRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', caller.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (!adminRole) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 3. Resolve recipient email strictly from the order (prevents email spoofing/exfiltration)
    let targetEmail: string | undefined = order.guest_email || undefined;
    if (!targetEmail && order.customer_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
      targetEmail = userData?.user?.email;
    }

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'Customer email not found.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const customerName = order.profiles?.display_name || order.guest_name || targetEmail.split('@')[0];
    const eventName = order.events?.name || 'Espectáculo';
    const venueName = order.events?.venues?.name || 'Recinto Confirmado';
    const eventDate = order.events?.event_date
      ? new Date(order.events.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
      : 'Fecha por confirmar';
    const storeBaseUrl = Deno.env.get('STORE_BASE_URL') || 'https://tu-dominio.com';
    const ticketUrl = `${storeBaseUrl}/ticket/${order.id}?token=${order.access_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TICKETFLOW-AUTH-${order.id}`;

    // 3. Build Items HTML table
    const itemsHtml = (order.order_items || [])
      .map((item: { ticket_types?: { name: string; sku: string }; quantity: number; unit_price: number; total: number }) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #2d3748; color: #edf2f7; font-size: 14px;">
            <strong>${item.ticket_types?.name || 'Entrada'}</strong>
            <span style="font-size: 11px; color: #a0aec0; display: block; font-family: monospace;">SKU: ${item.ticket_types?.sku || '-'}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #2d3748; color: #edf2f7; text-align: center; font-size: 14px;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #2d3748; color: #edf2f7; text-align: right; font-size: 14px; font-family: monospace;">
            $${Number(item.unit_price).toFixed(2)} MXN
          </td>
        </tr>
      `)
      .join('');

    // 4. Email Theme Configuration & Responsive HTML Email Template
    const EMAIL_THEME = {
      primary: '#540D6E',           /* MD3 primary — deep violet */
      accent: '#EE4266',            /* MD3 secondary — rose coral */
      surface: '#FEFAFF',           /* MD3 surface — light violet tint */
      dark: '#210124',              /* MD3 inverse-surface — deep eggplant night */
      cardBg: '#3B094E',            /* primary tone-25 */
      headerBg: '#1B0325',          /* primary tone-10 */
      contrast: '#FFD23F',          /* MD3 tertiary — golden yellow */
      border: 'rgba(254, 250, 255, 0.1)',
      borderAccent: 'rgba(238, 66, 102, 0.3)',
      primaryAlertBg: 'rgba(84, 13, 110, 0.35)',
    };

    const htmlEmail = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Confirmación de Compra — BoletoCoqueto</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: ${EMAIL_THEME.dark}; font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${EMAIL_THEME.surface};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${EMAIL_THEME.dark}; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: ${EMAIL_THEME.cardBg}; border-radius: 24px; overflow: hidden; border: 1px solid ${EMAIL_THEME.border}; box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.6);">
                <!-- Header -->
                <tr>
                  <td style="background-color: ${EMAIL_THEME.headerBg}; padding: 32px 30px; text-align: center; border-bottom: 1px solid ${EMAIL_THEME.border};">
                    <span style="display: inline-block; background-color: ${EMAIL_THEME.primary}; color: ${EMAIL_THEME.surface}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 6px 14px; border-radius: 999px; margin-bottom: 12px; border: 1px solid ${EMAIL_THEME.accent};">
                      BoletoCoqueto Pass
                    </span>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${EMAIL_THEME.surface};">¡Tus Boletos Están Listos!</h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: ${EMAIL_THEME.accent}; font-family: monospace; font-weight: 700;">Orden #${order.id.substring(0, 8).toUpperCase()}</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="font-size: 15px; line-height: 1.5; color: ${EMAIL_THEME.surface}; margin-top: 0;">
                      Hola <strong>${customerName}</strong>, tu compra ha sido confirmada con éxito. A continuación encontrarás el resumen oficial de tu acceso.
                    </p>

                    <!-- Event Card -->
                    <div style="background-color: ${EMAIL_THEME.dark}; border-radius: 16px; padding: 20px; border: 1px solid ${EMAIL_THEME.border}; margin: 24px 0;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: ${EMAIL_THEME.surface};">${eventName}</h2>
                      <p style="margin: 4px 0; font-size: 13px; color: ${EMAIL_THEME.surface}; opacity: 0.8;">📍 <strong>Lugar:</strong> ${venueName}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: ${EMAIL_THEME.surface}; opacity: 0.8;">📅 <strong>Fecha:</strong> ${eventDate}</p>
                    </div>

                    <!-- Items Table -->
                    <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${EMAIL_THEME.accent}; margin: 24px 0 10px 0;">Detalle de Boletos</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: ${EMAIL_THEME.surface}; opacity: 0.6; border-bottom: 1px solid ${EMAIL_THEME.border};">Tipo</th>
                          <th align="center" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: ${EMAIL_THEME.surface}; opacity: 0.6; border-bottom: 1px solid ${EMAIL_THEME.border};">Cant.</th>
                          <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: ${EMAIL_THEME.surface}; opacity: 0.6; border-bottom: 1px solid ${EMAIL_THEME.border};">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- Totals -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid ${EMAIL_THEME.border}; padding-top: 14px;">
                      <tr>
                        <td style="font-size: 13px; color: ${EMAIL_THEME.surface}; opacity: 0.7; padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="font-size: 13px; color: ${EMAIL_THEME.surface}; font-family: monospace; font-weight: 700;">$${Number(order.subtotal).toFixed(2)} MXN</td>
                      </tr>
                      ${order.discount_amount > 0 ? `
                      <tr>
                        <td style="font-size: 13px; color: ${EMAIL_THEME.accent}; padding: 4px 0; font-weight: 700;">Descuento:</td>
                        <td align="right" style="font-size: 13px; color: ${EMAIL_THEME.accent}; font-family: monospace; font-weight: 700;">-$${Number(order.discount_amount).toFixed(2)} MXN</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size: 16px; font-weight: 700; color: ${EMAIL_THEME.surface}; padding: 10px 0 0 0; border-top: 1px solid ${EMAIL_THEME.border};">Total Pagado:</td>
                        <td align="right" style="font-size: 18px; font-weight: 700; color: ${EMAIL_THEME.accent}; font-family: monospace; padding: 10px 0 0 0; border-top: 1px solid ${EMAIL_THEME.border};">$${Number(order.total).toFixed(2)} MXN</td>
                      </tr>
                    </table>

                    <!-- QR Code & Direct Ticket Link (works for both Guests and Registered Users) -->
                    <div style="background-color: ${EMAIL_THEME.dark}; border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid ${EMAIL_THEME.borderAccent};">
                      <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${EMAIL_THEME.contrast};">
                        Código QR Oficial de Acceso
                      </p>
                      <div style="display: inline-block; background-color: #ffffff; padding: 14px; border-radius: 16px;">
                        <img src="${qrImageUrl}" alt="Código QR de acceso Orden ${order.id}" width="200" height="200" style="display: block; border: 0;" />
                      </div>
                      <p style="margin: 12px 0 16px 0; font-size: 11px; font-family: monospace; color: ${EMAIL_THEME.surface}; opacity: 0.75;">
                        TICKETFLOW-AUTH-${order.id}
                      </p>
                      <a href="${ticketUrl}" target="_blank" style="display: inline-block; background-color: ${EMAIL_THEME.accent}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 999px;">
                        Ver y Descargar Mi Boleto Digital
                      </a>
                    </div>

                    <!-- Instructions / CTA -->
                    <div style="background-color: ${EMAIL_THEME.primaryAlertBg}; border-radius: 16px; padding: 18px; margin: 24px 0; border: 1px solid ${EMAIL_THEME.borderAccent};">
                      <p style="margin: 0; font-size: 13px; color: ${EMAIL_THEME.surface}; line-height: 1.5;">
                        📲 <strong>Instrucciones de Acceso:</strong> Presenta el código QR de este correo o abre el enlace superior desde tu celular en la entrada del evento. No compartas este enlace ni tu código QR con terceros.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: ${EMAIL_THEME.headerBg}; padding: 20px 30px; text-align: center; border-top: 1px solid ${EMAIL_THEME.border};">
                    <p style="margin: 0; font-size: 11px; color: ${EMAIL_THEME.surface}; opacity: 0.6; line-height: 1.5;">
                      © 2026 BoletoCoqueto Technologies Inc. Todos los derechos reservados.<br>
                      Este es un correo automático de confirmación de compra y emisión de entradas.
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

    // 5. Send via Resend API if API Key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailStatus = 'simulated';

    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:
            Deno.env.get('RESEND_FROM_EMAIL') ||
            Deno.env.get('EMAIL_FROM') ||
            'BoletoCoqueto <onboarding@resend.dev>',
          to: [targetEmail],
          subject: `🎟️ Tus Boletos para ${eventName} — Orden #${order.id.substring(0, 8).toUpperCase()}`,
          html: htmlEmail,
        }),
      });

      if (resendRes.ok) {
        emailStatus = 'sent';
      } else {
        const errText = await resendRes.text();
        console.error('Resend API error:', errText);
        emailStatus = 'failed';
      }
    } else {
      console.log(`[send-ticket-email:simulated] Email to ${targetEmail} for order ${orderId} generated successfully.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        recipient: targetEmail,
        status: emailStatus,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('send-ticket-email error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
