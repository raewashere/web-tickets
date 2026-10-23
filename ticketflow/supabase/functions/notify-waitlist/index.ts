// supabase/functions/notify-waitlist/index.ts
// Edge Function: Marks top N FIFO waitlist subscribers as 'notified' via RPC
// and dispatches priority ticket availability emails through Resend.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotifyWaitlistPayload {
  eventId: string;
  ticketTypeId?: string | null;
  limit?: number;
}

interface NotifiedRow {
  id: string;
  email: string;
  ticket_type_name: string;
  created_at: string;
  notified_at: string;
}

function buildWaitlistEmailHtml(params: {
  eventName: string;
  artistName: string;
  venueName: string;
  eventDateFormatted: string;
  ticketTypeName: string;
  eventUrl: string;
  flyerUrl?: string | null;
}): string {
  const {
    eventName,
    artistName,
    venueName,
    eventDateFormatted,
    ticketTypeName,
    eventUrl,
    flyerUrl,
  } = params;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Boletos Liberados para ${eventName}! — BoletoCoqueto</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155;">
              <!-- Header -->
              <tr>
                <td style="background-color: #090d16; padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
                  <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px; margin-bottom: 12px;">
                    🔔 Alerta Prioritaria · Lista de Espera
                  </span>
                  <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">¡Se liberaron boletos!</h1>
                  <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">${artistName ? `${artistName} · ` : ''}${eventName}</p>
                </td>
              </tr>

              ${
                flyerUrl
                  ? `<tr>
                      <td style="padding: 0; background-color: #090d16; text-align: center;">
                        <img src="${flyerUrl}" alt="${eventName}" style="width: 100%; max-height: 240px; object-fit: cover; display: block;" />
                      </td>
                    </tr>`
                  : ''
              }

              <!-- Body -->
              <tr>
                <td style="padding: 30px;">
                  <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-top: 0;">
                    Estabas anotado en la lista de espera y tenemos excelentes noticias: <strong>acaban de liberarse lugares</strong> para el evento:
                  </p>

                  <div style="background-color: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155; margin: 22px 0;">
                    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #ffffff;">${eventName}</h2>
                    <p style="margin: 5px 0; font-size: 13px; color: #cbd5e1;">📍 <strong>Recinto:</strong> ${venueName}</p>
                    <p style="margin: 5px 0; font-size: 13px; color: #cbd5e1;">📅 <strong>Fecha:</strong> ${eventDateFormatted}</p>
                    <p style="margin: 5px 0; font-size: 13px; color: #fbbf24;">🎟️ <strong>Localidad solicitada:</strong> ${ticketTypeName || 'Cualquier localidad'}</p>
                  </div>

                  <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                    ⚠️ <strong>Importante:</strong> Los boletos liberados son limitados y se asignan conforme se complete la compra en la plataforma. Te recomendamos asegurar tus entradas lo antes posible.
                  </p>

                  <div style="text-align: center; margin: 30px 0 12px 0;">
                    <a href="${eventUrl}" style="display: inline-block; background-color: #f59e0b; color: #020617; font-size: 14px; font-weight: 900; padding: 14px 28px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
                      🎟️ Comprar mis Boletos Ahora
                    </a>
                  </div>

                  <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px;">
                    Si el botón no abre directamente, copia y pega este enlace en tu navegador:<br>
                    <a href="${eventUrl}" style="color: #38bdf8; word-break: break-all;">${eventUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #090d16; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
                  <p style="margin: 0; font-size: 11px; color: #64748b;">
                    © 2026 BoletoCoqueto · Recibiste este correo porque te registraste en la lista de espera del evento.
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

  const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autenticado.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !caller) {
      return jsonResponse({ error: 'Sesión inválida o expirada.' }, 401);
    }

    const body = (await req.json()) as NotifyWaitlistPayload;
    const { eventId, ticketTypeId = null, limit = 10 } = body;

    if (!eventId) {
      return jsonResponse({ error: 'Falta el parámetro eventId.' }, 400);
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));

    // 1. Atomically pop & mark top N pending waitlist rows via RPC (validates artist ownership / admin role)
    const { data: notifiedRows, error: rpcErr } = await supabaseAnon.rpc('notify_event_waitlist', {
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId || null,
      p_limit: safeLimit,
    });

    if (rpcErr) {
      console.error('notify_event_waitlist RPC error:', rpcErr);
      return jsonResponse({ error: rpcErr.message }, 403);
    }

    const rows = (notifiedRows || []) as NotifiedRow[];
    if (rows.length === 0) {
      return jsonResponse({
        success: true,
        notified: [],
        emailsSent: 0,
        emailStatus: 'skipped',
      });
    }

    // 2. Fetch event metadata for the email template
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, event_date, flyer_url, venues(name, city), artists(name)')
      .eq('id', eventId)
      .single();

    const eventName = event?.name || 'Concierto';
    const artistName = (event?.artists as unknown as { name?: string })?.name || '';
    const venueObj = event?.venues as unknown as { name?: string; city?: string } | null;
    const venueName = venueObj?.name
      ? `${venueObj.name}${venueObj.city ? `, ${venueObj.city}` : ''}`
      : 'Recinto Confirmado';
    const eventDateFormatted = event?.event_date
      ? new Date(event.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
      : 'Fecha programada';

    const storeBaseUrl =
      Deno.env.get('STORE_APP_URL') ||
      Deno.env.get('PUBLIC_STORE_URL') ||
      'https://boletocoqueto.vercel.app';
    const eventUrl = `${storeBaseUrl.replace(/\/$/, '')}/events/${eventId}`;

    // 3. Dispatch emails via Resend Batch API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ||
      Deno.env.get('EMAIL_FROM') ||
      'BoletoCoqueto <onboarding@resend.dev>';

    let emailStatus: 'sent' | 'simulated' | 'failed' = 'simulated';
    let emailsSent = 0;

    if (resendApiKey) {
      const batchPayload = rows.map((row) => ({
        from: fromEmail,
        to: [row.email],
        subject: `🎟️ ¡Boletos disponibles para ${eventName}! — Lista de Espera`,
        html: buildWaitlistEmailHtml({
          eventName,
          artistName,
          venueName,
          eventDateFormatted,
          ticketTypeName: row.ticket_type_name || 'Cualquier localidad',
          eventUrl,
          flyerUrl: event?.flyer_url || null,
        }),
      }));

      const resendRes = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      });

      if (resendRes.ok) {
        emailStatus = 'sent';
        emailsSent = rows.length;
      } else {
        const errText = await resendRes.text();
        console.error('Resend batch waitlist error:', errText);
        emailStatus = 'failed';
      }
    } else {
      console.log(
        `[notify-waitlist:simulated] Would send ${rows.length} waitlist emails for event ${eventName} (${eventId}).`,
      );
      emailsSent = rows.length;
    }

    return jsonResponse({
      success: true,
      notified: rows,
      emailsSent,
      emailStatus,
    });
  } catch (err) {
    console.error('notify-waitlist error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Error interno al notificar lista de espera.' },
      500,
    );
  }
});
