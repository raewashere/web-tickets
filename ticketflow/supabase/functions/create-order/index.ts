// supabase/functions/create-order/index.ts
// Edge Function: Server-side atomic order creation after PayPal payment capture.
//
// Supports BOTH authenticated users and guests (guestEmail + guestName in body).
//
// Flow:
//   1. Client sends { paypalOrderId?, sessionId, eventId, couponId?,
//                     guestEmail?, guestName? }   (client `isFree` is ignored)
//   2. We resolve caller: authenticated user (JWT) OR guest fields
//   3. Server-side quote via calculate_checkout_quote() (total, coupon, SKU)
//   4. If total > 0: verify PayPal order (APPROVED, custom_id = sessionId,
//      amount = total), capture it, and verify the captured amount
//   5. We call create_order_atomic(p_expected_total) — atomic DB transaction;
//      on failure the PayPal capture is auto-refunded
//   6. Dispatch N8N webhook with ticket data for email delivery
//   7. Return created order + public ticketUrl
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

interface PayPalAmount {
  currency_code: string;
  value: string;
}

interface PayPalCapture {
  id: string;
  status: string;
  amount: PayPalAmount;
}

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    amount?: PayPalAmount;
    payments?: { captures?: PayPalCapture[] };
  }>;
}

async function getPayPalOrder(
  baseUrl: string,
  accessToken: string,
  paypalOrderId: string,
): Promise<PayPalOrder> {
  const res = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`PayPal order lookup error: ${await res.text()}`);
  return await res.json();
}

