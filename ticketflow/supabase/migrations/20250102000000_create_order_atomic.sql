-- =============================================================================
-- TicketFlow — Migration 002: create_order_atomic function
-- 20250102000000_create_order_atomic.sql
--
-- This function performs the full checkout finalization in a single atomic
-- transaction, called by the Edge Function `create-order`.
--
-- It:
--   1. Reads all ticket_locks for the given session_id
--   2. Reads the commission_rate from platform_settings (default 0.20)
--   3. Validates the coupon if provided
--   4. Calculates subtotal, discount, commission, total
--   5. Inserts the order
--   6. Inserts order_items
--   7. Updates ticket_types: sold += qty, reserved -= qty
--   8. Deletes the ticket_locks for the session
--   9. Increments coupon uses_count if applicable
--  10. Returns the created order as JSONB
-- =============================================================================

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_id       UUID,
  p_event_id          UUID,
  p_session_id        TEXT,
  p_coupon_id         UUID    DEFAULT NULL,
  p_payment_provider  TEXT    DEFAULT 'paypal',
  p_payment_reference TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as DB owner, bypasses RLS for the transaction
AS $$
DECLARE
  v_commission_rate   NUMERIC  := 0.20;
  v_subtotal          NUMERIC  := 0;
  v_discount          NUMERIC  := 0;
  v_commission        NUMERIC  := 0;
  v_total             NUMERIC  := 0;
  v_order_id          UUID;
  v_order             JSONB;
  v_coupon            RECORD;
  v_lock              RECORD;
  v_tt_price          NUMERIC;
  v_item_subtotal     NUMERIC;
  v_item_commission   NUMERIC;
  v_item_total        NUMERIC;
BEGIN

  -- -----------------------------------------------------------------------
  -- 1. Lock & read ticket_locks for this session (non-expired only)
  -- -----------------------------------------------------------------------
  -- Verify at least one lock exists
  IF NOT EXISTS (
    SELECT 1 FROM ticket_locks
    WHERE session_id = p_session_id
      AND locked_until > now()
  ) THEN
    RAISE EXCEPTION 'No active ticket reservations for session %', p_session_id
      USING ERRCODE = 'P0001';
  END IF;

  -- -----------------------------------------------------------------------
  -- 2. Read commission rate from platform_settings
  -- -----------------------------------------------------------------------
  SELECT (value::text)::numeric
  INTO v_commission_rate
  FROM platform_settings
  WHERE key = 'commission_rate';

  -- Fall back to 20% if not configured
  IF v_commission_rate IS NULL THEN
    v_commission_rate := 0.20;
  END IF;

  -- -----------------------------------------------------------------------
  -- 3. Calculate subtotal from locks × ticket prices
  -- -----------------------------------------------------------------------
  FOR v_lock IN
    SELECT tl.id, tl.ticket_type_id, tl.quantity, tt.price
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id
      AND tl.locked_until > now()
    FOR UPDATE OF tt   -- lock ticket_type rows for concurrent safety
  LOOP
    v_subtotal := v_subtotal + (v_lock.price * v_lock.quantity);
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 4. Validate & apply coupon
  -- -----------------------------------------------------------------------
  IF p_coupon_id IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM coupons
    WHERE id = p_coupon_id
      AND is_active = true
      AND (valid_from IS NULL  OR valid_from  <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL    OR uses_count < max_uses)
      AND (event_id IS NULL    OR event_id = p_event_id)
    FOR UPDATE;  -- lock coupon row

    IF FOUND THEN
      IF v_coupon.type = 'courtesy' THEN
        v_discount := v_subtotal;
      ELSIF v_coupon.type = 'percentage' THEN
        v_discount := ROUND(v_subtotal * (v_coupon.value / 100.0), 2);
      ELSIF v_coupon.type = 'fixed' THEN
        v_discount := LEAST(v_subtotal, v_coupon.value);
      END IF;
    ELSE
      -- Coupon invalid at this point → ignore silently (was already validated in Edge Function)
      p_coupon_id := NULL;
      v_discount  := 0;
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- 5. Calculate commission and total
  -- -----------------------------------------------------------------------
  v_commission := ROUND((v_subtotal - v_discount) * v_commission_rate, 2);
  IF v_commission < 0 THEN v_commission := 0; END IF;
  v_total := GREATEST(0, v_subtotal - v_discount + v_commission);

  -- -----------------------------------------------------------------------
  -- 6. Insert order
  -- -----------------------------------------------------------------------
  INSERT INTO orders (
    customer_id,
    event_id,
    status,
    coupon_id,
    subtotal,
    discount_amount,
    commission_amount,
    total,
    payment_provider,
    payment_reference
  )
  VALUES (
    p_customer_id,
    p_event_id,
    'confirmed',
    p_coupon_id,
    v_subtotal,
    v_discount,
    v_commission,
    v_total,
    p_payment_provider,
    p_payment_reference
  )
  RETURNING id INTO v_order_id;

  -- -----------------------------------------------------------------------
  -- 7. Insert order_items + update ticket stock
  -- -----------------------------------------------------------------------
  FOR v_lock IN
    SELECT tl.id AS lock_id, tl.ticket_type_id, tl.quantity, tt.price
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id
      AND tl.locked_until > now()
  LOOP
    v_item_subtotal   := v_lock.price * v_lock.quantity;
    v_item_commission := ROUND(v_item_subtotal * v_commission_rate, 2);
    v_item_total      := v_item_subtotal + v_item_commission;

    INSERT INTO order_items (
      order_id,
      ticket_type_id,
      quantity,
      unit_price,
      commission_rate,
      commission_amount,
      total
    )
    VALUES (
      v_order_id,
      v_lock.ticket_type_id,
      v_lock.quantity,
      v_lock.price,
      v_commission_rate,
      v_item_commission,
      v_item_total
    );

    -- Update sold + reserved atomically
    UPDATE ticket_types
    SET
      sold     = sold     + v_lock.quantity,
      reserved = GREATEST(0, reserved - v_lock.quantity)
    WHERE id = v_lock.ticket_type_id;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 8. Release ticket locks for this session
  -- -----------------------------------------------------------------------
  DELETE FROM ticket_locks
  WHERE session_id = p_session_id;

  -- -----------------------------------------------------------------------
  -- 9. Increment coupon uses_count
  -- -----------------------------------------------------------------------
  IF p_coupon_id IS NOT NULL THEN
    UPDATE coupons
    SET uses_count = uses_count + 1
    WHERE id = p_coupon_id;
  END IF;

  -- -----------------------------------------------------------------------
  -- 10. Return the created order as JSONB
  -- -----------------------------------------------------------------------
  SELECT row_to_json(o)::jsonb INTO v_order
  FROM orders o
  WHERE o.id = v_order_id;

  RETURN v_order;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;  -- propagate to caller, transaction auto-rolls back
END;
$$;
