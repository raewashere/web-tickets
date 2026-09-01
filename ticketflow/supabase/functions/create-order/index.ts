// supabase/functions/create-order/index.ts
// Edge Function: Server-side atomic order creation after PayPal payment capture.
//
// Flow:
//   1. Client sends { paypalOrderId, sessionId, eventId, couponId? }
//   2. We capture the PayPal payment (CAPTURE)
//   3. We read ticket locks for the session
//   4. We call the DB function create_order_atomic() which in a single transaction:
//      - Creates order + order_items
//      - Updates ticket_types.sold
//      - Decrements ticket_types.reserved
//      - Deletes ticket_locks
//      - Increments coupon.uses_count if applicable
//   5. Returns the created order
//
// Environment variables required:
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE

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
  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

async function capturePayPalOrder(
  baseUrl: string,
  accessToken: string,
  paypalOrderId: string,
): Promise<{ status: string; id: string; purchase_units: unknown[] }> {
  const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PayPal capture error: ${await res.text()}`);
  return await res.json();
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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
    // 1. Authenticate
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

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse body
    const body = await req.json() as {
      paypalOrderId: string;     // PayPal order ID to capture
      sessionId:     string;     // ticket_locks session
      eventId:       string;
      couponId?:     string | null;
      isFree?:       boolean;    // true for courtesy orders (no PayPal capture)
    };

    const { paypalOrderId, sessionId, eventId, couponId, isFree } = body;

    if (!sessionId || !eventId || (!paypalOrderId && !isFree)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Verify locks still valid
    const { data: locks, error: locksErr } = await supabaseAdmin
      .from('ticket_locks')
      .select('id, quantity, locked_until, ticket_type_id')
      .eq('session_id', sessionId)
      .gt('locked_until', new Date().toISOString());

    if (locksErr || !locks || locks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Las reservas han expirado. Por favor reinicia el proceso de compra.' }),
        { status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Capture PayPal payment (skip for free/courtesy orders)
    let paymentReference = `FREE-${crypto.randomUUID()}`;

    if (!isFree) {
      const clientId     = Deno.env.get('PAYPAL_CLIENT_ID');
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
      const mode         = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Payment gateway not configured.' }),
          { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      const paypalBase = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const accessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);
      const captureResult = await capturePayPalOrder(paypalBase, accessToken, paypalOrderId);

      if (captureResult.status !== 'COMPLETED') {
        return new Response(
          JSON.stringify({ error: `PayPal payment not completed: ${captureResult.status}` }),
          { status: 402, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      paymentReference = captureResult.id;
    }

    // 5. Call atomic DB function to create order + items + update stock + release locks
    const { data: orderResult, error: rpcErr } = await supabaseAdmin.rpc('create_order_atomic', {
      p_customer_id:      user.id,
      p_event_id:         eventId,
      p_session_id:       sessionId,
      p_coupon_id:        couponId ?? null,
      p_payment_provider: isFree ? 'courtesy' : 'paypal',
      p_payment_reference: paymentReference,
    });

    if (rpcErr) {
      console.error('create_order_atomic error:', rpcErr);
      // If payment was captured but DB failed → log for manual reconciliation
      if (!isFree) {
        console.error(`CRITICAL: PayPal capture ${paymentReference} succeeded but DB order failed. Needs manual refund.`);
      }
      return new Response(
        JSON.stringify({ error: rpcErr.message || 'Error al crear la orden en base de datos.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ order: orderResult }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('create-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
