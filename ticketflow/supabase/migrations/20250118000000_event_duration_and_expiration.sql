-- =============================================================================
-- TicketFlow — Migration 018: Event Estimated Duration & Expiration Control
-- 20250118000000_event_duration_and_expiration.sql
-- =============================================================================

-- 1. Add duration_minutes column to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 120 CHECK (duration_minutes > 0);

-- 2. Update validate_ticket_qr to enforce event expiration and doors_open
CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_scanned_code TEXT,
  p_event_id     UUID,
  p_staff_id     UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_raw_id        TEXT;
  v_order_id      UUID;
  v_order         RECORD;
  v_event         RECORD;
  v_customer_name TEXT;
  v_items         JSONB;
  v_result        TEXT;
  v_message       TEXT;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- ── 0. Authorization check ───────────────────────────────────────────────
  IF NOT (
    is_admin(p_staff_id)
    OR has_role('artist')
    OR (
      has_role('doorman') AND EXISTS (
        SELECT 1 FROM event_staff
        WHERE event_id = p_event_id
          AND user_id  = p_staff_id
          AND status   = 'accepted'
      )
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'unauthorized',
      'message', 'No tienes permiso para validar accesos a este evento.'
    );
  END IF;

  -- ── 1. Check doors_open and event end expiration ─────────────────────────
  SELECT doors_open, event_date, name, duration_minutes INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.doors_open IS NOT NULL AND v_now < v_event.doors_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'doors_not_open',
      'message', 'Las puertas aún no han abierto. Apertura programada: '
                 || to_char(v_event.doors_open AT TIME ZONE 'America/Mexico_City',
                            'DD/MM/YYYY "a las" HH24:MI') || ' hrs'
    );
  END IF;

  -- Check if current time is past event end (event_date + duration_minutes)
  IF v_event.event_date IS NOT NULL AND v_now > (v_event.event_date + (COALESCE(v_event.duration_minutes, 120) * INTERVAL '1 minute')) THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'event_ended',
      'message', 'El evento ha finalizado. La vigencia para validar este boleto ha expirado.'
    );
  END IF;

  -- ── 2. Extract Order UUID ────────────────────────────────────────────────
  v_raw_id := TRIM(p_scanned_code);
  IF v_raw_id ILIKE 'TICKETFLOW-AUTH-%' THEN
    v_raw_id := SUBSTRING(v_raw_id FROM 17);
  ELSIF v_raw_id ILIKE 'AUTH:%' THEN
    v_raw_id := TRIM(SUBSTRING(v_raw_id FROM 6));
  END IF;

  -- ── 3. Validate UUID syntax ──────────────────────────────────────────────
  BEGIN
    v_order_id := v_raw_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    SELECT id INTO v_order_id
    FROM orders
    WHERE id::text ILIKE v_raw_id || '%'
    LIMIT 1;

    IF v_order_id IS NULL THEN
      INSERT INTO ticket_validations (event_id, staff_id, scanned_code, result, message)
      VALUES (p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Código o formato de boleto no válido.');
      RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Código de boleto inválido o no reconocido.');
    END IF;
  END;

  -- ── 4. Fetch order with row lock ─────────────────────────────────────────
  SELECT * INTO v_order FROM orders WHERE id = v_order_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Orden no encontrada en base de datos.');
    RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Boleto no registrado en el sistema.');
  END IF;

  -- ── 5. Check payment status ──────────────────────────────────────────────
  IF v_order.status != 'confirmed' THEN
    v_result  := CASE WHEN v_order.status = 'refunded' THEN 'refunded' ELSE 'unpaid' END;
    v_message := CASE WHEN v_order.status = 'refunded'
                      THEN 'Este boleto fue cancelado por reembolso.'
                      ELSE 'Este boleto no está confirmado (Estado: ' || v_order.status || ').'
                 END;
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  -- ── 6. Check event match ─────────────────────────────────────────────────
  IF v_order.event_id != p_event_id THEN
    v_result  := 'invalid_event';
    v_message := 'Este boleto pertenece a otro evento o espectáculo distinto.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  -- ── 7. Check already used ────────────────────────────────────────────────
  IF v_order.checked_in_at IS NOT NULL THEN
    v_result  := 'already_used';
    v_message := '¡ALERTA! Este boleto ya fue canjeado el '
                 || to_char(v_order.checked_in_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') || ' hrs.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
    RETURN jsonb_build_object(
      'success', false, 'result', v_result, 'message', v_message,
      'checked_in_at', v_order.checked_in_at,
      'customer_name', COALESCE(v_customer_name, 'Cliente'),
      'order_id', v_order.id
    );
  END IF;

  -- ── 8. VALID ACCESS → Check-in ───────────────────────────────────────────
  UPDATE orders SET checked_in_at = v_now, checked_in_by = p_staff_id WHERE id = v_order_id;
  SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
  SELECT jsonb_agg(jsonb_build_object('ticket_type_name', tt.name, 'quantity', oi.quantity, 'sku', tt.sku))
  INTO v_items
  FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id
  WHERE oi.order_id = v_order_id;

  v_result  := 'valid';
  v_message := '¡Acceso Concedido! Boleto Válido.';
  INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
  VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);

  RETURN jsonb_build_object(
    'success', true, 'result', v_result, 'message', v_message,
    'order_id', v_order.id,
    'customer_name', COALESCE(v_customer_name, 'Cliente Registrado'),
    'checked_in_at', v_now,
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_order.total
  );
END;
$$;

-- 3. Update search_published_events to hide events whose duration has ended
DROP FUNCTION IF EXISTS search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_published_events(
  p_query      TEXT DEFAULT NULL,
  p_type_id    UUID DEFAULT NULL,
  p_date_from  TIMESTAMPTZ DEFAULT NULL,
  p_date_to    TIMESTAMPTZ DEFAULT NULL,
  p_sort       TEXT DEFAULT 'date_asc',
  p_limit      INT DEFAULT 12,
  p_offset     INT DEFAULT 0
)
RETURNS TABLE (
  id                     UUID,
  artist_id              UUID,
  name                   TEXT,
  flyer_url              TEXT,
  description            TEXT,
  event_type_id          UUID,
  venue_id               UUID,
  venue_configuration_id UUID,
  event_date             TIMESTAMPTZ,
  doors_open             TIMESTAMPTZ,
  duration_minutes       INTEGER,
  status                 event_status,
  artist_name            TEXT,
  artist_photo_url       TEXT,
  venue_name             TEXT,
  total_count            BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    e.id,
    e.artist_id,
    e.name,
    e.flyer_url,
    e.description,
    e.event_type_id,
    e.venue_id,
    e.venue_configuration_id,
    e.event_date,
    e.doors_open,
    COALESCE(e.duration_minutes, 120) AS duration_minutes,
    e.status,
    a.name AS artist_name,
    a.photo_url AS artist_photo_url,
    v.name AS venue_name,
    COUNT(*) OVER() AS total_count
  FROM events e
  JOIN artists a ON a.id = e.artist_id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE
    e.status = 'published'
    -- Only show events that have not yet concluded (event_date + duration_minutes >= now())
    AND (e.event_date IS NULL OR (e.event_date + (COALESCE(e.duration_minutes, 120) * INTERVAL '1 minute')) >= now())
    AND (p_date_from IS NULL OR e.event_date >= p_date_from)
    AND (p_date_to   IS NULL OR e.event_date <= p_date_to)
    AND (p_type_id   IS NULL OR e.event_type_id = p_type_id)
    AND (
      p_query IS NULL OR p_query = ''
      OR e.name        ILIKE '%' || p_query || '%'
      OR a.name        ILIKE '%' || p_query || '%'
      OR e.description ILIKE '%' || p_query || '%'
    )
  ORDER BY
    CASE WHEN p_sort = 'date_desc' THEN e.event_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'name_asc'  THEN e.name       END ASC  NULLS LAST,
    e.event_date ASC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- 4. Update reserve_tickets to prevent reservations on ended events
CREATE OR REPLACE FUNCTION reserve_tickets(
  p_ticket_type_id UUID,
  p_quantity INT,
  p_session_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_available    INT;
  v_lock_id      UUID;
  v_locked_until TIMESTAMPTZ;
  v_event        RECORD;
BEGIN
  -- Verify ticket type exists and check event validity
  SELECT e.* INTO v_event
  FROM events e
  JOIN ticket_types tt ON tt.event_id = e.id
  WHERE tt.id = p_ticket_type_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'not_found',
      'message', 'Tipo de boleto no encontrado.'
    );
  END IF;

  -- Event must be published
  IF v_event.status != 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'event_not_published',
      'message', 'El evento no está disponible para compra.'
    );
  END IF;

  -- Event must not have ended
  IF v_event.event_date IS NOT NULL AND (v_event.event_date + (COALESCE(v_event.duration_minutes, 120) * INTERVAL '1 minute')) < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'event_ended',
      'message', 'El evento ha finalizado. La venta de boletos está cerrada.'
    );
  END IF;

  -- Check available stock with row-level lock
  SELECT (stock - sold - reserved) INTO v_available
  FROM ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'insufficient_stock',
      'available', v_available
    );
  END IF;

  -- Create lock (15-minute window)
  v_locked_until := now() + INTERVAL '15 minutes';
  INSERT INTO ticket_locks (ticket_type_id, session_id, quantity, locked_until)
  VALUES (p_ticket_type_id, p_session_id, p_quantity, v_locked_until)
  RETURNING id INTO v_lock_id;

  -- Increment reserved count
  UPDATE ticket_types
  SET reserved = reserved + p_quantity
  WHERE id = p_ticket_type_id;

  RETURN jsonb_build_object(
    'success',      true,
    'lock_id',      v_lock_id,
    'locked_until', v_locked_until
  );
