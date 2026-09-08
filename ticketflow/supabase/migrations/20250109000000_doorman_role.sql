-- =============================================================================
-- TicketFlow — Migration 009: Doorman Role & Event Staff Management
-- 20250109000000_doorman_role.sql
-- =============================================================================

-- 1. Add 'doorman' to role_type enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'role_type'::regtype AND enumlabel = 'doorman'
  ) THEN
    ALTER TYPE role_type ADD VALUE 'doorman';
  END IF;
END$$;

-- 2. Table: event_staff — assigns doormen to specific events
CREATE TABLE IF NOT EXISTS event_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Ensure a doorman can only be ACTIVELY assigned to ONE event at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_staff_one_active_per_user
  ON event_staff (user_id)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id  ON event_staff(user_id);

-- 3. Table: staff_invitations — pending email invitations
CREATE TABLE IF NOT EXISTS staff_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token    ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_event_id ON staff_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email    ON staff_invitations(email);

-- 4. Triggers for updated_at
DROP TRIGGER IF EXISTS trg_event_staff_updated_at ON event_staff;
CREATE TRIGGER trg_event_staff_updated_at
  BEFORE UPDATE ON event_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS for event_staff
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doorman reads own assignment" ON event_staff;
CREATE POLICY "Doorman reads own assignment" ON event_staff
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Artist reads own event staff" ON event_staff;
CREATE POLICY "Artist reads own event staff" ON event_staff
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artist manages own event staff" ON event_staff;
CREATE POLICY "Artist manages own event staff" ON event_staff
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin manages all event staff" ON event_staff;
CREATE POLICY "Admin manages all event staff" ON event_staff
  FOR ALL USING (has_role('admin'));

-- 6. RLS for staff_invitations
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artist manages own invitations" ON staff_invitations;
CREATE POLICY "Artist manages own invitations" ON staff_invitations
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN artists a ON a.id = e.artist_id
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin manages all invitations" ON staff_invitations;
CREATE POLICY "Admin manages all invitations" ON staff_invitations
  FOR ALL USING (has_role('admin'));

DROP POLICY IF EXISTS "Anyone reads invitation by token" ON staff_invitations;
CREATE POLICY "Anyone reads invitation by token" ON staff_invitations
  FOR SELECT USING (true);

-- 7. Ticket validations: allow doorman assigned to the event
DROP POLICY IF EXISTS "Staff insert validations" ON ticket_validations;
CREATE POLICY "Staff insert validations" ON ticket_validations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      has_role('admin')
      OR has_role('artist')
      OR EXISTS (
        SELECT 1 FROM event_staff
        WHERE event_id = ticket_validations.event_id
          AND user_id = auth.uid()
          AND status = 'accepted'
      )
    )
  );

-- 8. Helper function: get doorman's assigned event id
CREATE OR REPLACE FUNCTION get_doorman_event_id() RETURNS UUID AS $$
  SELECT event_id FROM event_staff
  WHERE user_id = auth.uid() AND status = 'accepted'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_doorman_event_id() TO authenticated;
