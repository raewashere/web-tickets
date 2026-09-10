-- =============================================================================
-- TicketFlow — Migration 021: Guest Checkout
-- =============================================================================
-- Allows ticket purchases without a user account. Guests provide their name
-- and email. A unique access_token is generated for each order so guests can
-- view their tickets via a public URL without authentication.
--
-- Changes:
--   1. orders.customer_id → nullable (NULL for guest orders)
--   2. orders.guest_email TEXT  — email for delivery
--   3. orders.guest_name  TEXT  — display name on ticket
--   4. orders.access_token TEXT — unique token for public ticket access
--   5. Unique index on orders.access_token
--   6. RLS: allow SELECT on orders via access_token (no JWT required)
--   7. RPC: get_order_by_access_token — returns full order for public ticket page
--   8. Update create_order_atomic — accepts nullable customer_id + guest fields
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Make customer_id nullable (guests have no account)
-- ---------------------------------------------------------------------------
-- The column was created with no explicit NOT NULL in the initial schema
-- (references imply nullable), so this is a safeguard in case the constraint
-- was added later.
ALTER TABLE orders
  ALTER COLUMN customer_id DROP NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. Add guest fields
-- ---------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_email  TEXT,
  ADD COLUMN IF NOT EXISTS guest_name   TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT
    NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex');


-- ---------------------------------------------------------------------------
-- 3. Unique index on access_token for fast O(1) lookups + security
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_unique_idx
  ON orders(access_token);


-- ---------------------------------------------------------------------------
-- 4. RLS — Allow reading an order via its access_token (no JWT needed)
--
-- The existing "Customer own orders" policy covers authenticated users.
-- This additional policy covers guests using the public ticket URL.
-- We use current_setting(..., true) to safely read the custom claim when
-- the request comes from PostgREST with the token passed as a header:
--   apikey: <anon_key>
--   access-token: <the_token>   ← client sends this
-- The Edge Function / RPC approach below is safer — see section 7.
-- ---------------------------------------------------------------------------
CREATE POLICY "Guest read order by access_token"
  ON orders FOR SELECT
  USING (
    access_token = current_setting('request.headers', true)::json->>'x-ticket-token'
  );


-- ---------------------------------------------------------------------------
-- 5. RPC: get_order_by_access_token
--
-- Called from the public ticket page:
--   POST /rest/v1/rpc/get_order_by_access_token
--   Body: { "p_order_id": "...", "p_token": "..." }
--
-- Uses SECURITY DEFINER so it can read the order without the caller needing
-- a matching RLS policy. The (order_id + token) pair prevents enumeration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_order_by_access_token(
  p_order_id UUID,
  p_token    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id',              o.id,
    'status',          o.status,
    'guest_name',      o.guest_name,
    'guest_email',     o.guest_email,
    'subtotal',        o.subtotal,
    'discount_amount', o.discount_amount,
    'total',           o.total,
    'created_at',      o.created_at,
    'event', jsonb_build_object(
      'id',          e.id,
      'title',       e.title,
      'event_date',  e.event_date,
      'cover_image', e.cover_image,
      'venue',       jsonb_build_object(
        'name',      v.name
      )
    ),
    'artist', jsonb_build_object(
      'id',   a.id,
      'name', a.name
    ),
    'items', (
      SELECT jsonb_agg(jsonb_build_object(
        'id',          oi.id,
        'quantity',    oi.quantity,
        'unit_price',  oi.unit_price,
        'total',       oi.total,
        'ticket_type', jsonb_build_object(
          'id',   tt.id,
          'name', tt.name
        )
      ))
      FROM order_items oi
      JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      WHERE oi.order_id = o.id
    )
  )
  INTO v_result
  FROM orders o
  JOIN events  e ON e.id = o.event_id
  JOIN artists a ON a.id = e.artist_id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE o.id           = p_order_id
    AND o.access_token = p_token
    AND o.status       = 'confirmed';

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Order not found or access token invalid'
      USING ERRCODE = 'P0404';
  END IF;

  RETURN v_result;
END;
$$;

-- Allow anyone (including anon) to call this RPC
GRANT EXECUTE ON FUNCTION get_order_by_access_token(UUID, TEXT) TO anon, authenticated;


-- ---------------------------------------------------------------------------
-- 6. Update create_order_atomic to support guest orders
--
-- p_customer_id is now nullable.
-- Two new optional params: p_guest_email and p_guest_name.
-- N8N webhook call is left as a placeholder comment — the Edge Function
-- `create-order` will handle the HTTP call to N8N after this function returns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_id       UUID    DEFAULT NULL,
  p_event_id          UUID    DEFAULT NULL,
  p_session_id        TEXT    DEFAULT NULL,
  p_coupon_id         UUID    DEFAULT NULL,
  p_payment_provider  TEXT    DEFAULT 'paypal',
  p_payment_reference TEXT    DEFAULT NULL,
  p_guest_email       TEXT    DEFAULT NULL,
  p_guest_name        TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commission_rate   NUMERIC  := 0.20;
  v_subtotal          NUMERIC  := 0;
  v_discount          NUMERIC  := 0;
  v_commission        NUMERIC  := 0;
  v_total             NUMERIC  := 0;
  v_order_id          UUID;
  v_access_token      TEXT;
  v_order             JSONB;
  v_coupon            RECORD;
  v_lock              RECORD;
  v_item_subtotal     NUMERIC;
  v_item_commission   NUMERIC;
  v_item_total        NUMERIC;
