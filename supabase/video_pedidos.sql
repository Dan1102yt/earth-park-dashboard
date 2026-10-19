-- Ejecutar en: Supabase → SQL Editor
-- Editor de video: pedidos que crea el dashboard y procesa el editor local (video-engine/scripts/servidor.mjs)
-- + bucket público "videos" para borradores y videos finales.

CREATE TABLE IF NOT EXISTS video_pedidos (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  creado_en        timestamptz  NOT NULL DEFAULT now(),
  actualizado_en   timestamptz  NOT NULL DEFAULT now(),
  titulo           text,
  carpeta_drive_id text         NOT NULL,         -- subcarpeta de CONTENIDO con el video y fotos del pedido
  carpeta_nombre   text,
  descripcion      text,                           -- cómo quiere David que quede el video
  -- pendiente → procesando → borrador_listo → (revision_pedida → procesando → borrador_listo)*
  --           → final_pedido → renderizando_final → listo        | error en cualquier punto
  estado           text         NOT NULL DEFAULT 'pendiente',
  progreso         text,                           -- paso actual, en lenguaje humano
  revisiones       jsonb        NOT NULL DEFAULT '[]'::jsonb,  -- [{texto, creado_en, respuesta}]
  resumen          text,                           -- qué decidió el editor y por qué
  borrador_url     text,
  final_url        text,
  edl              jsonb,
  costo_usd        numeric(10,4) NOT NULL DEFAULT 0,
  error            text
);

CREATE INDEX IF NOT EXISTS video_pedidos_estado_idx ON video_pedidos (estado, creado_en);

ALTER TABLE video_pedidos ENABLE ROW LEVEL SECURITY;

-- Mismo modelo que chat_historial.sql: la seguridad la da el login de la app (no hay Supabase Auth).
CREATE POLICY "video_pedidos_select" ON video_pedidos FOR SELECT USING (true);
CREATE POLICY "video_pedidos_insert" ON video_pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "video_pedidos_update" ON video_pedidos FOR UPDATE USING (true) WITH CHECK (true);

-- Bucket público para los MP4 (límite del plan gratis: 50 MB por archivo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "videos_lectura" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "videos_subida"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "videos_reemplazo" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