END;
$$;

-- 5. Update create_order_atomic to prevent order completion on ended events
CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_id       UUID,
  p_event_id          UUID,
  p_session_id        TEXT,
  p_coupon_id         UUID    DEFAULT NULL,
  p_payment_provider  TEXT    DEFAULT 'paypal',
  p_payment_reference TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
  v_event             RECORD;
  v_tt_price          NUMERIC;
  v_item_subtotal     NUMERIC;
  v_item_commission   NUMERIC;
  v_item_total        NUMERIC;
BEGIN
  -- 0. Check event status and end time
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe.' USING ERRCODE = 'P0001';
  END IF;

  IF v_event.status != 'published' THEN
    RAISE EXCEPTION 'El evento no está disponible para compras.' USING ERRCODE = 'P0001';
  END IF;

  IF v_event.event_date IS NOT NULL AND (v_event.event_date + (COALESCE(v_event.duration_minutes, 120) * INTERVAL '1 minute')) < now() THEN
    RAISE EXCEPTION 'El evento ha finalizado. No es posible completar compras.' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Lock & read ticket_locks for this session (non-expired only)
  IF NOT EXISTS (
    SELECT 1 FROM ticket_locks
    WHERE session_id = p_session_id
      AND locked_until > now()
  ) THEN
    RAISE EXCEPTION 'No active ticket reservations for session %', p_session_id
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Read commission rate from platform_settings
  SELECT (value::text)::numeric
  INTO v_commission_rate
  FROM platform_settings
  WHERE key = 'commission_rate';

  IF v_commission_rate IS NULL THEN
    v_commission_rate := 0.20;
  END IF;

  -- 3. Calculate subtotal from locks
  FOR v_lock IN
    SELECT tl.quantity, tt.price, tt.id AS ticket_type_id, tt.sku
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id
      AND tl.locked_until > now()
  LOOP
    v_subtotal := v_subtotal + (v_lock.price * v_lock.quantity);
  END LOOP;

  -- 4. Validate and apply coupon if provided
  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM coupons
    WHERE id = p_coupon_id
      AND is_active = true
      AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL OR uses_count < max_uses)
      AND (event_id IS NULL OR event_id = p_event_id);

    IF v_coupon.id IS NOT NULL THEN
      IF v_coupon.type = 'percentage' THEN
        v_discount := ROUND((v_subtotal * (v_coupon.value / 100.0)), 2);
      ELSIF v_coupon.type = 'fixed' THEN
        v_discount := LEAST(v_coupon.value, v_subtotal);
      ELSIF v_coupon.type = 'courtesy' THEN
        v_discount := v_subtotal;
      END IF;
    END IF;
  END IF;

  -- 5. Calculate commission & total
  v_commission := ROUND(((v_subtotal - v_discount) * v_commission_rate), 2);
  v_total      := (v_subtotal - v_discount) + v_commission;

  -- 6. Insert order
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
  ) VALUES (
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
  ) RETURNING id INTO v_order_id;

  -- 7. Insert order_items & update ticket_types
  FOR v_lock IN
    SELECT tl.quantity, tt.price, tt.id AS ticket_type_id, tt.sku
    FROM ticket_locks tl
    JOIN ticket_types tt ON tt.id = tl.ticket_type_id
    WHERE tl.session_id = p_session_id
      AND tl.locked_until > now()
  LOOP
    v_tt_price        := v_lock.price;
    v_item_subtotal   := v_tt_price * v_lock.quantity;
    v_item_commission := ROUND((v_item_subtotal * v_commission_rate), 2);
    v_item_total      := v_item_subtotal + v_item_commission;

    INSERT INTO order_items (
      order_id,
      ticket_type_id,
      quantity,
      unit_price,
      commission_rate,
      commission_amount,
      total
    ) VALUES (
      v_order_id,
      v_lock.ticket_type_id,
      v_lock.quantity,
      v_tt_price,
      v_commission_rate,
      v_item_commission,
      v_item_total
    );

    UPDATE ticket_types
    SET sold     = sold + v_lock.quantity,
        reserved = GREATEST(0, reserved - v_lock.quantity)
    WHERE id = v_lock.ticket_type_id;
  END LOOP;

  -- 8. Delete ticket_locks
  DELETE FROM ticket_locks WHERE session_id = p_session_id;

  -- 9. Increment coupon uses_count if applicable
  IF p_coupon_id IS NOT NULL AND v_coupon.id IS NOT NULL THEN
    UPDATE coupons
    SET uses_count = uses_count + 1
    WHERE id = p_coupon_id;
  END IF;

  -- 10. Build return JSON
  SELECT jsonb_build_object(
    'id',                o.id,
    'customer_id',       o.customer_id,
    'event_id',          o.event_id,
    'status',            o.status,
    'subtotal',          o.subtotal,
    'discount_amount',   o.discount_amount,
    'commission_amount', o.commission_amount,
    'total',             o.total,
    'payment_provider',  o.payment_provider,
    'payment_reference', o.payment_reference,
    'created_at',        o.created_at
  )
  INTO v_order
  FROM orders o
  WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION validate_ticket_qr(TEXT, UUID, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reserve_tickets(UUID, INT, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION create_order_atomic(UUID, UUID, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role, anon;
