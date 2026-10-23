-- Ejecutar en: Supabase → SQL Editor
-- Historial de lo que genera el Agente de marketing (/marketing/agente)

CREATE TABLE IF NOT EXISTS marketing_agente (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  modo       text        NOT NULL,              -- carrusel | historias | estrategia
  tema       text,
  resultado  jsonb       NOT NULL,              -- objeto JSON o {"markdown": "..."}
  creado_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketing_agente ENABLE ROW LEVEL SECURITY;

-- Igual que chat_historial: la clave anon puede leer y escribir
-- (la seguridad real la da el login del dashboard)
CREATE POLICY "anon_full_access" ON marketing_agente
  FOR ALL
  USING (true)
  WITH CHECK (true);
