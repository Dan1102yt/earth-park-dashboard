// Datos del juego: todo el historial del plan (no solo las últimas semanas), compras y seguidores.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../compartido/lib/supabaseClient";
import { calcularJuego } from "./juego";

const mesActual = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);

/**
 * items: filas recientes de usePlan (las más frescas, pisan a las del historial)
 * cfg / guardar: configuración de la oficina (useAvatares); el juego guarda en cfg._juego
 * seguidoresHoy: número actual de seguidores de Instagram (o undefined)
 */
export function useJuego(items, cfg, guardar, seguidoresHoy, cfgListo = true) {
  const [historial, setHistorial] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("contenido_plan").select("id, semana, tipo, tema, estado, fecha_publicacion")
      .then(({ data }) => setHistorial(data || []));
  }, []);

  const datos = cfg?._juego || {};
  const compradas = datos.compradas || [];

  const filas = useMemo(() => {
    const por = new Map(historial.map((f) => [f.id, f]));
    items.forEach((f) => por.set(f.id, f));
    return [...por.values()];
  }, [historial, items]);

  const juego = useMemo(() => calcularJuego(filas, { compradas }), [filas, compradas]);

  // Seguidores: se guarda cuántos había al empezar el mes para mostrar cuántos se ganaron
  const base = datos.seguidores?.[mesActual()];
  useEffect(() => {
    if (seguidoresHoy == null || base != null || !cfg || !cfgListo) return;
    guardar({ ...cfg, _juego: { ...datos, seguidores: { ...(datos.seguidores || {}), [mesActual()]: seguidoresHoy } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seguidoresHoy, base, cfgListo]);
  const seguidores = seguidoresHoy == null ? null : { total: seguidoresHoy, delta: seguidoresHoy - (base ?? seguidoresHoy) };

  const comprar = (id) => {
    if (compradas.includes(id) || !cfgListo) return;
    guardar({ ...cfg, _juego: { ...datos, compradas: [...compradas, id] } });
  };

  return { juego, filas, compradas, comprar, seguidores };
}
