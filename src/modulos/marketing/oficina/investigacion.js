// Iván, el investigador: experto en ecoturismo del Valle de Tenza. Investiga lo que le pidas (o la semana, solo)
// con búsqueda web + los números reales de Instagram de Earth Park y la competencia, y le deja el informe a Sofía.
// Su perfil vive en cerebro/ivan.md y la lista de cuentas en cerebro/competencia.md.
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { GUIA_GANCHOS } from "../agente/ganchos";
import { supabase } from "../../../compartido/lib/supabaseClient";
import IVAN from "@cerebro/ivan.md?raw";
import { kpisParaIvan } from "./kpisRedes";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
export const DIAS_ENTRE_INFORMES = 7;

/** Último informe guardado (tabla marketing_agente, modo "investigacion"). */
export async function ultimoInforme() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("marketing_agente").select("*")
    .eq("modo", "investigacion").order("creado_at", { ascending: false }).limit(1);
  if (error) { console.warn("[investigacion]", error.message); return null; }
  return data?.[0] || null;
}

export const informeVencido = (fila) =>
  !fila || Date.now() - new Date(fila.creado_at).getTime() > DIAS_ENTRE_INFORMES * 86400000;

export const PEDIDOS_RAPIDOS = [
  "Analiza la competencia del Valle de Tenza: por qué les va mejor y qué tomamos de ellos",
  "Qué reels de ecoturismo están funcionando ahora y cómo los haríamos nosotros",
  "Cómo conseguir más reservas de fin de semana para grupos de 2 a 15 personas",
  "Precios y planes de la competencia comparados con los nuestros",
  "Fechas, puentes y temporada de las próximas semanas: qué publicar",
];

/**
 * Iván investiga lo que le pidas (o la semana, si no le pides nada).
 * pedido: texto libre · kpis: números de redes (kpisRedes.js) · cuentas: lista de competencia/referentes
 */
export async function investigar({ pedido = "", kpis = null, cuentas = [] } = {}) {
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "full" });
  const tarea = pedido.trim()
    || "Investigación semanal: qué está funcionando ahora en nuestro nicho, cómo va la competencia y qué debería publicar Earth Park esta semana para conseguir reservas.";
  const prompt = `${IVAN}

Hoy es ${hoy}.

TAREA QUE TE PIDE OSCAR (el dueño): ${tarea}

CUENTAS QUE SEGUIMOS (búscalas en internet si hace falta: Instagram, TikTok, Google, Facebook):
${cuentas.map((c) => `- @${c.usuario} (${c.tipo})${c.nota ? `: ${c.nota}` : ""}`).join("\n") || "- (ninguna)"}

NÚMEROS REALES DE INSTAGRAM (últimas 12 publicaciones de cada cuenta; úsalos, no los inventes):
${kpisParaIvan(kpis)}

Usa la búsqueda web para completar lo que los números no dicen: qué ofrecen, precios publicados, qué formatos les funcionan,
reseñas, colaboraciones, fechas y temporada en Colombia. Si no encuentras algo, dilo.

${GUIA_GANCHOS}

Responde ÚNICAMENTE con JSON válido:
{"titulo":"título corto del informe",
 "resumen":"3 o 4 frases: la respuesta directa a lo que pidió Oscar y lo más importante que debe hacer",
 "lectura_numeros":"2 o 3 frases leyendo los números: dónde estamos frente a los demás y qué explica la diferencia",
 "competencia":[{"cuenta":"@usuario","tipo":"competencia|referente","que_hacen_bien":"...","por_que_les_funciona":"...","que_tomamos":"cómo lo traducimos a Earth Park sin copiar","ojo":"lo que NO conviene imitar (opcional)"}],
 "oportunidades":["huecos que nadie está llenando y Earth Park puede ocupar"],
 "acciones":[{"accion":"qué hacer, concreto","impacto":"alto|medio|bajo","esfuerzo":"alto|medio|bajo","para_reservas":"cómo acerca a una reserva"}],
 "tendencias":[{"titulo":"...","que_es":"...","ejemplo":"cuenta o publicación de referencia","por_que_funciona":"...","como_aplicarlo":"cómo lo haría Earth Park"}],
 "ganchos":["5 ganchos listos para usar, con la esencia de Earth Park"],
 "temas":[{"tipo":"reel|carrusel","tema":"...","gancho":"...","objetivo":"alcance|guardados|conversación|reservas","por_que":"..."}],
 "fechas":["fecha o temporada relevante y cómo aprovecharla"],
 "evitar":["lo que NO conviene hacer y por qué"],
 "fuentes":["url"]}
Ordena "acciones" de mayor a menor prioridad (máximo 6). Usa comillas simples dentro de los textos; nunca comillas dobles dentro de los valores.`;

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5", max_tokens: 12000, system: SISTEMA_AGENTE,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const texto = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const informe = extraerObjetoJSON(texto);
  if (!informe?.resumen) throw new Error("Iván no pudo armar el informe. Intenta de nuevo.");
  // Fuentes reales que devolvió la búsqueda (por si el modelo no las listó)
  const urls = new Set(informe.fuentes || []);
  (data?.content || []).forEach((b) => (b.content || []).forEach?.((r) => r?.url && urls.add(r.url)));
  informe.fuentes = [...urls].slice(0, 15);
  informe.pedido = pedido.trim();
  informe.kpis = kpis || null; // los números con los que se hizo, para mostrarlos en el informe

  const tema = informe.titulo || (pedido.trim() ? pedido.trim().slice(0, 120) : `Investigación semana ${hoy}`);
  let fila = { modo: "investigacion", tema, resultado: informe, creado_at: new Date().toISOString() };
  if (supabase) {
    const { data: d, error } = await supabase.from("marketing_agente").insert({ modo: fila.modo, tema, resultado: informe }).select().single();
    if (!error && d?.creado_at) fila = d;
  }
  return fila;
}

