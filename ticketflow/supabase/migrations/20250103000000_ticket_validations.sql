-- =============================================================================
-- TicketFlow — Migration 003: Access Control & Ticket Check-in Validation
-- 20250103000000_ticket_validations.sql
-- =============================================================================

-- 1. Add check-in columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id);

-- 2. Audit log table for access control scans
CREATE TABLE IF NOT EXISTS ticket_validations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id     UUID REFERENCES events(id) ON DELETE CASCADE,
  staff_id     UUID REFERENCES profiles(id),
  scanned_code TEXT NOT NULL,
  result       TEXT NOT NULL, -- 'valid', 'already_used', 'invalid_event', 'not_found', 'unpaid'
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_validations_order_id ON ticket_validations(order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_validations_event_id ON ticket_validations(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_checked_in_at ON orders(checked_in_at);

-- 3. RLS on ticket_validations
ALTER TABLE ticket_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read event validations" ON ticket_validations
  FOR SELECT USING (
    has_role('admin') OR
    event_id IN (
      SELECT e.id FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff insert validations" ON ticket_validations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Atomic Ticket QR Validation Function
CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_scanned_code TEXT,
  p_event_id     UUID,
  p_staff_id     UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_raw_id        TEXT;
  v_order_id      UUID;
  v_order         RECORD;
  v_customer_name TEXT;
  v_items         JSONB;
  v_result        TEXT;
  v_message       TEXT;
BEGIN
  -- Extract Order UUID from format "TICKETFLOW-AUTH-<UUID>" or direct UUID string
  v_raw_id := TRIM(p_scanned_code);
  IF v_raw_id ILIKE 'TICKETFLOW-AUTH-%' THEN
    v_raw_id := SUBSTRING(v_raw_id FROM 17);
  ELSIF v_raw_id ILIKE 'AUTH:%' THEN
    v_raw_id := TRIM(SUBSTRING(v_raw_id FROM 6));
  END IF;

  -- Validate UUID syntax
  BEGIN
    v_order_id := v_raw_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Try matching by partial ID prefix if full UUID was truncated
    SELECT id INTO v_order_id
    FROM orders
    WHERE id::text ILIKE v_raw_id || '%'
    LIMIT 1;

    IF v_order_id IS NULL THEN
      INSERT INTO ticket_validations (event_id, staff_id, scanned_code, result, message)
      VALUES (p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Código o formato de boleto no válido.');

      RETURN jsonb_build_object(
        'success', false,
        'result', 'not_found',
        'message', 'Código de boleto inválido o no reconocido.'
      );
    END IF;
  END;

  -- Fetch order with row lock
  SELECT * INTO v_order
  FROM orders
  WHERE id = v_order_id
  FOR UPDATE;

  -- Check if order exists
  IF NOT FOUND THEN
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Orden no encontrada en base de datos.');

    RETURN jsonb_build_object(
      'success', false,
      'result', 'not_found',
      'message', 'Boleto no registrado en el sistema.'
    );
  END IF;

  -- Check if order status is confirmed
  IF v_order.status != 'confirmed' THEN
    v_result  := 'unpaid';
    v_message := 'Este boleto no está confirmado (Estado: ' || v_order.status || ').';

    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);

    RETURN jsonb_build_object(
      'success', false,
      'result', v_result,
      'message', v_message
    );
  END IF;

  -- Check if order belongs to the scanned event
  IF v_order.event_id != p_event_id THEN
    v_result  := 'invalid_event';
    v_message := 'Este boleto pertenece a otro evento o espectáculo distinto.';

    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);

    RETURN jsonb_build_object(
      'success', false,
      'result', v_result,
      'message', v_message
    );
  END IF;

  -- Check if ticket was ALREADY checked in
  IF v_order.checked_in_at IS NOT NULL THEN
    v_result  := 'already_used';
    v_message := '¡ALERTA! Este boleto ya fue canjeado el ' || to_char(v_order.checked_in_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || ' UTC.';

    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);

    -- Get customer name
    SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;

    RETURN jsonb_build_object(
      'success', false,
      'result', v_result,
      'message', v_message,
      'checked_in_at', v_order.checked_in_at,
      'customer_name', COALESCE(v_customer_name, 'Cliente'),
      'order_id', v_order.id
    );
  END IF;

  -- VALID ACCESS -> Perform Check-in
  UPDATE orders
  SET checked_in_at = now(),
      checked_in_by = p_staff_id
  WHERE id = v_order_id;

  -- Fetch customer name
  SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;

  -- Fetch items breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'ticket_type_name', tt.name,
      'quantity', oi.quantity,
      'sku', tt.sku
    )
  ) INTO v_items
  FROM order_items oi
  JOIN ticket_types tt ON tt.id = oi.ticket_type_id
  WHERE oi.order_id = v_order_id;

  v_result  := 'valid';
  v_message := '¡Acceso Concedido! Boleto Válido.';

  -- Log successful validation
  INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
  VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);

  RETURN jsonb_build_object(
    'success', true,
    'result', v_result,
    'message', v_message,
    'order_id', v_order.id,
    'customer_name', COALESCE(v_customer_name, 'Cliente Registrado'),
    'checked_in_at', now(),
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_order.total
  );
END;
$$;
