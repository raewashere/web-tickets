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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json() as OrderEmailPayload;
    const { orderId, recipientEmail } = body;

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

    // 2. Fetch recipient email from auth.users if not provided directly
    let targetEmail = recipientEmail;
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

    const customerName = order.profiles?.display_name || targetEmail.split('@')[0];
    const eventName = order.events?.name || 'Espectáculo';
    const venueName = order.events?.venues?.name || 'Recinto Confirmado';
    const eventDate = order.events?.event_date
      ? new Date(order.events.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
      : 'Fecha por confirmar';

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

    // 4. Build Responsive HTML Email Template
    const htmlEmail = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Confirmación de Compra — TicketFlow</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #090d16; padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
                    <span style="display: inline-block; background-color: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(99, 102, 241, 0.4); margin-bottom: 12px;">
                      TicketFlow Pass
                    </span>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">¡Tus Boletos Están Listos!</h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Orden #${order.id.substring(0, 8).toUpperCase()}</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1; margin-top: 0;">
                      Hola <strong>${customerName}</strong>, tu compra ha sido confirmada con éxito. A continuación encontrarás el resumen oficial de tu acceso.
                    </p>

                    <!-- Event Card -->
                    <div style="background-color: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155; margin: 24px 0;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #f8fafc;">${eventName}</h2>
                      <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">📍 <strong>Lugar:</strong> ${venueName}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">📅 <strong>Fecha:</strong> ${eventDate}</p>
                    </div>

                    <!-- Items Table -->
                    <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 24px 0 10px 0;">Detalle de Boletos</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #334155;">Tipo</th>
                          <th align="center" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #334155;">Cant.</th>
                          <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #334155;">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- Totals -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #334155; padding-top: 12px;">
                      <tr>
                        <td style="font-size: 13px; color: #94a3b8; padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="font-size: 13px; color: #e2e8f0; font-family: monospace;">$${Number(order.subtotal).toFixed(2)} MXN</td>
                      </tr>
                      ${order.discount_amount > 0 ? `
                      <tr>
                        <td style="font-size: 13px; color: #f43f5e; padding: 4px 0; font-weight: bold;">Descuento:</td>
                        <td align="right" style="font-size: 13px; color: #f43f5e; font-family: monospace; font-weight: bold;">-$${Number(order.discount_amount).toFixed(2)} MXN</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size: 13px; color: #94a3b8; padding: 4px 0;">Comisión de servicio:</td>
                        <td align="right" style="font-size: 13px; color: #e2e8f0; font-family: monospace;">$${Number(order.commission_amount).toFixed(2)} MXN</td>
                      </tr>
                      <tr>
                        <td style="font-size: 16px; font-weight: 900; color: #ffffff; padding: 10px 0 0 0; border-top: 1px solid #334155;">Total Pagado:</td>
                        <td align="right" style="font-size: 16px; font-weight: 900; color: #818cf8; font-family: monospace; padding: 10px 0 0 0; border-top: 1px solid #334155;">$${Number(order.total).toFixed(2)} MXN</td>
                      </tr>
                    </table>

                    <!-- Instructions -->
                    <div style="background-color: rgba(99, 102, 241, 0.1); border-radius: 12px; padding: 16px; margin: 24px 0; border: 1px solid rgba(99, 102, 241, 0.2);">
                      <p style="margin: 0; font-size: 12px; color: #c7d2fe; line-height: 1.5;">
                        📲 <strong>Instrucciones de Acceso:</strong> Puedes presentar tu código QR oficial directamente desde la app web de TicketFlow en tu celular o imprimir el comprobante desde la sección <em>Mis Boletos</em>.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #090d16; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      © 2026 TicketFlow Technologies Inc. Todos los derechos reservados.<br>
                      Este es un correo automático de confirmación de compra.
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
          from: Deno.env.get('EMAIL_FROM') || 'TicketFlow <boletos@ticketflow.io>',
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