BEGIN

  -- Validate: must have either a customer_id (authenticated) or guest_email
  IF p_customer_id IS NULL AND (p_guest_email IS NULL OR p_guest_email = '') THEN
    RAISE EXCEPTION 'Either customer_id or guest_email is required'
      USING ERRCODE = 'P0002';
  END IF;

  -- 1. Verify active locks
  IF NOT EXISTS (
    SELECT 1 FROM ticket_locks
    WHERE session_id = p_session_id AND locked_until > now()
  ) THEN
    RAISE EXCEPTION 'No active ticket reservations for session %', p_session_id
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Read commission rate
  SELECT (value::text)::numeric INTO v_commission_rate
  FROM platform_settings WHERE key = 'commission_rate';
  IF v_commission_rate IS NULL THEN v_commission_rate := 0.20; END IF;

  -- 3. Calculate subtotal
  FOR v_lock IN
    SELECT tl.id, tl.ticket_type_id, tl.quantity, tt.price
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id AND tl.locked_until > now()
    FOR UPDATE OF tt
  LOOP
    v_subtotal := v_subtotal + (v_lock.price * v_lock.quantity);
  END LOOP;

  -- 4. Coupon discount
  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE id = p_coupon_id AND is_active = true
      AND (valid_from IS NULL  OR valid_from  <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL    OR uses_count < max_uses)
      AND (event_id IS NULL    OR event_id = p_event_id)
    FOR UPDATE;

    IF FOUND THEN
      IF v_coupon.type = 'courtesy' THEN
        v_discount := v_subtotal;
      ELSIF v_coupon.type = 'percentage' THEN
        v_discount := ROUND(v_subtotal * (v_coupon.value / 100.0), 2);
      ELSIF v_coupon.type = 'fixed' THEN
        v_discount := LEAST(v_subtotal, v_coupon.value);
      END IF;
    ELSE
      p_coupon_id := NULL;
      v_discount  := 0;
    END IF;
  END IF;

  -- 5. Total = subtotal - discount (commission retained from total, NOT added)
  v_total := GREATEST(0, v_subtotal - v_discount);
  v_commission := ROUND(v_total * v_commission_rate, 2);
  IF v_commission < 0 THEN v_commission := 0; END IF;

  -- Generate a fresh access_token for this order
  v_access_token := encode(gen_random_bytes(16), 'hex');

  -- 6. Insert order
  INSERT INTO orders (
    customer_id, event_id, status, coupon_id,
    subtotal, discount_amount, commission_amount, total,
    payment_provider, payment_reference,
    guest_email, guest_name, access_token
  ) VALUES (
    p_customer_id, p_event_id, 'confirmed', p_coupon_id,
    v_subtotal, v_discount, v_commission, v_total,
    p_payment_provider, p_payment_reference,
    p_guest_email, p_guest_name, v_access_token
  ) RETURNING id INTO v_order_id;

  -- 7. Insert order_items + update ticket stock
  FOR v_lock IN
    SELECT tl.id AS lock_id, tl.ticket_type_id, tl.quantity, tt.price
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id AND tl.locked_until > now()
  LOOP
    v_item_subtotal   := v_lock.price * v_lock.quantity;
    v_item_total      := v_item_subtotal;  -- customer pays full price
    v_item_commission := ROUND(v_item_subtotal * v_commission_rate, 2);

    INSERT INTO order_items (
      order_id, ticket_type_id, quantity, unit_price,
      subtotal, commission_rate, commission_amount, total
    ) VALUES (
      v_order_id, v_lock.ticket_type_id, v_lock.quantity, v_lock.price,
      v_item_subtotal, v_commission_rate, v_item_commission, v_item_total
    );

    UPDATE ticket_types
    SET sold     = sold     + v_lock.quantity,
        reserved = GREATEST(0, reserved - v_lock.quantity)
    WHERE id = v_lock.ticket_type_id;
  END LOOP;

  -- 8. Increment coupon uses
  IF p_coupon_id IS NOT NULL THEN
    UPDATE coupons SET uses_count = uses_count + 1 WHERE id = p_coupon_id;
  END IF;

  -- 9. Release locks
  DELETE FROM ticket_locks WHERE session_id = p_session_id;

  -- 10. Return result
  -- NOTE: N8N webhook dispatch happens in the Edge Function `create-order`
  -- after this function returns, using the access_token from this result.
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

-- Grant to authenticated users (Edge Functions run with service_role, but anon needs it for guest checkout)
GRANT EXECUTE ON FUNCTION create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, anon;

COMMENT ON FUNCTION create_order_atomic IS
  'Atomic order creation. Supports both authenticated users (p_customer_id) and
   guests (p_guest_email + p_guest_name). Returns the created order including the
   access_token for public ticket access. N8N notification is dispatched by the
   calling Edge Function (create-order) after this function returns.';
