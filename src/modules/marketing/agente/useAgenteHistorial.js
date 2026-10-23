import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TABLE = "marketing_agente";

// Guarda y lista lo que genera el agente. Si Supabase no está configurado
// o la tabla no existe, la página sigue funcionando sin historial.
export function useAgenteHistorial() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("creado_at", { ascending: false })
        .limit(30);
      if (error) console.warn("[agente] cargar:", error.message);
      else setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const guardar = useCallback(async (modo, tema, resultado) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ modo, tema, resultado })
      .select()
      .single();
    if (error) { console.warn("[agente] guardar:", error.message); return; }
    setItems((prev) => [data, ...prev]);
  }, []);

  const borrar = useCallback(async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, guardar, borrar };
}
