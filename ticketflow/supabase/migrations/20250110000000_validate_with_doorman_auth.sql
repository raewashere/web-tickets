-- =============================================================================
-- TicketFlow — Migration 010: validate_ticket_qr with doorman authorization
-- 20250110000000_validate_with_doorman_auth.sql
-- =============================================================================

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
  v_event         RECORD;
  v_customer_name TEXT;
  v_items         JSONB;
  v_result        TEXT;
  v_message       TEXT;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- ── 0. Authorization check ───────────────────────────────────────────────
  IF NOT (
    has_role('admin')
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

  -- ── 1. Check doors_open ──────────────────────────────────────────────────
  SELECT doors_open, event_date, name INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.doors_open IS NOT NULL AND v_now < v_event.doors_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'result',  'doors_not_open',
      'message', 'Las puertas aún no han abierto. Apertura programada: '
                 || to_char(v_event.doors_open AT TIME ZONE 'America/Mexico_City',
                            'DD/MM/YYYY "a las" HH24:MI') || ' hrs'
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
    v_result  := 'unpaid';
    v_message := 'Este boleto no está confirmado (Estado: ' || v_order.status || ').';
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
                 || to_char(v_order.checked_in_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || ' UTC.';
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

GRANT EXECUTE ON FUNCTION validate_ticket_qr(TEXT, UUID, UUID) TO authenticated, service_role;
