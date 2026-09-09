-- =============================================================================
-- TicketFlow - Migration 019: Meta Pixel ID per Artist
-- =============================================================================
-- Adds an optional meta_pixel_id column to the artists table.
-- Artists can configure their own Meta (Facebook) Pixel ID from their Admin
-- profile. The Store app reads this value and injects the pixel dynamically
-- on event detail pages, firing ViewContent, InitiateCheckout, and Purchase
-- events so artists can measure conversions from their social media campaigns.
-- =============================================================================

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;

COMMENT ON COLUMN artists.meta_pixel_id IS
  'Optional Meta (Facebook) Pixel ID (15-16 digit string). When set, the Store
   app will load this pixel on event pages belonging to the artist and fire
   standard conversion events (ViewContent, InitiateCheckout, Purchase).';
