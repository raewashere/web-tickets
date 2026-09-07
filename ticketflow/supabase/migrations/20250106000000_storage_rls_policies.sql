-- =============================================================================
-- TicketFlow — Storage RLS Policies for Buckets
-- 20250106000000_storage_rls_policies.sql
-- =============================================================================

-- Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. BUCKET: artist-photos
-- -----------------------------------------------------------------------------

-- Public can view artist photos
DROP POLICY IF EXISTS "Public read artist-photos" ON storage.objects;
CREATE POLICY "Public read artist-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-photos');

-- Authenticated users can upload to artist-photos
DROP POLICY IF EXISTS "Auth upload artist-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload to own artist-photos folder" ON storage.objects;
CREATE POLICY "Auth upload artist-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artist-photos' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update (needed for upsert: true)
DROP POLICY IF EXISTS "Auth update artist-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner update artist-photos" ON storage.objects;
CREATE POLICY "Auth update artist-photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artist-photos' 
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'artist-photos' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete from artist-photos
DROP POLICY IF EXISTS "Auth delete artist-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete artist-photos" ON storage.objects;
CREATE POLICY "Auth delete artist-photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artist-photos' 
    AND auth.role() = 'authenticated'
  );

-- -----------------------------------------------------------------------------
-- 2. BUCKET: event-flyers
-- -----------------------------------------------------------------------------

-- Public can view event flyers
DROP POLICY IF EXISTS "Public read event-flyers" ON storage.objects;
CREATE POLICY "Public read event-flyers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-flyers');

-- Authenticated users can upload event flyers
DROP POLICY IF EXISTS "Auth upload event-flyers" ON storage.objects;
CREATE POLICY "Auth upload event-flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-flyers' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update event flyers (upsert: true)
DROP POLICY IF EXISTS "Auth update event-flyers" ON storage.objects;
CREATE POLICY "Auth update event-flyers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-flyers' 
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'event-flyers' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete event flyers
DROP POLICY IF EXISTS "Auth delete event-flyers" ON storage.objects;
CREATE POLICY "Auth delete event-flyers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-flyers' 
    AND auth.role() = 'authenticated'
  );

-- -----------------------------------------------------------------------------
-- 3. BUCKET: venue-maps
-- -----------------------------------------------------------------------------

-- Public can view venue maps
DROP POLICY IF EXISTS "Public read venue-maps" ON storage.objects;
CREATE POLICY "Public read venue-maps"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-maps');

-- Authenticated users can upload venue maps
DROP POLICY IF EXISTS "Auth upload venue-maps" ON storage.objects;
CREATE POLICY "Auth upload venue-maps"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-maps' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update venue maps (upsert: true)
DROP POLICY IF EXISTS "Auth update venue-maps" ON storage.objects;
CREATE POLICY "Auth update venue-maps"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'venue-maps' 
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'venue-maps' 
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete venue maps
DROP POLICY IF EXISTS "Auth delete venue-maps" ON storage.objects;
CREATE POLICY "Auth delete venue-maps"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'venue-maps' 
    AND auth.role() = 'authenticated'
  );
