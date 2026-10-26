-- Ejecutar en: Supabase → SQL Editor
-- Plan de contenido de la Oficina IA (/marketing/oficina)
-- Cada fila es una publicación propuesta por el Estratega. Nada se produce ni se publica sin tu aprobación.
--
-- estado:  propuesta → aprobada → en_produccion → lista → programada → publicada
--          (o descartada en cualquier momento)

CREATE TABLE IF NOT EXISTS contenido_plan (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  semana            date        NOT NULL,              -- lunes de la semana del plan
  tipo              text        NOT NULL,              -- reel | carrusel | historia
  tema              text        NOT NULL,
  propuesta         jsonb       NOT NULL DEFAULT '{}', -- gancho, por qué, pilar, detalle...
  comentarios       jsonb       NOT NULL DEFAULT '[]', -- conversación de la reunión [{de, texto, at}]
  fecha_publicacion timestamptz,
  estado            text        NOT NULL DEFAULT 'propuesta',
  resultado_id      uuid,                              -- fila de marketing_agente (carrusel o video)
  media_urls        jsonb       NOT NULL DEFAULT '[]', -- archivos finales para publicar
  caption           text,
  ig_media_id       text,                              -- id de la publicación en Instagram
  error             text,
  creado_at         timestamptz NOT NULL DEFAULT now(),
  actualizado_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contenido_plan_semana ON contenido_plan (semana);
CREATE INDEX IF NOT EXISTS contenido_plan_estado ON contenido_plan (estado, fecha_publicacion);

ALTER TABLE contenido_plan ENABLE ROW LEVEL SECURITY;

-- Igual que las demás tablas del dashboard: la seguridad real la da el login del dashboard
CREATE POLICY "anon_full_access" ON contenido_plan
  FOR ALL
  USING (true)
  WITH CHECK (true);
