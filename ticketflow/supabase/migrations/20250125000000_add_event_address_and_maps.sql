-- =============================================================================
-- TicketFlow — Migration 025: Add address and coordinates to events and venues
-- 20250125000000_add_event_address_and_maps.sql
-- =============================================================================

-- 1. Add address, latitude, and longitude columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 2. Add address column to venues table if missing
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Create index for address search
CREATE INDEX IF NOT EXISTS idx_events_address ON events USING gin(to_tsvector('spanish', coalesce(address, '')));
CREATE INDEX IF NOT EXISTS idx_venues_address ON venues USING gin(to_tsvector('spanish', coalesce(address, '')));

-- 4. Update search_published_events function to also search by event address and venue address
-- NOTE: Postgres requires dropping the function first when changing the OUT parameters / return table signature
DROP FUNCTION IF EXISTS search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_published_events(
  p_query      TEXT DEFAULT NULL,
  p_type_id    UUID DEFAULT NULL,
  p_date_from  TIMESTAMPTZ DEFAULT now(),
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
  status                 event_status,
  artist_name            TEXT,
  artist_photo_url       TEXT,
  venue_name             TEXT,
  address                TEXT,
  latitude               NUMERIC,
  longitude              NUMERIC,
  total_count            BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
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
    e.status,
    a.name AS artist_name,
    a.photo_url AS artist_photo_url,
    v.name AS venue_name,
    COALESCE(e.address, v.address) AS address,
    COALESCE(e.latitude, v.latitude) AS latitude,
    COALESCE(e.longitude, v.longitude) AS longitude,
    COUNT(*) OVER() AS total_count
  FROM events e
  JOIN artists a ON a.id = e.artist_id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE
    e.status = 'published'
    AND (p_date_from IS NULL OR e.event_date >= p_date_from)
    AND (p_date_to   IS NULL OR e.event_date <= p_date_to)
    AND (p_type_id   IS NULL OR e.event_type_id = p_type_id)
    AND (
      p_query IS NULL OR p_query = ''
      OR e.name        ILIKE '%' || p_query || '%'
      OR a.name        ILIKE '%' || p_query || '%'
      OR e.description ILIKE '%' || p_query || '%'
      OR e.address     ILIKE '%' || p_query || '%'
      OR v.name        ILIKE '%' || p_query || '%'
      OR v.address     ILIKE '%' || p_query || '%'
    )
  ORDER BY
    CASE WHEN p_sort = 'date_desc' THEN e.event_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'name_asc'  THEN e.name       END ASC  NULLS LAST,
    e.event_date ASC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT) TO anon, authenticated, service_role;
