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

-- Aprobar o desaprobar una foto desde el dashboard.
-- Con RLS, el upsert/update directo fallaba al pasar una fila a
-- aprobada=false (deja de ser visible para la policy de SELECT) y al
-- volver a aprobar una fila desaprobada (ON CONFLICT no la ve).
-- Esta función corre con los permisos de su dueño y evita ese problema
-- sin abrir la lectura de las fotos no aprobadas a la web pública.
-- Es seguro volver a ejecutar este bloque.
CREATE OR REPLACE FUNCTION public.set_foto_publica(
  p_drive_file_id  text,
  p_nombre         text,
  p_categoria      text,
  p_url_miniatura  text,
  p_url_completa   text,
  p_aprobada       boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO fotos_publicas_web
    (drive_file_id, nombre, categoria, url_miniatura, url_completa, aprobada)
  VALUES
    (p_drive_file_id, p_nombre, p_categoria, p_url_miniatura, p_url_completa, p_aprobada)
  ON CONFLICT (drive_file_id) DO UPDATE SET
    nombre        = COALESCE(EXCLUDED.nombre, fotos_publicas_web.nombre),
    categoria     = COALESCE(EXCLUDED.categoria, fotos_publicas_web.categoria),
    url_miniatura = COALESCE(EXCLUDED.url_miniatura, fotos_publicas_web.url_miniatura),
    url_completa  = COALESCE(EXCLUDED.url_completa, fotos_publicas_web.url_completa),
    aprobada      = EXCLUDED.aprobada;
END;
$$;

REVOKE ALL ON FUNCTION public.set_foto_publica(text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_foto_publica(text, text, text, text, text, boolean) TO anon, authenticated;
