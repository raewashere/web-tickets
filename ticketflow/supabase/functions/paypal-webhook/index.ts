// supabase/functions/paypal-webhook/index.ts
// Edge Function: Asynchronous PayPal Webhook Listener & Payment Reconciliation
//
// Handles PayPal webhook events:
//   - PAYMENT.CAPTURE.COMPLETED
//   - PAYMENT.CAPTURE.DENIED
//   - PAYMENT.CAPTURE.REFUNDED
//   - PAYMENT.CAPTURE.REVERSED
//   - CHECKOUT.ORDER.APPROVED
//
// Security & Reliability:
//   1. Verifies webhook signature via PayPal `/v1/notifications/verify-webhook-signature`
//      when PAYPAL_WEBHOOK_ID is configured AND/OR verifies the capture/order state
//      directly against PayPal REST API (`/v2/payments/captures/{id}`) using server
//      credentials (defense-in-depth against spoofed webhooks).
//   2. Logs every event idempotently in `public.paypal_webhook_events`.
//   3. On `PAYMENT.CAPTURE.COMPLETED`:
//      - If the order already exists in `public.orders`, marks the intent as `completed`.
//      - If the order does NOT exist (e.g., buyer closed browser before `create-order`
//        finished), looks up `public.paypal_payment_intents`:
//          a) Attempts to recover and create the order via `create_order_atomic`
//             and dispatches the QR ticket email via `send-ticket-email`.
//          b) If locks already expired or stock is unavailable, automatically refunds
//             the capture via PayPal Refund API and records `auto_refunded` (or
//             `needs_manual_refund` if the refund API fails).
//
// Environment variables required:
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE ("sandbox" | "live")
//   PAYPAL_WEBHOOK_ID (optional but recommended: Webhook ID from PayPal Developer Dashboard)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PayPalWebhookPayload {
  id: string;
  event_type: string;
  create_time?: string;
  resource_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    purchase_units?: Array<{
      custom_id?: string;
      amount?: {
        currency_code?: string;
        value?: string;
      };
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { currency_code?: string; value?: string };
        }>;
      };
    }>;
  };
}

