
-- Create storage bucket "antecedentes" (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('antecedentes', 'antecedentes', false);

-- Policy: owner can upload files to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'antecedentes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: owner can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'antecedentes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Policy: owner can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'antecedentes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: owner can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'antecedentes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
