// supabase/functions/create-paypal-order/index.ts
// Edge Function: Creates a PayPal order and returns the orderID to the client.
// The client then renders the PayPal SDK button which captures the payment.
//
// Supports BOTH authenticated users and guests.
// Guests must provide guestEmail in the request body (no Authorization header needed).
//
// Environment variables required (set in Supabase Dashboard → Edge Functions → Secrets):
//   PAYPAL_CLIENT_ID     – PayPal REST API client ID
//   PAYPAL_CLIENT_SECRET – PayPal REST API client secret
//   PAYPAL_MODE          – "sandbox" | "live"  (default: sandbox)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// PayPal helpers
// ---------------------------------------------------------------------------

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
    const err = await res.text();
    throw new Error(`PayPal token error: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function createPayPalOrder(
  baseUrl: string,
  accessToken: string,
  amountMXN: number,
  description: string,
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(), // Idempotency key
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description,
          amount: {
            currency_code: 'MXN',
            value: amountMXN.toFixed(2),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal order creation error: ${err}`);
  }

  return await res.json();
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
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
    // -------------------------------------------------------------------------
    // 1. Resolve caller identity — authenticated user OR guest
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let user: { id: string; email?: string } | null = null;

    if (authHeader) {
      // Authenticated user — validate JWT
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: authUser }, error: authError } = await supabaseAnon.auth.getUser();
      if (!authError && authUser) {
        user = authUser;
      }
    }

    // -------------------------------------------------------------------------
    // 2. Parse and validate body
    // -------------------------------------------------------------------------
    const body = await req.json() as {
      eventId:     string;
      eventName:   string;
      amountMXN:   number;
      sessionId:   string;
      guestEmail?: string;   // Required when no Authorization header
      guestName?:  string;
    };

    const { eventId, eventName, amountMXN, sessionId, guestEmail, guestName } = body;

    // Must have a logged-in user OR a guest email
    if (!user && (!guestEmail || guestEmail.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'Se requiere autenticación o correo electrónico de invitado.' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!eventId || !amountMXN || amountMXN <= 0 || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Payload inválido. Se requiere eventId, amountMXN > 0, sessionId.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // -------------------------------------------------------------------------
    // 3. Verify the session has active (non-expired) locks for this event
    // -------------------------------------------------------------------------
    const { data: locks, error: locksErr } = await supabaseAdmin
      .from('ticket_locks')
      .select('id, quantity, locked_until, ticket_type_id')
      .eq('session_id', sessionId)
      .gt('locked_until', new Date().toISOString());

    if (locksErr || !locks || locks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron reservas activas para esta sesión. Por favor reinicia el checkout.' }),
        { status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // -------------------------------------------------------------------------
    // 4. Get PayPal credentials
    // -------------------------------------------------------------------------
    const clientId     = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const mode         = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

    if (!clientId || !clientSecret) {
      console.error('Missing PayPal credentials in env');
      return new Response(
        JSON.stringify({ error: 'Pasarela de pago no configurada. Contacta a soporte.' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const paypalBase = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // -------------------------------------------------------------------------
    // 5. Create PayPal order
    // -------------------------------------------------------------------------
    const ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);
    const ppOrder = await createPayPalOrder(
      paypalBase,
      ppAccessToken,
      amountMXN,
      `TicketFlow — ${eventName ?? 'Boletos'}`,
    );

    // -------------------------------------------------------------------------
    // 6. Return PayPal orderID (client will render PayPal buttons and capture)
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        paypalOrderId: ppOrder.id,
        paypalStatus:  ppOrder.status,
        amount:        amountMXN,
        currency:      'MXN',
        // Echo back so the client can forward to create-order
        isGuest:    !user,
        guestEmail: guestEmail ?? null,
        guestName:  guestName  ?? null,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('create-paypal-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