/** Compatibilidad: la investigación automática de cada semana. */
export const investigarSemana = (opciones = {}) => investigar(opciones);

/** Informes anteriores (para volver a leerlos). */
export async function informesAnteriores(n = 10) {
  if (!supabase) return [];
  const { data } = await supabase.from("marketing_agente").select("id, tema, creado_at, resultado")
    .eq("modo", "investigacion").order("creado_at", { ascending: false }).limit(n);
  return data || [];
}

/** Texto compacto del informe para dárselo a Sofía al armar el plan. */
export function informeParaPlan(fila) {
  const r = fila?.resultado;
  if (!r) return "";
  const lista = (xs, f = (x) => x) => (xs || []).slice(0, 6).map((x) => `- ${f(x)}`).join("\n");
  return [
    `Resumen: ${r.resumen}`,
    r.lectura_numeros ? `Números de redes: ${r.lectura_numeros}` : "",
    r.acciones?.length ? `Acciones prioritarias:\n${lista(r.acciones, (a) => `${a.accion} (impacto ${a.impacto})`)}` : "",
    r.competencia?.length ? `De la competencia tomamos:\n${lista(r.competencia, (c) => `${c.cuenta}: ${c.que_tomamos}`)}` : "",
    r.tendencias?.length ? `Tendencias:\n${lista(r.tendencias, (t) => `${t.titulo}: ${t.como_aplicarlo || t.que_es}`)}` : "",
    r.formatos?.length ? `Formatos:\n${lista(r.formatos)}` : "",
    r.ganchos?.length ? `Ganchos sugeridos:\n${lista(r.ganchos)}` : "",
    r.temas?.length ? `Temas sugeridos:\n${lista(r.temas, (t) => `${t.tipo}: ${t.tema} (${t.gancho})`)}` : "",
    r.fechas?.length ? `Fechas:\n${lista(r.fechas)}` : "",
    r.evitar?.length ? `Evitar:\n${lista(r.evitar)}` : "",
  ].filter(Boolean).join("\n");
}
