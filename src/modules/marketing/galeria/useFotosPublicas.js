import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

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

  async function aprobar(foto, categoria) {
    if (!supabase) return { error: "Sin conexión a base de datos" };
    const { error: err } = await supabase.from(TABLE).upsert(
      {
        drive_file_id: foto.id,
        nombre: foto.nombre,
        categoria,
        url_miniatura: foto.urlMiniatura,
        url_completa: foto.urlCompleta,
        aprobada: true,
      },
      { onConflict: "drive_file_id" }
    );
    if (err) return { error: err.message };
    setAprobadas((prev) => new Map(prev).set(foto.id, categoria));
    return { ok: true };
  }

  async function desaprobar(foto) {
    if (!supabase) return { error: "Sin conexión a base de datos" };
    const { error: err } = await supabase
      .from(TABLE)
      .update({ aprobada: false })
      .eq("drive_file_id", foto.id);
    if (err) return { error: err.message };
    setAprobadas((prev) => {
      const next = new Map(prev);
      next.delete(foto.id);
      return next;
    });
    return { ok: true };
  }

  async function toggle(foto, categoria) {
    return aprobadas.has(foto.id) ? desaprobar(foto) : aprobar(foto, categoria);
  }

  return { aprobadas, loading, error, toggle };
}
