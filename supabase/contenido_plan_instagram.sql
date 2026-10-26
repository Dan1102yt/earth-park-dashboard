-- Ejecutar en: Supabase → SQL Editor (una sola vez)
-- Columnas que necesita Lu (community manager) para publicar en Instagram
ALTER TABLE contenido_plan ADD COLUMN IF NOT EXISTS ig_contenedor text;
ALTER TABLE contenido_plan ADD COLUMN IF NOT EXISTS ig_permalink text;
