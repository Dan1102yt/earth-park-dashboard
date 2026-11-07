-- Ejecutar en: Supabase → SQL Editor (una sola vez)
-- Columnas para que Lu mande las publicaciones a la bandeja de TikTok
ALTER TABLE contenido_plan ADD COLUMN IF NOT EXISTS tiktok_estado text;      -- null | bandeja | error
ALTER TABLE contenido_plan ADD COLUMN IF NOT EXISTS tiktok_publish_id text;
ALTER TABLE contenido_plan ADD COLUMN IF NOT EXISTS tiktok_error text;
