// supabase/functions/create-order/index.ts
// Edge Function: Server-side atomic order creation after PayPal payment capture.
//
// Supports BOTH authenticated users and guests (guestEmail + guestName in body).
//
// Flow:
//   1. Client sends { paypalOrderId, sessionId, eventId, couponId?,
//                     guestEmail?, guestName? }
//   2. We resolve caller: authenticated user (JWT) OR guest fields
//   3. We capture the PayPal payment
//   4. We call create_order_atomic() — atomic DB transaction
//   5. [PLACEHOLDER] Dispatch N8N webhook with ticket data for email delivery
//   6. Return created order + public ticketUrl
//
// Environment variables required:
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE
//   STORE_BASE_URL          – e.g. https://tu-dominio.com
//   N8N_TICKET_WEBHOOK_URL  – (placeholder) set when N8N workflow is ready

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
// N8N webhook dispatcher (PLACEHOLDER)
// Activates automatically when N8N_TICKET_WEBHOOK_URL env var is set.
// Until then, logs the payload and exits silently — order creation is unaffected.
// ---------------------------------------------------------------------------

async function dispatchN8NTicketWebhook(payload: {
  orderId:        string;
  accessToken:    string;
  recipientEmail: string;
  recipientName:  string;
  eventId:        string;
  eventName?:     string;
  eventDate?:     string | null;
  venueName?:     string;
  subtotal?:      number;
  discount?:      number;
  total?:         number;
  items?:         Array<{ quantity: number; unit_price: number; total: number; name?: string }>;
  ticketUrl:      string;
  qrImageUrl:     string;
}): Promise<void> {
  const n8nUrl = Deno.env.get('N8N_TICKET_WEBHOOK_URL');

  if (!n8nUrl) {
    console.log('[N8N DISPATCHER] N8N_TICKET_WEBHOOK_URL not set — skipping ticket email webhook.');
    console.log('[N8N DISPATCHER] Payload ready:', JSON.stringify(payload));
    return;
  }

  try {
    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[N8N] Webhook call failed: ${res.status} ${await res.text()}`);
    } else {
      console.log(`[N8N] Ticket webhook dispatched for order ${payload.orderId}`);
    }
  } catch (err) {
    // Non-blocking — order was created successfully, email is best-effort
    console.warn('[N8N] Webhook dispatch error (non-blocking):', err);
  }
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
    // 2. Parse body
    // -------------------------------------------------------------------------
    const body = await req.json() as {
      paypalOrderId:  string;
      sessionId:      string;
      eventId:        string;
      couponId?:      string | null;
      isFree?:        boolean;    // true for courtesy orders (no PayPal capture)
      guestEmail?:    string;     // Required for guests
      guestName?:     string;
    };

    const { paypalOrderId, sessionId, eventId, couponId, isFree, guestEmail, guestName } = body;

    // Must have a logged-in user OR guest email
    if (!user && (!guestEmail || guestEmail.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'Se requiere autenticación o correo electrónico de invitado.' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!sessionId || !eventId || (!paypalOrderId && !isFree)) {
      return new Response(
        JSON.stringify({ error: 'Payload inválido.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // -------------------------------------------------------------------------
    // 3. Verify locks still valid
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // 4. Capture PayPal payment (skip for free/courtesy orders)
    // -------------------------------------------------------------------------
    let paymentReference = `FREE-${crypto.randomUUID()}`;

    if (!isFree) {
      const clientId     = Deno.env.get('PAYPAL_CLIENT_ID');
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
      const mode         = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Pasarela de pago no configurada.' }),
          { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      const paypalBase = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);
      const captureResult = await capturePayPalOrder(paypalBase, ppAccessToken, paypalOrderId);

      if (captureResult.status !== 'COMPLETED') {
        return new Response(
          JSON.stringify({ error: `Pago PayPal no completado: ${captureResult.status}` }),
          { status: 402, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      paymentReference = captureResult.id;
    }

    // -------------------------------------------------------------------------
    // 5. Call atomic DB function — create order + items + update stock + release locks
    // -------------------------------------------------------------------------
    const { data: orderResult, error: rpcErr } = await supabaseAdmin.rpc('create_order_atomic', {
      p_customer_id:       user?.id ?? null,
      p_event_id:          eventId,
      p_session_id:        sessionId,
      p_coupon_id:         couponId ?? null,
      p_payment_provider:  isFree ? 'courtesy' : 'paypal',
      p_payment_reference: paymentReference,
      p_guest_email:       guestEmail ?? null,
      p_guest_name:        guestName  ?? null,
    });

    if (rpcErr) {
      console.error('create_order_atomic error:', rpcErr);
      if (!isFree) {
        console.error(`CRITICAL: PayPal capture ${paymentReference} succeeded but DB order failed. Needs manual refund.`);
      }
      return new Response(
        JSON.stringify({ error: rpcErr.message || 'Error al crear la orden.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // -------------------------------------------------------------------------
    // 6. Dispatch N8N ticket webhook (fire-and-forget — non-blocking)
    //    • Guests:        PRIMARY ticket delivery via email
    //    • Auth users:    supplemental notification (send-ticket-email is also called)
    // -------------------------------------------------------------------------
    const order = orderResult as {
      id:            string;
      access_token:  string;
      guest_email?:  string;
      guest_name?:   string;
    };

    const recipientEmail = user?.email ?? guestEmail ?? '';
    const recipientName  = guestName ?? user?.email ?? 'Cliente';
    const storeBaseUrl   = Deno.env.get('STORE_BASE_URL') ?? 'https://tu-dominio.com';
    const ticketUrl      = `${storeBaseUrl}/ticket/${order.id}?token=${order.access_token}`;
    const qrImageUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TICKETFLOW-AUTH-${order.id}`;

    // Query full order details for rich webhook payload
    const { data: fullOrder } = await supabaseAdmin
      .from('orders')
      .select('*, events(name, event_date, venues(name)), order_items(quantity, unit_price, total, ticket_types(name))')
      .eq('id', order.id)
      .maybeSingle();

    const itemsFormatted = (fullOrder?.order_items || []).map((item: any) => ({
      quantity:   item.quantity,
      unit_price: item.unit_price,
      total:      item.total,
      name:       item.ticket_types?.name ?? 'Localidad',
    }));

    // Non-blocking dispatch — does not delay the HTTP response
    dispatchN8NTicketWebhook({
      orderId:        order.id,
      accessToken:    order.access_token,
      recipientEmail,
      recipientName,
      eventId,
      eventName:      fullOrder?.events?.name ?? 'Espectáculo en Vivo',
      eventDate:      fullOrder?.events?.event_date ?? null,
      venueName:      fullOrder?.events?.venues?.name ?? 'Recinto Confirmado',
      subtotal:       fullOrder?.subtotal ?? 0,
      discount:       fullOrder?.discount_amount ?? 0,
      total:          fullOrder?.total ?? 0,
      items:          itemsFormatted,
      ticketUrl,
      qrImageUrl,
    });

    // For authenticated users, also invoke the existing send-ticket-email function
    if (user && order.id) {
      try {
        await supabaseAdmin.functions.invoke('send-ticket-email', {
          body: { orderId: order.id, recipientEmail: user.email },
        });
      } catch (emailErr) {
        console.warn('send-ticket-email invocation warning:', emailErr);
      }
    }

    // -------------------------------------------------------------------------
    // 7. Return result
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        order: orderResult,
        ticketUrl,      // Always return the public ticket URL (works for guests + auth)
        isGuest: !user,
      }),
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
