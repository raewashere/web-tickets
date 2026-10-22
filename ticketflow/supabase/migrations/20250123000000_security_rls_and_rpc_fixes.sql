-- =============================================================================
-- TicketFlow / BoletoCoqueto — Migration 023: Security RLS, Roles & RPC Hardening
-- 20250123000000_security_rls_and_rpc_fixes.sql
-- =============================================================================
-- Fixes the security and functional issues discovered during the codebase audit:
--
--   1. user_roles INSERT policy: prevents authenticated users from self-assigning
--      the 'admin' role. Self-assignment is restricted to 'customer' and 'artist'
--      (and 'doorman' only when a matching pending staff_invitation exists).
--   2. is_admin(p_user_id) anonymous bypass: removes the condition that returned
--      TRUE when p_user_id IS NULL inside SECURITY DEFINER context, and revokes
--      EXECUTE from anon on all administrative/financial RPCs.
--   3. reserve_tickets & release_expired_locks: adds SECURITY DEFINER so guest
--      buyers (anon) can reserve tickets without RLS blocking ticket_types UPDATE
--      or ticket_locks INSERT; validates quantity (1..20) and published event.
--   4. Doorman staff invitation acceptance: adds accept_staff_invitation(p_token)
--      RPC and RLS policy so invited doormen can accept their invitation.
--   5. validate_ticket_qr: requires at least 8 characters for prefix search,
--      scopes prefix lookup to p_event_id, returns 'refunded' explicitly, and
--      includes guest_name fallback.
--   6. Refunds: restricts process_refund_request approval/rejection exclusively
--      to Super-Admin (is_admin(auth.uid())), and extends request_order_refund
--      to support guest orders via p_access_token.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Fix is_admin(p_user_id) — never return TRUE when p_user_id IS NULL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = p_user_id
      AND user_roles.role = 'admin'
  );
END;
$$;

