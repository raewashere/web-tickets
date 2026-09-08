-- =============================================================================
-- TicketFlow — Migration 008: Full-text event search including artist name
-- 20250108000000_search_events_function.sql
-- =============================================================================

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
    )
  ORDER BY
    CASE WHEN p_sort = 'date_desc' THEN e.event_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'name_asc'  THEN e.name       END ASC  NULLS LAST,
    e.event_date ASC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_published_events(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT) TO anon, authenticated, service_role;
