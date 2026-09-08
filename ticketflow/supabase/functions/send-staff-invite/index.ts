// supabase/functions/send-staff-invite/index.ts
// Edge Function: Sends doorman admission staff invitation email.
// Uses Resend API (or simulation mode if API key is not yet set).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InviteStaffPayload {
  eventId: string;
  email: string;
  token: string;
  invitedBy?: string;
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = (await req.json()) as InviteStaffPayload;
    const { eventId, email, token } = body;

    if (!eventId || !email || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (eventId, email, token).' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch event and inviter details
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('name, event_date, venues(name)')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: 'Event not found.' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const eventName = event.name || 'Concierto';
    const venueName = (event.venues as unknown as { name?: string })?.name || 'Recinto Oficial';
    const eventDate = event.event_date
      ? new Date(event.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
      : 'Fecha programada';

    const adminAppUrl = Deno.env.get('ADMIN_APP_URL') || 'https://ticketflow-admin.vercel.app';
    const inviteUrl = `${adminAppUrl}/staff-invite?token=${token}`;

    // 2. Build HTML Template
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Invitación al Personal de Control de Admisión — TicketFlow</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155;">
                <tr>
                  <td style="background-color: #090d16; padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
                    <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px;">
                      🛡️ Control de Admisión
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">Invitación de Validación de Accesos</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-top: 0;">
                      Has sido invitado como <strong>personal oficial de control de acceso</strong> para validar los boletos y códigos QR en el siguiente espectáculo:
                    </p>

                    <div style="background-color: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #334155; margin: 20px 0;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #f8fafc;">${eventName}</h2>
                      <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">📍 <strong>Lugar:</strong> ${venueName}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #94a3b8;">📅 <strong>Fecha:</strong> ${eventDate}</p>
                    </div>

                    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                      Haz clic en el siguiente botón para aceptar la invitación y acceder a la herramienta de escaneo:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${inviteUrl}" style="display: inline-block; background-color: #06b6d4; color: #020617; font-size: 14px; font-weight: 900; padding: 14px 28px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
                        ✓ Aceptar Invitación de Acceso
                      </a>
                    </div>

                    <p style="font-size: 11px; color: #64748b; line-height: 1.4;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                      <a href="${inviteUrl}" style="color: #38bdf8; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #090d16; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      © 2026 TicketFlow Technologies Inc.
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

    // 3. Send email with Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailStatus = 'simulated';
    let emailError: string | null = null;

    if (resendApiKey) {
      const fromEmail = Deno.env.get('EMAIL_FROM') || 'TicketFlow <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: `🛡️ Invitación de Control de Acceso — ${eventName}`,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        emailStatus = 'sent';
      } else {
        const errText = await res.text();
        console.error('Resend error:', errText);
        emailStatus = 'failed';
        emailError = errText;
      }
    } else {
      console.log(`[send-staff-invite:simulated] Invitation email sent to ${email} for event ${eventName}. URL: ${inviteUrl}`);
    }

    return new Response(
      JSON.stringify({
        success: emailStatus !== 'failed',
        recipient: email,
        status: emailStatus,
        error: emailError,
        inviteUrl,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-staff-invite error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
