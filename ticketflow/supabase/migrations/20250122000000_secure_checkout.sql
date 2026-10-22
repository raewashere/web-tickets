-- =============================================================================
-- TicketFlow — Migration 022: Secure Checkout
-- 20250122000000_secure_checkout.sql
-- =============================================================================
-- Fixes critical checkout vulnerabilities found in the security review:
--
--   A. Payment amount was trusted from the client. The server-side total is now
--      computed by calculate_checkout_quote() and must match the PayPal amount.
--   B. Clients could skip payment with isFree=true. create_order_atomic now
--      rejects 'courtesy' orders whose computed total is not 0.
--   C. create_order_atomic was executable by anon/authenticated via PostgREST.
--      EXECUTE is now restricted to service_role (Edge Functions only).
--   D. Locks were not bound to p_event_id. All active locks of the session must
--      belong to ticket types of the given event.
--   E. SKU-restricted coupons (migration 011) regressed in migration 021 and
--      applied to the whole subtotal. The SKU restriction is restored.
--   +  PayPal payment references are unique to prevent order replay.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Unique PayPal payment reference (anti-replay / idempotency)
-- ---------------------------------------------------------------------------
-- NOTE: this fails if duplicated PayPal references already exist. Check first:
--   SELECT payment_reference, count(*) FROM orders
--   WHERE payment_provider = 'paypal' GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_reference_unique_idx
  ON orders(payment_reference)
  WHERE payment_provider = 'paypal' AND payment_reference IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. calculate_checkout_quote — single source of truth for checkout totals
--
-- Used by Edge Functions (create-paypal-order, create-order) and by
-- create_order_atomic. Read-only; raises on invalid sessions.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS calculate_checkout_quote(TEXT, UUID, UUID);

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

  -- Every active lock of the session must belong to the requested event
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
      IF v_coupon.ticket_sku IS NOT NULL AND TRIM(v_coupon.ticket_sku) <> '' THEN
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
        v_applied_coupon_id := v_coupon.id;
        IF v_coupon.type = 'courtesy' THEN
          v_discount := v_eligible_subtotal;
        ELSIF v_coupon.type = 'percentage' THEN
          v_discount := ROUND(v_eligible_subtotal * (v_coupon.value / 100.0), 2);
        ELSIF v_coupon.type = 'fixed' THEN
          v_discount := LEAST(v_eligible_subtotal, v_coupon.value);
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


-- ---------------------------------------------------------------------------
-- 3. create_order_atomic — hardened
--
-- New parameter p_expected_total: the amount actually charged (PayPal).
--   • payment_provider = 'courtesy' → computed total must be 0
--   • any other provider            → p_expected_total must equal the total
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_id       UUID    DEFAULT NULL,
  p_event_id          UUID    DEFAULT NULL,
  p_session_id        TEXT    DEFAULT NULL,
  p_coupon_id         UUID    DEFAULT NULL,
  p_payment_provider  TEXT    DEFAULT 'paypal',
  p_payment_reference TEXT    DEFAULT NULL,
  p_guest_email       TEXT    DEFAULT NULL,
  p_guest_name        TEXT    DEFAULT NULL,
  p_expected_total    NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote             JSONB;
  v_subtotal          NUMERIC;
  v_discount          NUMERIC;
  v_total             NUMERIC;
  v_commission        NUMERIC;
  v_commission_rate   NUMERIC;
  v_applied_coupon_id UUID;
  v_order_id          UUID;
  v_access_token      TEXT;
  v_order             JSONB;
  v_lock              RECORD;
  v_item_subtotal     NUMERIC;
