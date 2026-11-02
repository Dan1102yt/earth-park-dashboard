// Números de redes de Earth Park y de la competencia/referentes (lista en cerebro/competencia.md).
// El Worker los trae de Instagram (business_discovery) y aquí se guarda una foto por semana para ver la evolución.
import LISTA from "@cerebro/competencia.md?raw";
import { supabase } from "../../../compartido/lib/supabaseClient";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
export const DIAS_ENTRE_KPIS = 6;

/** Cuentas de cerebro/competencia.md → [{ usuario, tipo, nota }] */
export function cuentasSeguidas(texto = LISTA) {
  return texto.split("\n").map((l) => l.match(/^\s*-\s*@([\w.]+)\s*\|\s*(competencia|referente)\s*(?:\|\s*(.*))?$/i))
    .filter(Boolean).map((m) => ({ usuario: m[1].toLowerCase(), tipo: m[2].toLowerCase(), nota: (m[3] || "").trim() }));
}

/** Últimas fotos guardadas (la más reciente primero). */
export async function historialKpis(n = 8) {
  if (!supabase) return [];
  const { data } = await supabase.from("marketing_agente").select("id, creado_at, resultado")
    .eq("modo", "kpi_redes").order("creado_at", { ascending: false }).limit(n);
  return data || [];
}

/** Pide los números al Worker, los guarda y los devuelve con la variación frente a la foto anterior. */
export async function actualizarKpis() {
  const cuentas = cuentasSeguidas();
  const res = await fetch(`${WORKER_URL}/ig/kpis`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarios: cuentas.map((c) => c.usuario) }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d.error || `Error ${res.status}`);
  const porUsuario = Object.fromEntries(cuentas.map((c) => [c.usuario, c]));
  d.cuentas = d.cuentas.map((c) => ({ ...c, tipo: c.propia ? "propia" : porUsuario[c.usuario]?.tipo || "competencia", nota: porUsuario[c.usuario]?.nota || "" }));
  if (supabase) await supabase.from("marketing_agente").insert({ modo: "kpi_redes", tema: `KPIs redes ${d.fecha.slice(0, 10)}`, resultado: d });
  return d;
}

/** Agrega a cada cuenta cuánto cambiaron sus seguidores frente a una foto anterior. */
export function conVariacion(actual, anterior) {
  if (!actual) return null;
  const prev = Object.fromEntries((anterior?.cuentas || []).map((c) => [c.usuario, c]));
  const dias = anterior ? Math.max(1, Math.round((new Date(actual.fecha) - new Date(anterior.fecha)) / 86400000)) : null;
  return {
    ...actual, dias,
    cuentas: actual.cuentas.map((c) => ({ ...c, crecimiento: prev[c.usuario]?.seguidores != null && c.seguidores != null ? c.seguidores - prev[c.usuario].seguidores : null })),
  };
}

/** Texto compacto de los números para que Iván los analice. */
export function kpisParaIvan(k) {
  if (!k?.cuentas?.length) return "No hay números de redes disponibles todavía.";
  return k.cuentas.map((c) => c.error
    ? `- @${c.usuario} (${c.tipo}): sin números (${c.error})`
    : `- @${c.usuario} (${c.tipo}${c.propia ? ", NOSOTROS" : ""}): ${c.seguidores} seguidores${c.crecimiento != null ? ` (${c.crecimiento >= 0 ? "+" : ""}${c.crecimiento} en ${k.dias} días)` : ""}, `
      + `${c.por_semana} publicaciones/semana, ${c.reels_pct}% reels, interacción promedio ${c.promedio_interacciones} (${c.engagement}% de sus seguidores). `
      + `Top: ${(c.top || []).map((t) => `${t.tipo} con ${t.interacciones} interacciones: '${t.texto.replace(/["\n]/g, " ").slice(0, 90)}'`).join(" | ")}`).join("\n");
}
