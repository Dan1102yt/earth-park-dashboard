-- Ejecutar en: Supabase → SQL Editor
-- Crea la tabla de historial del chat del asistente IA

CREATE TABLE IF NOT EXISTS chat_historial (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario        text         NOT NULL,
  mensajes       jsonb        NOT NULL DEFAULT '[]'::jsonb,
  actualizado_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chat_historial_usuario_unique UNIQUE (usuario)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE chat_historial ENABLE ROW LEVEL SECURITY;

-- Política permisiva: la clave anon puede leer y escribir
-- (la seguridad real la da el login del dashboard)
CREATE POLICY "anon_full_access" ON chat_historial
  FOR ALL
  USING (true)
  WITH CHECK (true);
