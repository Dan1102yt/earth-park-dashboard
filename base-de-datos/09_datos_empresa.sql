-- Ejecutar en: Supabase → SQL Editor
-- Datos de Earth Park que salen en las propuestas: medios de pago, redes y logos (Precios → Empresa).
-- Los números de cuenta se cargan con privado/09_datos_empresa.sql (no se sube a GitHub).

CREATE TABLE IF NOT EXISTS datos_empresa (
  id             text        PRIMARY KEY DEFAULT 'principal',
  datos          jsonb       NOT NULL DEFAULT '{}',   -- { pagos, contacto, logos }
  actualizado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE datos_empresa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_full_access" ON datos_empresa;
CREATE POLICY "anon_full_access" ON datos_empresa FOR ALL USING (true) WITH CHECK (true);