async function capturePayPalOrder(
  baseUrl: string,
  accessToken: string,
  paypalOrderId: string,
): Promise<PayPalOrder> {
  const res = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PayPal capture error: ${await res.text()}`);
  return await res.json();
}

async function refundPayPalCapture(
  baseUrl: string,
  accessToken: string,
  captureId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `refund-${captureId}`,
      },
      body: '{}',
    });
    if (!res.ok) {
      console.error(`CRITICAL: PayPal auto-refund failed for capture ${captureId}: ${await res.text()}`);
      return false;
    }
    console.log(`PayPal capture ${captureId} auto-refunded.`);
    return true;
  } catch (err) {
    console.error(`CRITICAL: PayPal auto-refund error for capture ${captureId}:`, err);
    return false;
  }
}

function amountsMatch(paypalValue: string | undefined, expected: number): boolean {
  if (paypalValue === undefined) return false;
  return Math.abs(Number(paypalValue) - expected) < 0.01;
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
    // `isFree` from the client is IGNORED — the server decides based on the
    // computed total (0 → courtesy, > 0 → PayPal capture required).
    // -------------------------------------------------------------------------
    const body = await req.json() as {
      paypalOrderId?: string;
      sessionId:      string;
      eventId:        string;
      couponId?:      string | null;
      guestEmail?:    string;     // Required for guests
      guestName?:     string;
    };

    const { paypalOrderId, sessionId, eventId, couponId, guestEmail, guestName } = body;

    const jsonResponse = (payload: unknown, status: number) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });

    // Must have a logged-in user OR guest email
    if (!user && (!guestEmail || guestEmail.trim() === '')) {
      return jsonResponse({ error: 'Se requiere autenticación o correo electrónico de invitado.' }, 401);
    }

    if (!sessionId || !eventId) {
      return jsonResponse({ error: 'Payload inválido.' }, 400);
    }

    // -------------------------------------------------------------------------
    // 3. Server-side quote (validates locks ↔ event, coupon, SKU restriction)
    // -------------------------------------------------------------------------
    const { data: quote, error: quoteErr } = await supabaseAdmin.rpc('calculate_checkout_quote', {
      p_session_id: sessionId,
      p_event_id:   eventId,
      p_coupon_id:  couponId ?? null,
    });

    if (quoteErr || !quote) {
      console.warn('calculate_checkout_quote error:', quoteErr);
      return jsonResponse({ error: 'Las reservas han expirado o no son válidas. Por favor reinicia el proceso de compra.' }, 409);
    }

    const expectedTotal = Number((quote as { total: number }).total);
    const isFree = expectedTotal === 0;

    // -------------------------------------------------------------------------
    // 4. Verify + capture PayPal payment (only when the computed total > 0)
    // -------------------------------------------------------------------------
    let paymentReference = `FREE-${crypto.randomUUID()}`;
    let captureId: string | null = null;
    let paypalBase = '';
    let ppAccessToken = '';

    if (!isFree) {
      if (!paypalOrderId) {
        return jsonResponse({ error: 'Esta orden requiere pago.' }, 402);
      }

      const clientId     = Deno.env.get('PAYPAL_CLIENT_ID');
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
      const mode         = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

      if (!clientId || !clientSecret) {
        return jsonResponse({ error: 'Pasarela de pago no configurada.' }, 503);
      }

      paypalBase = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);

      // 4a. Verify BEFORE capturing: approved, bound to this session, right amount
      const ppOrder = await getPayPalOrder(paypalBase, ppAccessToken, paypalOrderId);
      const unit = ppOrder.purchase_units?.[0];

      if (ppOrder.status !== 'APPROVED') {
        return jsonResponse({ error: `Pago PayPal no aprobado: ${ppOrder.status}` }, 402);
      }
      if (unit?.custom_id !== sessionId) {
        console.warn(`PayPal order ${paypalOrderId} custom_id mismatch for session ${sessionId}`);
        return jsonResponse({ error: 'La orden de pago no corresponde a esta compra.' }, 400);
      }
      if (unit?.amount?.currency_code !== 'MXN' || !amountsMatch(unit?.amount?.value, expectedTotal)) {
        console.warn(`PayPal amount mismatch: ${unit?.amount?.value} ${unit?.amount?.currency_code} vs ${expectedTotal} MXN`);
        return jsonResponse({ error: 'El monto del pago no coincide con el total de la orden. Por favor reinicia el pago.' }, 409);
      }

      // 4b. Capture and verify the captured amount
      const captureResult = await capturePayPalOrder(paypalBase, ppAccessToken, paypalOrderId);
      const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
      captureId = capture?.id ?? null;

      if (captureResult.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
        return jsonResponse({ error: `Pago PayPal no completado: ${captureResult.status}` }, 402);
      }

      if (capture.amount?.currency_code !== 'MXN' || !amountsMatch(capture.amount?.value, expectedTotal)) {
        console.error(`CRITICAL: captured amount ${capture.amount?.value} differs from expected ${expectedTotal}`);
        const refunded = await refundPayPalCapture(paypalBase, ppAccessToken, capture.id);
        return jsonResponse({
          error: refunded
            ? 'El monto cobrado no coincide con la orden. El pago fue reembolsado automáticamente.'
            : 'El monto cobrado no coincide con la orden. Contacta a soporte para tu reembolso.',
        }, 409);
      }

      paymentReference = captureResult.id;
    }

    // -------------------------------------------------------------------------
    // 5. Call atomic DB function — re-validates total against amount charged
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
      p_expected_total:    expectedTotal,
    });

    if (rpcErr) {
      console.error('create_order_atomic error:', rpcErr);
      let refunded = false;
      if (captureId) {
        refunded = await refundPayPalCapture(paypalBase, ppAccessToken, captureId);
        if (!refunded) {
          console.error(`CRITICAL: PayPal capture ${captureId} (order ${paymentReference}) succeeded but DB order failed and auto-refund failed. Needs manual refund.`);
        }
      }
      return jsonResponse({
        error: captureId
          ? (refunded
              ? 'No se pudo completar la orden. Tu pago fue reembolsado automáticamente.'
              : 'No se pudo completar la orden. Contacta a soporte para tu reembolso.')
          : 'No se pudo completar la orden.',
      }, 500);
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

    // 6a. Primary transactional email channel: Resend via send-ticket-email (for BOTH guests and authenticated users)
    if (order.id) {
      try {
        await supabaseAdmin.functions.invoke('send-ticket-email', {
          body: {
            orderId:     order.id,
            accessToken: order.access_token,
          },
        });
      } catch (emailErr) {
        console.warn('send-ticket-email invocation warning:', emailErr);
      }
    }

    // 6b. Optional secondary integration: N8N webhook (only fires if N8N_TICKET_WEBHOOK_URL is configured)
    const n8nDispatch = dispatchN8NTicketWebhook({
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

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(n8nDispatch);
    } else {
      await n8nDispatch;
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
