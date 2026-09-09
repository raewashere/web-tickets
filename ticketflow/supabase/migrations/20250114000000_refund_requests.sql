-- =============================================================================
-- TicketFlow — Migration 014: Refund Requests System (Post-Venta)
-- 20250114000000_refund_requests.sql
-- =============================================================================

-- 1. Create table refund_requests
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_id UUID NOT NULL REFERENCES events(id),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_order_refund UNIQUE (order_id)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_event_id ON refund_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);

-- 2. Row Level Security Policies
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refund requests"
  ON refund_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Artists can view refund requests for their events"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE e.id = refund_requests.event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to refund requests"
  ON refund_requests FOR ALL
  USING (is_admin(auth.uid()));

-- 3. RPC: Customer requests refund for a confirmed order
CREATE OR REPLACE FUNCTION request_order_refund(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order RECORD;
  v_request_id UUID;
BEGIN
  -- 1. Fetch order and ensure it belongs to caller
  SELECT o.*, e.event_date
  INTO v_order
  FROM orders o
  JOIN events e ON e.id = o.event_id
  WHERE o.id = p_order_id AND o.customer_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontró la orden o no te pertenece.');
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

  -- 2. Insert refund request
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
    auth.uid(),
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

-- 4. RPC: Process (Approve or Reject) refund request
CREATE OR REPLACE FUNCTION process_refund_request(
  p_request_id UUID,
  p_approved BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_req RECORD;
  v_is_authorized BOOLEAN := FALSE;
  v_item RECORD;
BEGIN
  -- 1. Fetch request
  SELECT rr.*, e.artist_id, a.user_id AS artist_user_id
  INTO v_req
  FROM refund_requests rr
  JOIN events e ON e.id = rr.event_id
  LEFT JOIN artists a ON a.id = e.artist_id
  WHERE rr.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud de reembolso no encontrada.');
  END IF;

  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta solicitud ya ha sido procesada previamente.');
  END IF;

  -- 2. Check authorization: Admin or Artist owner
  IF is_admin(auth.uid()) OR (v_req.artist_user_id = auth.uid()) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para procesar esta solicitud de reembolso.');
  END IF;

  -- 3. If APPROVED:
  IF p_approved THEN
    -- Update refund request
    UPDATE refund_requests
    SET status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Update order status to 'refunded'
    UPDATE orders
    SET status = 'refunded',
        updated_at = NOW()
    WHERE id = v_req.order_id;

    -- Invalidate ticket validations if any
    UPDATE ticket_validations
    SET result = 'refunded',
        message = COALESCE(message, '') || ' [Orden reembolsada]'
    WHERE order_id = v_req.order_id;

    -- Return ticket stock to ticket_types
    FOR v_item IN
      SELECT ticket_type_id, quantity
      FROM order_items
      WHERE order_id = v_req.order_id
    LOOP
      UPDATE ticket_types
      SET sold = GREATEST(0, sold - v_item.quantity),
          updated_at = NOW()
      WHERE id = v_item.ticket_type_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'status', 'approved');
  ELSE
    -- If REJECTED:
    UPDATE refund_requests
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$;

-- 5. RPC: Get all refund requests with full relations (for Admin / Artists)
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
    -- Super-Admin sees all
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
      u.email::TEXT AS customer_email,
      COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), u.email)::TEXT AS customer_name,
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
    -- Artist sees only their events
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
      u.email::TEXT AS customer_email,
      COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), u.email)::TEXT AS customer_name,
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