async function getPayPalAccessToken(
  baseUrl: string,
  clientId: string,
  secret: string,
): Promise<string> {
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
    throw new Error(`PayPal token error: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function verifyPayPalWebhookSignature(
  req: Request,
  baseUrl: string,
  accessToken: string,
  webhookId: string,
  rawEvent: unknown,
): Promise<boolean> {
  const authAlgo         = req.headers.get('paypal-auth-algo');
  const certUrl          = req.headers.get('paypal-cert-url');
  const transmissionId   = req.headers.get('paypal-transmission-id');
  const transmissionSig  = req.headers.get('paypal-transmission-sig');
  const transmissionTime = req.headers.get('paypal-transmission-time');

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo:         authAlgo,
        cert_url:          certUrl,
        transmission_id:   transmissionId,
        transmission_sig:  transmissionSig,
        transmission_time: transmissionTime,
        webhook_id:        webhookId,
        webhook_event:     rawEvent,
      }),
    });

    if (!res.ok) {
      console.warn('PayPal verify-webhook-signature non-OK:', await res.text());
      return false;
    }

    const data = await res.json();
    return data.verification_status === 'SUCCESS';
  } catch (err) {
    console.warn('PayPal verify-webhook-signature error:', err);
    return false;
  }
}

async function fetchVerifiedCapture(
  baseUrl: string,
  accessToken: string,
  captureId: string,
): Promise<{
  id: string;
  status: string;
  custom_id?: string;
  amount?: { currency_code?: string; value?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
} | null> {
  const res = await fetch(
    `${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    console.warn(`Could not verify capture ${captureId} via PayPal API: ${res.status}`);
    return null;
  }
  return await res.json();
}

async function refundPayPalCapture(
  baseUrl: string,
  accessToken: string,
  captureId: string,
  reasonNote: string,
): Promise<{ ok: boolean; refundId: string | null }> {
  try {
    const res = await fetch(
      `${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `webhook-auto-refund-${captureId}`,
        },
        body: JSON.stringify({
          note_to_payer: reasonNote.slice(0, 255),
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes('CAPTURE_FULLY_REFUNDED')) {
        return { ok: true, refundId: captureId };
      }
      console.error(`PayPal webhook auto-refund failed for ${captureId}: ${errText}`);
      return { ok: false, refundId: null };
    }

    const data = await res.json();
    return { ok: true, refundId: (data.id as string) ?? captureId };
  } catch (err) {
    console.error(`PayPal webhook auto-refund exception for ${captureId}:`, err);
    return { ok: false, refundId: null };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const clientId     = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const mode         = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';
    const webhookId    = Deno.env.get('PAYPAL_WEBHOOK_ID') ?? '';

    if (!clientId || !clientSecret) {
      return jsonResponse({ error: 'PayPal credentials not configured' }, 503);
    }

    const paypalBase =
      mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload = (await req.json()) as PayPalWebhookPayload;
    if (!payload?.id || !payload?.event_type) {
      return jsonResponse({ error: 'Invalid PayPal webhook payload' }, 400);
    }

    // 1. Check idempotency in paypal_webhook_events
    const { data: existingEvent } = await supabaseAdmin
      .from('paypal_webhook_events')
      .select('id, processing_status, order_id')
      .eq('paypal_event_id', payload.id)
      .maybeSingle();

    if (
      existingEvent &&
      ['reconciled', 'recovered_order_created', 'auto_refunded', 'ignored'].includes(
        existingEvent.processing_status,
      )
    ) {
      return jsonResponse({
        received: true,
        idempotent: true,
        status: existingEvent.processing_status,
        orderId: existingEvent.order_id,
      });
    }

    // 2. Authenticate with PayPal API and verify webhook signature (if PAYPAL_WEBHOOK_ID is set)
    const ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);

    let signatureVerified = false;
    if (webhookId) {
      signatureVerified = await verifyPayPalWebhookSignature(
        req,
        paypalBase,
        ppAccessToken,
        webhookId,
        payload,
      );
      if (!signatureVerified) {
        console.warn(`PayPal webhook signature verification failed for event ${payload.id}`);
        return jsonResponse({ error: 'Invalid PayPal webhook signature' }, 401);
      }
    }

    const eventType = payload.event_type;
    const resource  = payload.resource ?? {};

    // Extract order and capture IDs depending on event type
    let paypalOrderId: string | null =
      resource.supplementary_data?.related_ids?.order_id ?? null;
    let captureId: string | null = null;
    let amountValue: number | null = resource.amount?.value
      ? Number(resource.amount.value)
      : null;
    let currencyCode: string | null = resource.amount?.currency_code ?? 'MXN';

    if (eventType.startsWith('PAYMENT.CAPTURE.')) {
      captureId = resource.id ?? null;
    } else if (eventType.startsWith('CHECKOUT.ORDER.')) {
      paypalOrderId = resource.id ?? null;
      const unit = resource.purchase_units?.[0];
      if (unit?.amount?.value) {
        amountValue = Number(unit.amount.value);
        currencyCode = unit.amount.currency_code ?? 'MXN';
      }
      const firstCapture = unit?.payments?.captures?.[0];
      if (firstCapture?.id) {
        captureId = firstCapture.id;
      }
    }

    // Upsert initial webhook log
    await supabaseAdmin.from('paypal_webhook_events').upsert(
      {
        paypal_event_id:    payload.id,
        event_type:         eventType,
        paypal_order_id:    paypalOrderId,
        paypal_capture_id:  captureId,
        resource_status:    resource.status ?? null,
        amount:             amountValue,
        currency:           currencyCode,
        signature_verified: signatureVerified,
        processing_status:  'received',
        raw_payload:        payload,
      },
      { onConflict: 'paypal_event_id' },
    );

    const finishWebhook = async (
      status:
        | 'reconciled'
        | 'recovered_order_created'
        | 'auto_refunded'
        | 'needs_manual_refund'
        | 'ignored'
        | 'failed',
      notes: string,
      orderId: string | null = null,
    ) => {
      await supabaseAdmin
        .from('paypal_webhook_events')
        .update({
          paypal_order_id:   paypalOrderId,
          paypal_capture_id: captureId,
          processing_status: status,
          processing_notes:  notes,
          order_id:          orderId,
          processed_at:      new Date().toISOString(),
        })
        .eq('paypal_event_id', payload.id);

      return jsonResponse({
        received: true,
        eventType,
        status,
        notes,
        orderId,
      });
    };

    // -------------------------------------------------------------------------
    // Case 1: CHECKOUT.ORDER.APPROVED
    // -------------------------------------------------------------------------
    if (eventType === 'CHECKOUT.ORDER.APPROVED' && paypalOrderId) {
      await supabaseAdmin
        .from('paypal_payment_intents')
        .update({
          status:     'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('paypal_order_id', paypalOrderId)
        .eq('status', 'created');

      return await finishWebhook(
        'reconciled',
        `Order ${paypalOrderId} marked as approved.`,
      );
    }

    // -------------------------------------------------------------------------
    // Case 2: PAYMENT.CAPTURE.COMPLETED
    // -------------------------------------------------------------------------
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && captureId) {
      // Defense-in-depth: always verify capture directly against PayPal REST API
      const verifiedCapture = await fetchVerifiedCapture(
        paypalBase,
        ppAccessToken,
        captureId,
      );

      if (!verifiedCapture || verifiedCapture.status !== 'COMPLETED') {
        return await finishWebhook(
          'failed',
          `Capture ${captureId} could not be verified as COMPLETED with PayPal API.`,
        );
      }

      if (!paypalOrderId) {
        paypalOrderId =
          verifiedCapture.supplementary_data?.related_ids?.order_id ?? null;
      }

      const verifiedAmount = verifiedCapture.amount?.value
        ? Number(verifiedCapture.amount.value)
        : amountValue;

      // 2a. Check if order already exists in `public.orders`
      let existingOrder: { id: string; status: string } | null = null;

      if (paypalOrderId) {
        const { data: ordByOrderId } = await supabaseAdmin
          .from('orders')
          .select('id, status')
          .eq('payment_provider', 'paypal')
          .eq('payment_reference', paypalOrderId)
          .maybeSingle();
        existingOrder = ordByOrderId;
      }

      if (!existingOrder) {
        const { data: ordByCaptureId } = await supabaseAdmin
          .from('orders')
          .select('id, status')
          .eq('payment_provider', 'paypal')
          .eq('payment_reference', captureId)
          .maybeSingle();
        existingOrder = ordByCaptureId;
      }

      if (existingOrder) {
        if (paypalOrderId) {
          await supabaseAdmin
            .from('paypal_payment_intents')
            .update({
              paypal_capture_id: captureId,
              captured_amount:   verifiedAmount,
              order_id:          existingOrder.id,
              status:            'completed',
              updated_at:        new Date().toISOString(),
            })
            .eq('paypal_order_id', paypalOrderId);
        }

        return await finishWebhook(
          'reconciled',
          `Capture ${captureId} matches existing order ${existingOrder.id}.`,
          existingOrder.id,
        );
      }

      // 2b. No order in `public.orders` yet! Look up payment intent to recover
      //     (Wait 2.5 seconds first in case synchronous `create-order` is currently in-flight)
      await new Promise((r) => setTimeout(r, 2500));

      if (paypalOrderId) {
        const { data: recheckOrder } = await supabaseAdmin
          .from('orders')
          .select('id, status')
          .eq('payment_provider', 'paypal')
          .eq('payment_reference', paypalOrderId)
          .maybeSingle();

        if (recheckOrder) {
          await supabaseAdmin
            .from('paypal_payment_intents')
            .update({
              paypal_capture_id: captureId,
              captured_amount:   verifiedAmount,
              order_id:          recheckOrder.id,
              status:            'completed',
              updated_at:        new Date().toISOString(),
            })
            .eq('paypal_order_id', paypalOrderId);

          return await finishWebhook(
            'reconciled',
            `Capture ${captureId} reconciled after in-flight create-order completed (${recheckOrder.id}).`,
            recheckOrder.id,
          );
        }
      }

      const { data: intent } = paypalOrderId
        ? await supabaseAdmin
            .from('paypal_payment_intents')
            .select('*')
            .eq('paypal_order_id', paypalOrderId)
            .maybeSingle()
        : { data: null };

      if (intent) {
        // Attempt to create the order atomically using the stored session and intent metadata
        const { data: recoveredOrder, error: rpcErr } = await supabaseAdmin.rpc(
          'create_order_atomic',
          {
            p_customer_id:       intent.customer_id ?? null,
            p_event_id:          intent.event_id,
            p_session_id:        intent.session_id,
            p_coupon_id:         intent.coupon_id ?? null,
            p_payment_provider:  'paypal',
            p_payment_reference: paypalOrderId ?? captureId,
            p_guest_email:       intent.guest_email ?? null,
            p_guest_name:        intent.guest_name ?? null,
            p_expected_total:    verifiedAmount ?? Number(intent.expected_total),
          },
        );

        if (!rpcErr && recoveredOrder) {
          const ord = recoveredOrder as { id: string; access_token: string };

          await supabaseAdmin
            .from('paypal_payment_intents')
            .update({
              paypal_capture_id: captureId,
              captured_amount:   verifiedAmount,
              order_id:          ord.id,
              status:            'recovered_by_webhook',
              error_message:     null,
              updated_at:        new Date().toISOString(),
            })
            .eq('id', intent.id);

          // Send transactional QR ticket email via Resend
          try {
            await supabaseAdmin.functions.invoke('send-ticket-email', {
              body: {
                orderId:     ord.id,
                accessToken: ord.access_token,
              },
            });
          } catch (emailErr) {
            console.warn('Webhook send-ticket-email warning:', emailErr);
          }

          return await finishWebhook(
            'recovered_order_created',
            `Orphaned capture ${captureId} recovered automatically into order ${ord.id}.`,
            ord.id,
          );
        }

        // Order recovery failed (e.g., locks expired) → Auto-refund the buyer!
        const errMessage = rpcErr?.message ?? 'Could not create order from webhook';
        const refundResult = await refundPayPalCapture(
          paypalBase,
          ppAccessToken,
          captureId,
          'Reembolso automático BoletoCoqueto: tiempo de reserva expirado antes de confirmar la orden.',
        );

        const newIntentStatus = refundResult.ok
          ? 'auto_refunded'
          : 'needs_manual_refund';

        await supabaseAdmin
          .from('paypal_payment_intents')
          .update({
            paypal_capture_id: captureId,
            paypal_refund_id:  refundResult.refundId,
            captured_amount:   verifiedAmount,
            status:            newIntentStatus,
            error_message:     errMessage,
            updated_at:        new Date().toISOString(),
          })
          .eq('id', intent.id);

        return await finishWebhook(
          newIntentStatus,
          `Order recovery failed (${errMessage}). Auto-refund ${refundResult.ok ? 'succeeded' : 'FAILED'}.`,
        );
      }

      // No matching intent row found — auto-refund orphaned capture to protect buyer
      const refundResult = await refundPayPalCapture(
        paypalBase,
        ppAccessToken,
        captureId,
        'Reembolso automático BoletoCoqueto: orden no encontrada en el sistema.',
      );

      return await finishWebhook(
        refundResult.ok ? 'auto_refunded' : 'needs_manual_refund',
        `Orphaned capture ${captureId} (order ${paypalOrderId ?? 'unknown'}) had no intent record. Auto-refund ${
          refundResult.ok ? 'succeeded' : 'FAILED'
        }.`,
      );
    }

    // -------------------------------------------------------------------------
    // Case 3: PAYMENT.CAPTURE.REFUNDED / REVERSED / DENIED
    // -------------------------------------------------------------------------
    if (
      eventType === 'PAYMENT.CAPTURE.REFUNDED' ||
      eventType === 'PAYMENT.CAPTURE.REVERSED' ||
      eventType === 'PAYMENT.CAPTURE.DENIED'
    ) {
      const targetStatus =
        eventType === 'PAYMENT.CAPTURE.DENIED' ? 'denied' : 'refunded_externally';

      if (paypalOrderId) {
        await supabaseAdmin
          .from('paypal_payment_intents')
          .update({
            status:     targetStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('paypal_order_id', paypalOrderId)
          .not('status', 'in', '("auto_refunded","completed")');
      }

      return await finishWebhook(
        'reconciled',
        `Processed ${eventType} for order ${paypalOrderId ?? 'unknown'}.`,
      );
    }

    return await finishWebhook('ignored', `Unhandled event type: ${eventType}`);
  } catch (err) {
    console.error('paypal-webhook error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Internal webhook error' },
      500,
    );
  }
});
