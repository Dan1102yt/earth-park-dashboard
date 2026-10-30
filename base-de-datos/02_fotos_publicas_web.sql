-- Ejecutar en: Supabase → SQL Editor
-- Fotos de Drive curadas para publicación en earthpark-web (sitio público)

CREATE TABLE IF NOT EXISTS fotos_publicas_web (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_file_id  text         NOT NULL UNIQUE,
  nombre         text,
  categoria      text,
  url_miniatura  text,
  url_completa   text,
  aprobada       boolean      NOT NULL DEFAULT false,
  creado_en      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE fotos_publicas_web ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo fotos aprobadas (earthpark-web las consume así;
-- el dashboard de curación también usa esta misma policy para saber
-- qué fotos ya están aprobadas, ya que no le interesan las desaprobadas).
CREATE POLICY "fotos_publicas_web_select_aprobadas" ON fotos_publicas_web
  FOR SELECT
  USING (aprobada = true);

-- Escritura: el dashboard de curación exige login (tabla `usuarios`)
-- antes de llegar a esta pantalla, igual que el resto del dashboard
-- (mismo modelo que chat_historial.sql: la seguridad real la da el
-- login de la app, no hay Supabase Auth en este proyecto).
CREATE POLICY "fotos_publicas_web_dashboard_insert" ON fotos_publicas_web
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "fotos_publicas_web_dashboard_update" ON fotos_publicas_web
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
