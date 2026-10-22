// supabase/functions/process-refund/index.ts
// Edge Function: Super-Admin refund processor with automatic PayPal Refund API execution.
//
// Flow:
//   1. Authenticate caller JWT and verify Super-Admin role ('admin' in user_roles).
//   2. Fetch pending refund_request and its associated order.
//   3. If approved === true and order.payment_provider === 'paypal':
//      - Resolve PayPal capture ID from order.payment_reference (PayPal order ID)
//      - Execute full refund via PayPal v2 Captures Refund API (idempotent)
//   4. Invoke process_refund_request RPC to atomically update DB (refund_requests,
//      orders, ticket_validations, and restore ticket_types stock).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProcessRefundPayload {
  requestId: string;
  approved: boolean;
  adminNotes?: string | null;
}

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
    throw new Error(`PayPal auth error: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function resolvePayPalCapture(
  baseUrl: string,
  accessToken: string,
  paymentReference: string,
): Promise<{ captureId: string; alreadyRefunded: boolean }> {
  // payment_reference is stored as the PayPal Order ID in create-order.
  // Look up the order to extract purchase_units[0].payments.captures[0].
  const res = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paymentReference)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    const orderData = await res.json();
    const capture = orderData?.purchase_units?.[0]?.payments?.captures?.[0];
    if (capture?.id) {
      return {
        captureId: capture.id as string,
        alreadyRefunded: capture.status === 'REFUNDED',
      };
    }
  }

  // Fallback in case payment_reference is already a capture ID
  return { captureId: paymentReference, alreadyRefunded: false };
}

async function refundPayPalCapture(
  baseUrl: string,
  accessToken: string,
  captureId: string,
  requestId: string,
  noteToPayer?: string | null,
): Promise<{ refundId: string; status: string }> {
  const bodyPayload: Record<string, string> = {};
  if (noteToPayer && noteToPayer.trim().length > 0) {
    bodyPayload.note_to_payer = noteToPayer.trim().slice(0, 255);
  }

  const res = await fetch(`${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `refund-req-${requestId}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    // If PayPal reports CAPTURE_FULLY_REFUNDED, treat as idempotent success
    if (errText.includes('CAPTURE_FULLY_REFUNDED')) {
      return { refundId: captureId, status: 'COMPLETED' };
    }
    throw new Error(`PayPal refund error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return { refundId: data.id as string, status: data.status as string };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
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
    // 1. Verify caller JWT and Super-Admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'No autenticado.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authErr } = await supabaseAnon.auth.getUser();
    if (authErr || !caller) {
      return jsonResponse({ success: false, error: 'Sesión inválida o expirada.' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return jsonResponse(
        { success: false, error: 'Solo el Super-Admin de la plataforma puede aprobar o rechazar reembolsos.' },
        403,
      );
    }

    // 2. Parse payload and fetch refund request + order
    const body = (await req.json()) as ProcessRefundPayload;
    const { requestId, approved, adminNotes } = body;

    if (!requestId || typeof approved !== 'boolean') {
      return jsonResponse({ success: false, error: 'Parámetros inválidos (requestId, approved).' }, 400);
    }

    const { data: refundReq, error: reqErr } = await supabaseAdmin
      .from('refund_requests')
      .select('id, order_id, status, amount, orders(id, status, total, payment_provider, payment_reference)')
      .eq('id', requestId)
      .single();

    if (reqErr || !refundReq) {
      return jsonResponse({ success: false, error: 'Solicitud de reembolso no encontrada.' }, 404);
    }

    if (refundReq.status !== 'pending') {
      return jsonResponse({ success: false, error: 'Esta solicitud ya fue procesada previamente.' }, 409);
    }

    const order = refundReq.orders as unknown as {
      id: string;
      status: string;
      total: number;
      payment_provider: string | null;
      payment_reference: string | null;
    } | null;

    // 3. If approving a paid PayPal order, execute the refund in PayPal first
    let paypalRefundId: string | null = null;

    if (
      approved &&
      order &&
      order.payment_provider === 'paypal' &&
      order.payment_reference &&
      !order.payment_reference.startsWith('FREE-') &&
      Number(order.total) > 0
    ) {
      const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
      const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
      const mode = Deno.env.get('PAYPAL_MODE') ?? 'sandbox';

      if (!clientId || !clientSecret) {
        return jsonResponse(
          { success: false, error: 'Credenciales de PayPal no configuradas en el servidor para ejecutar el reembolso.' },
          503,
        );
      }

      const paypalBase = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const ppAccessToken = await getPayPalAccessToken(paypalBase, clientId, clientSecret);
      const { captureId, alreadyRefunded } = await resolvePayPalCapture(
        paypalBase,
        ppAccessToken,
        order.payment_reference,
      );

      if (!alreadyRefunded) {
        const ppRefund = await refundPayPalCapture(
          paypalBase,
          ppAccessToken,
          captureId,
          requestId,
          adminNotes,
        );
        if (ppRefund.status !== 'COMPLETED' && ppRefund.status !== 'PENDING') {
          return jsonResponse(
            { success: false, error: `PayPal devolvió estado inesperado en reembolso: ${ppRefund.status}` },
            502,
          );
        }
        paypalRefundId = ppRefund.refundId;
      } else {
        paypalRefundId = captureId;
      }
    }

    // 4. Commit atomic database state update via process_refund_request RPC
    const finalNotes = paypalRefundId
      ? `${adminNotes?.trim() || 'Reembolso aprobado'} [PayPal Refund ID: ${paypalRefundId}]`
      : (adminNotes?.trim() || null);

    const { data: rpcResult, error: rpcErr } = await supabaseAnon.rpc('process_refund_request', {
      p_request_id: requestId,
      p_approved: approved,
      p_admin_notes: finalNotes,
    });

    if (rpcErr) {
      console.error('process_refund_request RPC error:', rpcErr);
      return jsonResponse({ success: false, error: rpcErr.message }, 500);
    }

    return jsonResponse({
      ...(rpcResult as Record<string, unknown>),
      paypalRefundId,
    });
  } catch (err) {
    console.error('process-refund error:', err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : 'Error interno al procesar el reembolso.' },
      500,
    );
  }
});
