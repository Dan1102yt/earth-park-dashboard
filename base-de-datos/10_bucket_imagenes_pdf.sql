-- Ejecutar en: Supabase → SQL Editor
-- El bucket "videos" solo aceptaba MP4 y JPG. Las cotizaciones necesitan también PNG (logos),
-- WEBP (fotos) y PDF (la propuesta). No borra ni cambia ningún archivo: solo amplía los tipos permitidos.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'videos';
