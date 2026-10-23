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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token.' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid session.' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as InviteStaffPayload;
    const { eventId, email, token } = body;

    if (!eventId || !email || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (eventId, email, token).' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch event and verify caller is the event's artist owner or a Super-Admin
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('name, event_date, artist_id, artists(user_id), venues(name)')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: 'Event not found.' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const artistOwnerId = (event.artists as unknown as { user_id?: string })?.user_id;
    if (artistOwnerId !== caller.id) {
      const { data: adminRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: only the event organizer or an admin can invite staff.' }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Verify the invitation token actually exists in staff_invitations for this event & email
    const { data: inviteRow } = await supabaseAdmin
      .from('staff_invitations')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email.trim().toLowerCase())
      .eq('token', token)
      .maybeSingle();

    if (!inviteRow) {
      return new Response(
        JSON.stringify({ error: 'Invalid staff invitation token.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const eventName = event.name || 'Concierto';
    const venueName = (event.venues as unknown as { name?: string })?.name || 'Recinto Oficial';
    const eventDate = event.event_date
      ? new Date(event.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
      : 'Fecha programada';

    const adminAppUrl = Deno.env.get('ADMIN_APP_URL') || 'https://ticketflow-admin.vercel.app';
    const inviteUrl = `${adminAppUrl}/staff-invite?token=${token}`;

    // 2. Build HTML Template (BoletoCoqueto Electric Fiesta M3 Theme)
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es-MX">
      <head>
        <meta charset="UTF-8">
        <title>Invitación al Control de Admisión — BoletoCoqueto</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #160E1A; font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FEFAFF;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #160E1A; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #211626; border-radius: 24px; overflow: hidden; border: 1px solid #423649;">
                <tr>
                  <td style="background: linear-gradient(135deg, #3C0650 0%, #540D6E 60%, #EE4266 100%); padding: 32px 30px; text-align: center; border-bottom: 1px solid #423649;">
                    <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #FEFAFF; margin-bottom: 10px;">
                      Boleto<span style="color: #FFD23F;">Coqueto</span> <span style="color: #FFD23F;">✦</span>
                    </div>
                    <span style="display: inline-block; background-color: rgba(255, 210, 63, 0.18); color: #FFD23F; border: 1px solid rgba(255, 210, 63, 0.4); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px; margin-bottom: 12px;">
                      🛡️ Aliado de Acceso Oficial
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #FFFFFF;">Invitación de Validación de Boletos</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px;">
                    <p style="font-size: 15px; color: #EEE4F4; line-height: 1.6; margin-top: 0;">
                      ¡Hola! Has sido invitado como parte del <strong>equipo oficial de control de acceso</strong> para dar la bienvenida al público y escanear los códigos QR en:
                    </p>

                    <div style="background-color: #160E1A; border-radius: 16px; padding: 20px; border: 1px solid #423649; margin: 22px 0;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #FFD23F;">${eventName}</h2>
                      <p style="margin: 4px 0; font-size: 13px; color: #D1C6D9;">📍 <strong>Recinto:</strong> ${venueName}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #D1C6D9;">📅 <strong>Fecha:</strong> ${eventDate}</p>
                    </div>

                    <p style="font-size: 13px; color: #D1C6D9; line-height: 1.5;">
                      Haz clic en el siguiente botón para activar tu acceso como validador y abrir el escáner en vivo:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${inviteUrl}" style="display: inline-block; background-color: #EE4266; color: #FFFFFF; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(238, 66, 102, 0.4);">
                        ✓ Activar Mi Acceso de Staff
                      </a>
                    </div>

                    <p style="font-size: 11px; color: #93869A; line-height: 1.4;">
                      Si el botón no abre directamente, copia y pega este enlace seguro en tu navegador:<br>
                      <a href="${inviteUrl}" style="color: #FFD23F; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #160E1A; padding: 20px 30px; text-align: center; border-top: 1px solid #423649;">
                    <p style="margin: 0; font-size: 11px; color: #93869A;">
                      © 2026 BoletoCoqueto · Tu aliado creativo en música en vivo · boletocoqueto.com
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
      const fromEmail =
        Deno.env.get('RESEND_FROM_EMAIL') ||
        Deno.env.get('EMAIL_FROM') ||
        'BoletoCoqueto <onboarding@resend.dev>';
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
