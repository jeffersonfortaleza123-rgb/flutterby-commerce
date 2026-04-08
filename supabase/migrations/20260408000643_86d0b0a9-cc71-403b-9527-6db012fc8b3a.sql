
-- Storage policies for store-images bucket
CREATE POLICY "Admins can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view store images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store-images');
