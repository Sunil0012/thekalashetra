
DROP POLICY IF EXISTS "lot-images public read" ON storage.objects;
CREATE POLICY "lot-images public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'lot-images');

DROP POLICY IF EXISTS "lot-images auth upload" ON storage.objects;
CREATE POLICY "lot-images auth upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lot-images');

DROP POLICY IF EXISTS "lot-images auth update" ON storage.objects;
CREATE POLICY "lot-images auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'lot-images') WITH CHECK (bucket_id = 'lot-images');

DROP POLICY IF EXISTS "lot-images auth delete" ON storage.objects;
CREATE POLICY "lot-images auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'lot-images');
