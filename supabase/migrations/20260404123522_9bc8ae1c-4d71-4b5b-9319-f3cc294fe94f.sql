
-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Court managers can delete their court photos" ON storage.objects;
DROP POLICY IF EXISTS "Court managers can update their court photos" ON storage.objects;

-- Recreate DELETE policy with venue ownership check
-- Files are stored at courts/<filename> or equipment/<filename>
-- Since paths don't encode ownership, we restrict to venue owners who have courts
CREATE POLICY "Venue owners can delete court photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'court-photos'
  AND auth.role() = 'authenticated'
  AND (
    -- User is a venue owner (has at least one venue)
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
    )
    OR
    -- User is venue staff
    public.is_staff_of_owner(auth.uid())
  )
);

-- Recreate UPDATE policy with venue ownership check
CREATE POLICY "Venue owners can update court photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'court-photos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.owner_id = auth.uid()
    )
    OR
    public.is_staff_of_owner(auth.uid())
  )
);
