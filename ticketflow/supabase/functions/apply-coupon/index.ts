// supabase/functions/apply-coupon/index.ts
// Edge Function: Server-side coupon validation.
// Prevents client-side manipulation of discount amounts.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CouponRow {
  id: string;
  event_id: string | null;
  ticket_sku: string | null;
  code: string;
  type: 'courtesy' | 'percentage' | 'fixed';
  value: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface CartItemInput {
  sku: string;
  price: number;
  quantity: number;
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
    // 1. Resolve caller identity (optional auth for guest support)
    const authHeader = req.headers.get('Authorization');
    // Coupon validation uses admin client to verify validity regardless of auth status

    // 2. Parse body
    const body = await req.json() as {
      code: string;
      eventId: string;
      subtotal: number;
      items?: CartItemInput[];
    };
    const { code, eventId, subtotal, items } = body;

    if (!code || !eventId || subtotal === undefined || subtotal < 0) {
      return new Response(
        JSON.stringify({ error: 'Provide code, eventId, and subtotal.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const codeClean = code.trim().toUpperCase();

    // 3. Look up coupon (admin client bypasses RLS to always find the coupon)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: coupon, error: couponErr } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', codeClean)
      .eq('is_active', true)
      .maybeSingle<CouponRow>();

    if (couponErr || !coupon) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Cupón no existe o no está activo.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Validate scope (event-specific vs global)
    if (coupon.event_id && coupon.event_id !== eventId) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupón no es válido para este espectáculo.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 5. Validate dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupón aún no ha entrado en vigencia.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupón ha expirado.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 6. Validate uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupón ha alcanzado el límite máximo de canjes.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // 7. Validate SKU restriction & calculate discount server-side
    let eligibleSubtotal = subtotal;

    if (coupon.ticket_sku && coupon.ticket_sku.trim() !== '') {
      const targetSku = coupon.ticket_sku.trim().toUpperCase();
      if (items && Array.isArray(items) && items.length > 0) {
        const matchingItems = items.filter(
          (i) => (i.sku || '').trim().toUpperCase() === targetSku
        );

        if (matchingItems.length === 0) {
          return new Response(
            JSON.stringify({
              valid: false,
              message: `Este cupón solo es válido para boletos con SKU "${targetSku}".`,
            }),
            { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
          );
        }

        eligibleSubtotal = matchingItems.reduce(
          (sum, i) => sum + Number(i.price) * Number(i.quantity),
          0
        );
      }
    }

    let discountAmount = 0;
    if (coupon.type === 'courtesy') {
      discountAmount = eligibleSubtotal;
    } else if (coupon.type === 'percentage') {
      const pct = Number(coupon.value) || 0;
      discountAmount = Math.round(eligibleSubtotal * (pct / 100) * 100) / 100;
    } else if (coupon.type === 'fixed') {
      const flat = Number(coupon.value) || 0;
      discountAmount = Math.min(eligibleSubtotal, flat);
    }

    // 8. Return validated coupon + discount
    return new Response(
      JSON.stringify({
        valid:          true,
        couponId:       coupon.id,
        code:           coupon.code,
        type:           coupon.type,
        value:          coupon.value,
        ticketSku:      coupon.ticket_sku,
        discountAmount,
        message:        '¡Cupón aplicado exitosamente!',
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('apply-coupon error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
