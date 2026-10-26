// Plan de contenido (tabla contenido_plan en Supabase): leer, crear, actualizar.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TABLA = "contenido_plan";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lunes (YYYY-MM-DD, hora de Colombia) de la semana de una fecha. */
export function lunesDe(fecha = new Date()) {
  const d = new Date(fecha.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes = 0
  return ymd(d);
}

/** Lunes de la semana siguiente. */
export function lunesSiguiente(fecha = new Date()) {
  const [y, m, dd] = lunesDe(fecha).split("-").map(Number);
  return ymd(new Date(y, m - 1, dd + 7));
}

export const ESTADOS = {
  propuesta: { texto: "Por aprobar", color: "#fbbf24" },
  aprobada: { texto: "Aprobada", color: "#34d399" },
  en_produccion: { texto: "En producción", color: "#60a5fa" },
  lista: { texto: "Lista", color: "#a78bfa" },
  programada: { texto: "Programada", color: "#f472b6" },
  publicada: { texto: "Publicada", color: "#a3e635" },
  descartada: { texto: "Descartada", color: "#6b7280" },
};

export function usePlan() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    if (!supabase) { setCargando(false); setError("Supabase no está configurado"); return; }
    const desde = new Date(); desde.setDate(desde.getDate() - 35);
    const { data, error: err } = await supabase
      .from(TABLA).select("*")
      .gte("semana", ymd(desde))
      .order("fecha_publicacion", { ascending: true, nullsFirst: false });
    if (err) setError(err.message.includes("does not exist") || err.code === "42P01"
      ? "Falta crear la tabla contenido_plan en Supabase (archivo supabase/contenido_plan.sql)."
      : err.message);
    else { setItems(data || []); setError(null); }
    setCargando(false);
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const crear = useCallback(async (filas) => {
    if (!supabase) return [];
    const { data, error: err } = await supabase.from(TABLA).insert(filas).select();
    if (err) throw new Error(err.message);
    setItems((p) => [...p, ...(data || [])]);
    return data || [];
  }, []);

  const actualizar = useCallback(async (id, cambios) => {
    if (!supabase) return;
    const fila = { ...cambios, actualizado_at: new Date().toISOString() };
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...fila } : i)));
    const { error: err } = await supabase.from(TABLA).update(fila).eq("id", id);
    if (err) throw new Error(err.message);
  }, []);

  return { items, cargando, error, recargar, crear, actualizar };
}

/** Para las páginas de producción: marcar la publicación del plan con lo que se produjo. */
export async function marcarPlan(id, cambios) {
  if (!supabase || !id) return;
  const { error } = await supabase.from(TABLA)
    .update({ ...cambios, actualizado_at: new Date().toISOString() }).eq("id", id);
  if (error) console.warn("[plan] marcar:", error.message);
}
