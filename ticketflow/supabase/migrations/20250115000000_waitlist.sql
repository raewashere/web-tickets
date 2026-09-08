-- =============================================================================
-- TicketFlow — Migration 015: Waitlist System for Sold-Out Events
-- 20250115000000_waitlist.sql
-- =============================================================================

-- 1. Create table waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'purchased', 'cancelled')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying & queue sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_event_id ON waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_ticket_type_id ON waitlist(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_queue ON waitlist(event_id, status, created_at ASC);

-- Partial unique index: only 1 pending entry per (event_id, email, ticket_type_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_pending_entry 
  ON waitlist(event_id, email, COALESCE(ticket_type_id, '00000000-0000-0000-0000-000000000000'::UUID))
  WHERE status = 'pending';

-- 2. Row Level Security Policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist entries"
  ON waitlist FOR SELECT
  USING (
    auth.uid() = user_id OR 
    (auth.uid() IS NOT NULL AND email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
  );

CREATE POLICY "Anyone can insert into waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    LENGTH(TRIM(email)) > 3 AND email LIKE '%@%'
  );

CREATE POLICY "Artists can view waitlist for their events"
  ON waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE e.id = waitlist.event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can update waitlist status for their events"
  ON waitlist FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE e.id = waitlist.event_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to waitlist"
  ON waitlist FOR ALL
  USING (is_admin(auth.uid()));

-- 3. RPC: Join event waitlist
CREATE OR REPLACE FUNCTION join_event_waitlist(
  p_event_id UUID,
  p_ticket_type_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event RECORD;
  v_email TEXT;
  v_user_id UUID := auth.uid();
  v_waitlist_id UUID;
BEGIN
  -- Determine email from caller or parameter
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;

  IF v_email IS NULL OR TRIM(v_email) = '' THEN
    v_email := LOWER(TRIM(p_email));
  END IF;

  IF v_email IS NULL OR v_email NOT LIKE '%@%.%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ingresa un correo electrónico válido.');
  END IF;

  -- Verify event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El evento no existe.');
  END IF;

  IF v_event.event_date < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'No es posible unirse a la lista de espera de un evento pasado.');
  END IF;

  -- Insert entry
  INSERT INTO waitlist (
    event_id,
    ticket_type_id,
    user_id,
    email,
    phone_number,
    status
  )
  VALUES (
    p_event_id,
    p_ticket_type_id,
    v_user_id,
    v_email,
    TRIM(p_phone),
    'pending'
  )
  RETURNING id INTO v_waitlist_id;

  RETURN jsonb_build_object(
    'success', true,
    'waitlist_id', v_waitlist_id,
    'message', 'Te has unido exitosamente a la lista de espera. Te notificaremos al liberarse boletos.'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_registered', true,
      'message', 'Ya estás registrado en la lista de espera para este evento.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. RPC: Get event waitlist with relations (for Admin / Organizers)
CREATE OR REPLACE FUNCTION get_event_waitlist(
  p_event_id UUID
)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  ticket_type_id UUID,
  ticket_type_name TEXT,
  user_id UUID,
  user_display_name TEXT,
  email TEXT,
  phone_number TEXT,
  status TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Verify permission: admin or event artist
  IF is_admin(auth.uid()) THEN
    v_is_authorized := TRUE;
  ELSE
    SELECT TRUE INTO v_is_authorized
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    WHERE e.id = p_event_id AND a.user_id = auth.uid();
  END IF;

  IF NOT COALESCE(v_is_authorized, FALSE) THEN
    RAISE EXCEPTION 'No tienes autorización para ver la lista de espera de este evento.';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.event_id,
    w.ticket_type_id,
    COALESCE(tt.name, 'Cualquier localidad')::TEXT AS ticket_type_name,
    w.user_id,
    COALESCE(p.display_name, (u.raw_user_meta_data->>'full_name'), split_part(w.email, '@', 1))::TEXT AS user_display_name,
    w.email,
    w.phone_number,
    w.status,
    w.notified_at,
    w.created_at
  FROM waitlist w
  LEFT JOIN ticket_types tt ON tt.id = w.ticket_type_id
  LEFT JOIN auth.users u ON u.id = w.user_id
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE w.event_id = p_event_id
  ORDER BY w.created_at ASC;
END;
$$;

-- 5. RPC: Notify / Batch release for event waitlist
CREATE OR REPLACE FUNCTION notify_event_waitlist(
  p_event_id UUID,
  p_ticket_type_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  ticket_type_name TEXT,
  created_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Verify permission: admin or event artist
  IF is_admin(auth.uid()) THEN
    v_is_authorized := TRUE;
  ELSE
    SELECT TRUE INTO v_is_authorized
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    WHERE e.id = p_event_id AND a.user_id = auth.uid();
  END IF;

  IF NOT COALESCE(v_is_authorized, FALSE) THEN
    RAISE EXCEPTION 'No tienes autorización para notificar la lista de espera de este evento.';
  END IF;

  -- Update top N pending entries to 'notified'
  RETURN QUERY
  WITH to_notify AS (
    SELECT w.id
    FROM waitlist w
    WHERE w.event_id = p_event_id
      AND w.status = 'pending'
      AND (p_ticket_type_id IS NULL OR w.ticket_type_id IS NULL OR w.ticket_type_id = p_ticket_type_id)
    ORDER BY w.created_at ASC
    LIMIT GREATEST(1, LEAST(p_limit, 100))
    FOR UPDATE
  ),
  updated AS (
    UPDATE waitlist w
    SET status = 'notified',
        notified_at = NOW(),
        updated_at = NOW()
    FROM to_notify tn
    WHERE w.id = tn.id
    RETURNING w.id, w.email, w.ticket_type_id, w.created_at, w.notified_at
  )
  SELECT
    u.id,
    u.email,
    COALESCE(tt.name, 'Cualquier localidad')::TEXT AS ticket_type_name,
    u.created_at,
    u.notified_at
  FROM updated u
  LEFT JOIN ticket_types tt ON tt.id = u.ticket_type_id;
END;
$$;

-- 6. RPC: Customer get my waitlist entries
CREATE OR REPLACE FUNCTION get_my_waitlist()
RETURNS TABLE (
  id UUID,
  event_id UUID,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  flyer_url TEXT,
  venue_name TEXT,
  artist_name TEXT,
  ticket_type_name TEXT,
  status TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.event_id,
    e.name::TEXT AS event_name,
    e.event_date,
    e.flyer_url::TEXT,
    v.name::TEXT AS venue_name,
    a.name::TEXT AS artist_name,
    COALESCE(tt.name, 'Cualquier localidad')::TEXT AS ticket_type_name,
    w.status,
    w.notified_at,
    w.created_at
  FROM waitlist w
  JOIN events e ON e.id = w.event_id
  LEFT JOIN venues v ON v.id = e.venue_id
  LEFT JOIN artists a ON a.id = e.artist_id
  LEFT JOIN ticket_types tt ON tt.id = w.ticket_type_id
  WHERE w.user_id = auth.uid() OR w.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ORDER BY w.created_at DESC;
END;
$$;
