import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../compartido/lib/supabaseClient";

const TABLE = "fotos_publicas_web";

// Mapa drive_file_id -> categoria, solo de fotos actualmente aprobadas.
export function useFotosPublicas() {
  const [aprobadas, setAprobadas] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(TABLE)
      .select("drive_file_id, categoria")
      .eq("aprobada", true);
    if (err) setError(err.message);
    else setAprobadas(new Map(data.map((f) => [f.drive_file_id, f.categoria])));
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Usa la función set_foto_publica (SECURITY DEFINER) en vez de upsert/update
  // directo: con RLS, la fila desaprobada deja de ser visible y el cambio fallaba.
  async function toggle(foto, categoria) {
    if (!supabase) return { error: "Sin conexión a base de datos" };
    const aprobar = !aprobadas.has(foto.id);
    const { error: err } = await supabase.rpc("set_foto_publica", {
      p_drive_file_id: foto.id,
      p_nombre: foto.nombre,
      p_categoria: categoria,
      p_url_miniatura: foto.urlMiniatura,
      p_url_completa: foto.urlCompleta,
      p_aprobada: aprobar,
    });
    if (err) return { error: err.message };
    setAprobadas((prev) => {
      const next = new Map(prev);
      if (aprobar) next.set(foto.id, categoria);
      else next.delete(foto.id);
      return next;
    });
    return { ok: true };
  }

  return { aprobadas, loading, error, toggle };
}