BEGIN
  IF p_customer_id IS NULL AND (p_guest_email IS NULL OR TRIM(p_guest_email) = '') THEN
    RAISE EXCEPTION 'Either customer_id or guest_email is required'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_provider IS DISTINCT FROM 'courtesy'
     AND (p_payment_reference IS NULL OR TRIM(p_payment_reference) = '') THEN
    RAISE EXCEPTION 'payment_reference is required for paid orders'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_provider = 'paypal' AND EXISTS (
    SELECT 1 FROM orders
    WHERE payment_provider = 'paypal' AND payment_reference = p_payment_reference
  ) THEN
    RAISE EXCEPTION 'Payment reference % was already used', p_payment_reference
      USING ERRCODE = 'P0005';
  END IF;

  -- Lock ticket types and coupon rows for concurrent safety
  PERFORM 1
  FROM ticket_types tt
  WHERE tt.id IN (
    SELECT ticket_type_id FROM ticket_locks
    WHERE session_id = p_session_id AND locked_until > now()
  )
  FOR UPDATE;

  IF p_coupon_id IS NOT NULL THEN
    PERFORM 1 FROM coupons WHERE id = p_coupon_id FOR UPDATE;
  END IF;

  v_quote := calculate_checkout_quote(p_session_id, p_event_id, p_coupon_id);

  v_subtotal          := (v_quote->>'subtotal')::numeric;
  v_discount          := (v_quote->>'discount')::numeric;
  v_total             := (v_quote->>'total')::numeric;
  v_commission        := (v_quote->>'commission')::numeric;
  v_commission_rate   := (v_quote->>'commission_rate')::numeric;
  v_applied_coupon_id := NULLIF(v_quote->>'coupon_id', '')::uuid;

  IF p_payment_provider = 'courtesy' THEN
    IF v_total <> 0 THEN
      RAISE EXCEPTION 'Courtesy orders require a total of 0 (computed: %)', v_total
        USING ERRCODE = 'P0004';
    END IF;
  ELSE
    IF p_expected_total IS NULL OR ABS(p_expected_total - v_total) >= 0.01 THEN
      RAISE EXCEPTION 'Paid amount % does not match order total %', p_expected_total, v_total
        USING ERRCODE = 'P0004';
    END IF;
  END IF;

  v_access_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO orders (
    customer_id, event_id, status, coupon_id,
    subtotal, discount_amount, commission_amount, total,
    payment_provider, payment_reference,
    guest_email, guest_name, access_token
  ) VALUES (
    p_customer_id, p_event_id, 'confirmed', v_applied_coupon_id,
    v_subtotal, v_discount, v_commission, v_total,
    p_payment_provider, p_payment_reference,
    p_guest_email, p_guest_name, v_access_token
  ) RETURNING id INTO v_order_id;

  FOR v_lock IN
    SELECT tl.ticket_type_id, tl.quantity, tt.price
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id AND tl.locked_until > now()
  LOOP
    v_item_subtotal := v_lock.price * v_lock.quantity;

    INSERT INTO order_items (
      order_id, ticket_type_id, quantity, unit_price,
      subtotal, commission_rate, commission_amount, total
    ) VALUES (
      v_order_id, v_lock.ticket_type_id, v_lock.quantity, v_lock.price,
      v_item_subtotal, v_commission_rate,
      ROUND(v_item_subtotal * v_commission_rate, 2), v_item_subtotal
    );

    UPDATE ticket_types
    SET sold     = sold     + v_lock.quantity,
        reserved = GREATEST(0, reserved - v_lock.quantity)
    WHERE id = v_lock.ticket_type_id;
  END LOOP;

  IF v_applied_coupon_id IS NOT NULL THEN
    UPDATE coupons SET uses_count = uses_count + 1 WHERE id = v_applied_coupon_id;
  END IF;

  DELETE FROM ticket_locks WHERE session_id = p_session_id;

  SELECT jsonb_build_object(
    'id',                o.id,
    'customer_id',       o.customer_id,
    'guest_email',       o.guest_email,
    'guest_name',        o.guest_name,
    'access_token',      o.access_token,
    'event_id',          o.event_id,
    'status',            o.status,
    'subtotal',          o.subtotal,
    'discount_amount',   o.discount_amount,
    'commission_amount', o.commission_amount,
    'total',             o.total,
    'created_at',        o.created_at
  ) INTO v_order FROM orders o WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

-- Only Edge Functions (service_role) may create orders
REVOKE ALL ON FUNCTION create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC)
  TO service_role;

COMMENT ON FUNCTION create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) IS
  'Atomic order creation (service_role only). Totals are computed server-side via
   calculate_checkout_quote(). Paid orders must pass p_expected_total equal to the
   captured amount; courtesy orders require a computed total of 0.';
