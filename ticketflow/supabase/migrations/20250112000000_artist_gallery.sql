-- =============================================================================
-- TicketFlow — Migration 012: Artist Photo Gallery (gallery_urls)
-- 20250112000000_artist_gallery.sql
-- =============================================================================

-- 1. Add gallery_urls text array column to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

-- 2. Update storage policy if needed to ensure multiple photos can be uploaded by artist
-- Storage bucket 'artist-photos' is already configured in 20250106000000_storage_rls_policies.sql
