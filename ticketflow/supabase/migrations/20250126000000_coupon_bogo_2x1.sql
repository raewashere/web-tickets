-- =============================================================================
-- TicketFlow — Migration 026: 2x1 (BOGO) offers
-- 20250126000000_coupon_bogo_2x1.sql
-- =============================================================================
-- Adds the 'bogo' coupon type ("2x1"). For every 2 tickets of the SAME ticket
-- type in the cart, 1 is free:  discount = FLOOR(quantity / 2) * price, summed
-- per ticket type. Respects the optional ticket_sku restriction (migration 011).
--
-- create_order_atomic delegates totals to calculate_checkout_quote(), so only
-- the quote function needs to change.
-- =============================================================================

-- NOTE: ALTER TYPE ... ADD VALUE cannot be used in the same transaction in which
-- the new value is referenced as a literal; the function below only compares
-- via ::text so it is safe in a single migration.
ALTER TYPE coupon_type ADD VALUE IF NOT EXISTS 'bogo';


CREATE OR REPLACE FUNCTION calculate_checkout_quote(
  p_session_id TEXT,
  p_event_id   UUID,
  p_coupon_id  UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_rate   NUMERIC := 0.20;
  v_subtotal          NUMERIC := 0;
  v_eligible_subtotal NUMERIC := 0;
  v_discount          NUMERIC := 0;
  v_total             NUMERIC := 0;
  v_commission        NUMERIC := 0;
  v_coupon            RECORD;
  v_applied_coupon_id UUID    := NULL;
  v_has_sku           BOOLEAN := false;
BEGIN
  IF p_session_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'session_id and event_id are required'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ticket_locks
    WHERE session_id = p_session_id AND locked_until > now()
  ) THEN
    RAISE EXCEPTION 'No active ticket reservations for session %', p_session_id
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id
      AND tl.locked_until > now()
      AND tt.event_id IS DISTINCT FROM p_event_id
  ) THEN
    RAISE EXCEPTION 'Ticket reservations do not belong to event %', p_event_id
      USING ERRCODE = 'P0003';
  END IF;

  SELECT (value::text)::numeric INTO v_commission_rate
  FROM platform_settings WHERE key = 'commission_rate';
  IF v_commission_rate IS NULL THEN v_commission_rate := 0.20; END IF;

  SELECT COALESCE(SUM(tl.quantity * tt.price), 0)
  INTO v_subtotal
  FROM ticket_locks tl
  JOIN ticket_types tt ON tt.id = tl.ticket_type_id
  WHERE tl.session_id = p_session_id AND tl.locked_until > now();

  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE id = p_coupon_id AND is_active = true
      AND (valid_from  IS NULL OR valid_from  <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses    IS NULL OR uses_count  <  max_uses)
      AND (event_id    IS NULL OR event_id    =  p_event_id);

    IF FOUND THEN
      v_has_sku := v_coupon.ticket_sku IS NOT NULL AND TRIM(v_coupon.ticket_sku) <> '';

      IF v_has_sku THEN
        SELECT COALESCE(SUM(tl.quantity * tt.price), 0)
        INTO v_eligible_subtotal
        FROM ticket_locks tl
        JOIN ticket_types tt ON tt.id = tl.ticket_type_id
        WHERE tl.session_id = p_session_id
          AND tl.locked_until > now()
          AND UPPER(TRIM(tt.sku)) = UPPER(TRIM(v_coupon.ticket_sku));
      ELSE
        v_eligible_subtotal := v_subtotal;
      END IF;

      IF v_eligible_subtotal > 0 THEN
        IF v_coupon.type::text = 'courtesy' THEN
          v_discount := v_eligible_subtotal;
        ELSIF v_coupon.type::text = 'percentage' THEN
          v_discount := ROUND(v_eligible_subtotal * (v_coupon.value / 100.0), 2);
        ELSIF v_coupon.type::text = 'fixed' THEN
          v_discount := LEAST(v_eligible_subtotal, v_coupon.value);
        ELSIF v_coupon.type::text = 'bogo' THEN
          -- 2x1: one free ticket per pair of the same ticket type
          SELECT COALESCE(SUM(FLOOR(q.qty / 2.0) * q.price), 0)
          INTO v_discount
          FROM (
            SELECT tt.id, tt.price, SUM(tl.quantity) AS qty
            FROM ticket_locks tl
            JOIN ticket_types tt ON tt.id = tl.ticket_type_id
            WHERE tl.session_id = p_session_id
              AND tl.locked_until > now()
              AND (NOT v_has_sku OR UPPER(TRIM(tt.sku)) = UPPER(TRIM(v_coupon.ticket_sku)))
            GROUP BY tt.id, tt.price
          ) q;
        END IF;

        -- Only mark the coupon as applied when it actually discounts something
        IF v_discount > 0 OR v_coupon.type::text <> 'bogo' THEN
          v_applied_coupon_id := v_coupon.id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Commission is retained from the total, NOT added (migration 020 model)
  v_total      := GREATEST(0, v_subtotal - v_discount);
  v_commission := GREATEST(0, ROUND(v_total * v_commission_rate, 2));

  RETURN jsonb_build_object(
    'subtotal',        v_subtotal,
    'discount',        v_discount,
    'total',           v_total,
    'commission',      v_commission,
    'commission_rate', v_commission_rate,
    'coupon_id',       v_applied_coupon_id,
    'currency',        'MXN'
  );
END;
$$;

REVOKE ALL ON FUNCTION calculate_checkout_quote(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_checkout_quote(TEXT, UUID, UUID) TO service_role;
