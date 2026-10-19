import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TABLE = "video_pedidos";
export const ESTADOS_ACTIVOS = ["pendiente", "procesando", "revision_pedida", "final_pedido", "renderizando_final"];

// Pedidos del editor de video. El editor local (video-engine/scripts/servidor.mjs) los procesa
// y va actualizando estado/progreso; aquí se consulta cada pocos segundos mientras haya trabajo.
export function useVideoPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!supabase) {
      setError("Supabase no está configurado");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(30);
    if (err) setError(err.message);
    else {
      setError(null);
      setPedidos(data);
    }
    setLoading(false);
  }, []);

  const hayActivos = pedidos.some((p) => ESTADOS_ACTIVOS.includes(p.estado));

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, hayActivos ? 4000 : 20000);
    return () => clearInterval(id);
  }, [cargar, hayActivos]);

  async function actualizar(id, cambios) {
    const { error: err } = await supabase
      .from(TABLE)
      .update({ ...cambios, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (!err) await cargar();
    return { error: err?.message ?? null };
  }

  async function crear({ titulo, carpeta, descripcion }) {
    const { error: err } = await supabase.from(TABLE).insert({
      titulo: titulo?.trim() || carpeta.nombre,
      carpeta_drive_id: carpeta.id,
      carpeta_nombre: carpeta.nombre,
      descripcion: descripcion.trim(),
      estado: "pendiente",
    });
    if (!err) await cargar();
    return { error: err?.message ?? null };
  }

  function pedirCambio(pedido, texto) {
    const revisiones = [...(pedido.revisiones ?? []), { texto: texto.trim(), creado_en: new Date().toISOString() }];
    return actualizar(pedido.id, { revisiones, estado: "revision_pedida", progreso: "En cola para aplicar tu cambio" });
  }

  function aprobar(pedido) {
    return actualizar(pedido.id, { estado: "final_pedido", progreso: "En cola para la versión final" });
  }

  // Después de un error: si ya hubo borrador, se reintenta lo último que se pidió.
  function reintentar(pedido) {
    const revisionPendiente = (pedido.revisiones ?? []).some((r) => !r.respuesta);
    const estado = !pedido.borrador_url ? "pendiente" : revisionPendiente ? "revision_pedida" : "final_pedido";
    return actualizar(pedido.id, { estado, error: null, progreso: "En cola para reintentar" });
  }

  return { pedidos, loading, error, crear, pedirCambio, aprobar, reintentar, recargar: cargar };
}