-- Revoke anonymous execution on administrative & financial RPCs
REVOKE EXECUTE ON FUNCTION get_global_platform_metrics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_all_venues_for_moderation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_all_users_with_roles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_set_user_role(UUID, role_type, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_toggle_venue_verification(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_all_artists_financial_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_artist_financial_summary(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_payout_record(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION upsert_artist_payout_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION process_refund_request(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_all_refund_requests() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_global_platform_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_venues_for_moderation() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_set_user_role(UUID, role_type, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_venue_verification(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_artists_financial_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_artist_financial_summary(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_payout_record(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_artist_payout_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_refund_request(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_refund_requests() TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2. Fix user_roles RLS — block self-escalation to 'admin'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert non-admin own roles" ON public.user_roles;

CREATE POLICY "Users can insert non-admin own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR (
      user_id = auth.uid()
      AND (
        role IN ('customer', 'artist')
        OR (
          role = 'doorman'
          AND EXISTS (
            SELECT 1
            FROM public.staff_invitations si
            JOIN auth.users u ON LOWER(u.email) = LOWER(si.email)
            WHERE u.id = auth.uid()
              AND si.status IN ('pending', 'accepted')
              AND si.expires_at > now()
          )
        )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- 3. Fix reserve_tickets & release_expired_locks — SECURITY DEFINER for guests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reserve_tickets(
  p_ticket_type_id UUID,
  p_quantity       INT,
  p_session_id     TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available    INT;
  v_event_status TEXT;
  v_lock_id      UUID;
  v_locked_until TIMESTAMPTZ;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 20 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'invalid_quantity'
    );
  END IF;

  IF p_session_id IS NULL OR LENGTH(TRIM(p_session_id)) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'invalid_session'
    );
  END IF;

  -- Check available stock with row-level lock and ensure event is published
  SELECT (tt.stock - tt.sold - tt.reserved), e.status::TEXT
  INTO v_available, v_event_status
  FROM ticket_types tt
  JOIN events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id
  FOR UPDATE OF tt;

  IF NOT FOUND OR v_event_status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'event_not_available'
    );
  END IF;

  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'insufficient_stock',
      'available', GREATEST(0, v_available)
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

GRANT EXECUTE ON FUNCTION reserve_tickets(UUID, INT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released INT := 0;
  v_lock     RECORD;
BEGIN
  FOR v_lock IN
    SELECT id, ticket_type_id, quantity
    FROM ticket_locks
    WHERE locked_until <= now()
    FOR UPDATE
  LOOP
    UPDATE ticket_types
    SET reserved = GREATEST(0, reserved - v_lock.quantity)
    WHERE id = v_lock.ticket_type_id;

    DELETE FROM ticket_locks WHERE id = v_lock.id;
    v_released := v_released + 1;
  END LOOP;

  RETURN v_released;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4. Doorman invitation acceptance — atomic RPC + RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Invited user can accept own invitation" ON public.staff_invitations;
CREATE POLICY "Invited user can accept own invitation"
  ON public.staff_invitations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (status = 'accepted');

DROP POLICY IF EXISTS "Doorman can insert own accepted assignment" ON public.event_staff;
CREATE POLICY "Doorman can insert own accepted assignment"
  ON public.event_staff FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_invitations si
      WHERE si.event_id = event_staff.event_id
        AND si.status IN ('pending', 'accepted')
        AND si.expires_at > now()
    )
  );

DROP POLICY IF EXISTS "Doorman can update own assignment" ON public.event_staff;
CREATE POLICY "Doorman can update own assignment"
  ON public.event_staff FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION accept_staff_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_invite     RECORD;
  v_other_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debes iniciar sesión para aceptar la invitación.');
  END IF;

  SELECT * INTO v_invite
  FROM public.staff_invitations
  WHERE token = TRIM(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitación no encontrada o token inválido.');
  END IF;

  IF v_invite.status IN ('revoked', 'expired') OR v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta invitación ha expirado o fue revocada.');
  END IF;

  -- Check if user already has an active assignment for another event
  SELECT e.name INTO v_other_name
  FROM public.event_staff es
  JOIN public.events e ON e.id = es.event_id
  WHERE es.user_id = v_user_id
    AND es.status = 'accepted'
    AND es.event_id <> v_invite.event_id
  LIMIT 1;

  IF v_other_name IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Ya tienes una asignación activa para el evento "' || v_other_name || '". Un validador solo puede trabajar en un evento a la vez.'
    );
  END IF;

  -- 1. Ensure 'doorman' role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'doorman')
  ON CONFLICT DO NOTHING;

  -- 2. Upsert event_staff assignment
  INSERT INTO public.event_staff (event_id, user_id, invited_by, status)
  VALUES (v_invite.event_id, v_user_id, v_invite.invited_by, 'accepted')
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = 'accepted', invited_by = EXCLUDED.invited_by, updated_at = now();

  -- 3. Mark invitation as accepted
  UPDATE public.staff_invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'eventId', v_invite.event_id);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_staff_invitation(TEXT) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 5. Harden validate_ticket_qr — minimum prefix length, refunded status & guest name
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_scanned_code TEXT,
  p_event_id     UUID,
  p_staff_id     UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- 0. Authorization check
  IF NOT (
    has_role('admin')
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE e.id = p_event_id AND a.user_id = p_staff_id
    )
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

  -- 1. Check doors_open
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

  -- 2. Extract Order UUID (supports both TICKETFLOW-AUTH- and BOLETOCOQUETO-AUTH-)
  v_raw_id := TRIM(COALESCE(p_scanned_code, ''));
  IF v_raw_id ILIKE 'TICKETFLOW-AUTH-%' THEN
    v_raw_id := SUBSTRING(v_raw_id FROM 17);
  ELSIF v_raw_id ILIKE 'BOLETOCOQUETO-AUTH-%' THEN
    v_raw_id := SUBSTRING(v_raw_id FROM 20);
  ELSIF v_raw_id ILIKE 'AUTH:%' THEN
    v_raw_id := TRIM(SUBSTRING(v_raw_id FROM 6));
  END IF;

  -- 3. Validate UUID syntax or require >= 8 chars prefix scoped to the event
  BEGIN
    v_order_id := v_raw_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    IF LENGTH(v_raw_id) >= 8 THEN
      SELECT id INTO v_order_id
      FROM orders
      WHERE event_id = p_event_id
        AND id::text ILIKE v_raw_id || '%'
      LIMIT 1;
    END IF;

    IF v_order_id IS NULL THEN
      INSERT INTO ticket_validations (event_id, staff_id, scanned_code, result, message)
      VALUES (p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Código o formato de boleto no válido.');
      RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Código de boleto inválido o no reconocido.');
    END IF;
  END;

  -- 4. Fetch order with row lock
  SELECT * INTO v_order FROM orders WHERE id = v_order_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, 'not_found', 'Orden no encontrada en base de datos.');
    RETURN jsonb_build_object('success', false, 'result', 'not_found', 'message', 'Boleto no registrado en el sistema.');
  END IF;

  -- 5. Check payment / refund status
  IF v_order.status = 'refunded' THEN
    v_result  := 'refunded';
    v_message := '¡Boleto cancelado! Esta orden fue reembolsada.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  ELSIF v_order.status != 'confirmed' THEN
    v_result  := 'unpaid';
    v_message := 'Este boleto no está confirmado (Estado: ' || v_order.status || ').';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  -- 6. Check event match
  IF v_order.event_id != p_event_id THEN
    v_result  := 'invalid_event';
    v_message := 'Este boleto pertenece a otro evento o espectáculo distinto.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object('success', false, 'result', v_result, 'message', v_message);
  END IF;

  SELECT display_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
  v_customer_name := COALESCE(v_customer_name, v_order.guest_name, v_order.guest_email, 'Cliente');

  -- 7. Check already used
  IF v_order.checked_in_at IS NOT NULL THEN
    v_result  := 'already_used';
    v_message := '¡ALERTA! Este boleto ya fue canjeado el '
                 || to_char(v_order.checked_in_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || ' UTC.';
    INSERT INTO ticket_validations (order_id, event_id, staff_id, scanned_code, result, message)
    VALUES (v_order_id, p_event_id, p_staff_id, p_scanned_code, v_result, v_message);
    RETURN jsonb_build_object(
      'success', false, 'result', v_result, 'message', v_message,
      'checked_in_at', v_order.checked_in_at,
      'customer_name', v_customer_name,
      'order_id', v_order.id
    );
  END IF;

  -- 8. VALID ACCESS -> Check-in
  UPDATE orders SET checked_in_at = v_now, checked_in_by = p_staff_id WHERE id = v_order_id;
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
    'customer_name', v_customer_name,
    'checked_in_at', v_now,
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_order.total
  );
END;
$$;

REVOKE ALL ON FUNCTION validate_ticket_qr(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_ticket_qr(TEXT, UUID, UUID) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 6. Refunds: Super-Admin exclusive approval & Guest refund request support
-- ---------------------------------------------------------------------------
ALTER TABLE public.refund_requests
  ALTER COLUMN user_id DROP NOT NULL;

DROP FUNCTION IF EXISTS request_order_refund(UUID, TEXT);
DROP FUNCTION IF EXISTS request_order_refund(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION request_order_refund(
  p_order_id     UUID,
  p_reason       TEXT,
  p_access_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order      RECORD;
  v_request_id UUID;
BEGIN
  -- 1. Fetch order and ensure caller owns it (by auth.uid() OR guest access_token)
  SELECT o.*, e.event_date
  INTO v_order
  FROM orders o
  JOIN events e ON e.id = o.event_id
  WHERE o.id = p_order_id
    AND (
      (auth.uid() IS NOT NULL AND o.customer_id = auth.uid())
      OR (p_access_token IS NOT NULL AND o.access_token = p_access_token)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontró la orden o no tienes autorización.');
  END IF;

  IF v_order.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden solicitar reembolsos de órdenes confirmadas.');
  END IF;

  IF v_order.event_date < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede solicitar reembolso de un evento que ya ha comenzado o finalizado.');
  END IF;

  IF TRIM(p_reason) IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Por favor describe el motivo de tu solicitud con mayor detalle.');
  END IF;

  INSERT INTO refund_requests (
    order_id,
    user_id,
    event_id,
    amount,
    reason,
    status
  )
  VALUES (
    p_order_id,
    v_order.customer_id,
    v_order.event_id,
    v_order.total,
    TRIM(p_reason),
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe una solicitud de reembolso para esta orden.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION request_order_refund(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- Restrict process_refund_request approval/rejection exclusively to Super-Admin
CREATE OR REPLACE FUNCTION process_refund_request(
  p_request_id  UUID,
  p_approved    BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_req  RECORD;
  v_item RECORD;
BEGIN
  -- Exclusive Super-Admin authorization (platform holds centralized PayPal funds)
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Solo el Super-Admin de la plataforma puede aprobar o rechazar reembolsos.'
    );
  END IF;

  SELECT rr.*
  INTO v_req
  FROM refund_requests rr
  WHERE rr.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud de reembolso no encontrada.');
  END IF;

  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta solicitud ya ha sido procesada previamente.');
  END IF;

  IF p_approved THEN
    UPDATE refund_requests
    SET status      = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at  = NOW()
    WHERE id = p_request_id;

    UPDATE orders
    SET status     = 'refunded',
        updated_at = NOW()
    WHERE id = v_req.order_id;

    UPDATE ticket_validations
    SET result  = 'refunded',
        message = COALESCE(message, '') || ' [Orden reembolsada]'
    WHERE order_id = v_req.order_id;

    FOR v_item IN
      SELECT ticket_type_id, quantity
      FROM order_items
      WHERE order_id = v_req.order_id
    LOOP
      UPDATE ticket_types
      SET sold       = GREATEST(0, sold - v_item.quantity),
          updated_at = NOW()
      WHERE id = v_item.ticket_type_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'status', 'approved');
  ELSE
    UPDATE refund_requests
    SET status      = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at  = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION process_refund_request(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION process_refund_request(UUID, BOOLEAN, TEXT) TO authenticated, service_role;

-- Update get_all_refund_requests to include guest_email / guest_name fallback
CREATE OR REPLACE FUNCTION get_all_refund_requests()
RETURNS TABLE (
  id UUID,
  order_id UUID,
  user_id UUID,
  event_id UUID,
  amount NUMERIC,
  reason TEXT,
  status TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  customer_email TEXT,
  customer_name TEXT,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  artist_name TEXT,
  order_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF is_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT
      rr.id,
      rr.order_id,
      rr.user_id,
      rr.event_id,
      rr.amount,
      rr.reason,
      rr.status,
      rr.admin_notes,
      rr.reviewed_by,
      rr.reviewed_at,
      rr.created_at,
      COALESCE(u.email::TEXT, o.guest_email, 'Sin correo')::TEXT AS customer_email,
      COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), o.guest_name, u.email::TEXT, o.guest_email, 'Invitado')::TEXT AS customer_name,
      e.name::TEXT AS event_name,
      e.event_date,
      COALESCE(a.name, 'Artista Invitado')::TEXT AS artist_name,
      o.total AS order_total
    FROM refund_requests rr
    JOIN orders o ON o.id = rr.order_id
    JOIN events e ON e.id = rr.event_id
    LEFT JOIN artists a ON a.id = e.artist_id
    LEFT JOIN auth.users u ON u.id = rr.user_id
    LEFT JOIN public.profiles p ON p.id = rr.user_id
    ORDER BY rr.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT
      rr.id,
      rr.order_id,
      rr.user_id,
      rr.event_id,
      rr.amount,
      rr.reason,
      rr.status,
      rr.admin_notes,
      rr.reviewed_by,
      rr.reviewed_at,
      rr.created_at,
      COALESCE(u.email::TEXT, o.guest_email, 'Sin correo')::TEXT AS customer_email,
      COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), o.guest_name, u.email::TEXT, o.guest_email, 'Invitado')::TEXT AS customer_name,
      e.name::TEXT AS event_name,
      e.event_date,
      COALESCE(a.name, 'Artista Invitado')::TEXT AS artist_name,
      o.total AS order_total
    FROM refund_requests rr
    JOIN orders o ON o.id = rr.order_id
    JOIN events e ON e.id = rr.event_id
    JOIN artists a ON a.id = e.artist_id AND a.user_id = auth.uid()
    LEFT JOIN auth.users u ON u.id = rr.user_id
    LEFT JOIN public.profiles p ON p.id = rr.user_id
    ORDER BY rr.created_at DESC;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Update get_order_by_access_token to return refunded orders & refund_request
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_order_by_access_token(
  p_order_id UUID,
  p_token    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'name',        e.name,
      'title',       e.name,
      'event_date',  e.event_date,
      'flyer_url',   e.flyer_url,
      'cover_image', e.flyer_url,
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
    ),
    'refund_request', (
      SELECT jsonb_build_object(
        'id',          rr.id,
        'status',      rr.status,
        'reason',      rr.reason,
        'admin_notes', rr.admin_notes,
        'created_at',  rr.created_at,
        'reviewed_at', rr.reviewed_at
      )
      FROM refund_requests rr
      WHERE rr.order_id = o.id
      LIMIT 1
    )
  )
  INTO v_result
  FROM orders o
  JOIN events  e ON e.id = o.event_id
  JOIN artists a ON a.id = e.artist_id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE o.id           = p_order_id
    AND o.access_token = p_token
    AND o.status IN ('confirmed', 'refunded');

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Order not found or access token invalid'
      USING ERRCODE = 'P0404';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_by_access_token(UUID, TEXT) TO anon, authenticated, service_role;

