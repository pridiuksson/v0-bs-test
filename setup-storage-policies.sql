-- Create RLS policies for the nine-picture-grid-images bucket
BEGIN;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for reading objects (public access)
CREATE POLICY "Public Access for nine-picture-grid-images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'nine-picture-grid-images');

-- Policy for inserting objects (authenticated users only)
CREATE POLICY "Authenticated users can upload to nine-picture-grid-images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'nine-picture-grid-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy for updating objects (authenticated users only)
CREATE POLICY "Authenticated users can update objects in nine-picture-grid-images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'nine-picture-grid-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy for deleting objects (authenticated users only)
CREATE POLICY "Authenticated users can delete objects in nine-picture-grid-images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'nine-picture-grid-images' AND
    auth.uid() IS NOT NULL
  );

COMMIT;

