import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export function useMarketingStorage() {
  const [semanas, setSemanas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarSemanas(); }, []);

  async function cargarSemanas() {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("marketing_semanas")
      .select("*")
      .order("fecha_inicio", { ascending: false });
    if (!error && data) setSemanas(data);
    setLoading(false);
  }

  async function guardarSemana(posts) {
    if (!supabase) return;
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + 6);
    const label = `${hoy.getDate()} al ${fin.getDate()} de ${fin.toLocaleString("es-CO", { month: "long" })} ${fin.getFullYear()}`;
    const { data, error } = await supabase
      .from("marketing_semanas")
      .insert({
        semana_label: label,
        fecha_inicio: hoy.toISOString().split("T")[0],
        posts: posts,
      })
      .select()
      .single();
    if (!error && data) setSemanas(prev => [data, ...prev]);
    return { data, error };
  }

  return { semanas, loading, guardarSemana };
}
