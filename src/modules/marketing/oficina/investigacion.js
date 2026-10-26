// Iván, el investigador: una vez por semana busca en internet qué está funcionando en el nicho
// (naturaleza, ecoturismo, glamping, bienestar, Colombia) y le deja a Sofía un informe para planear la semana.
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { GUIA_GANCHOS } from "../agente/ganchos";
import { supabase } from "../../../lib/supabaseClient";

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

export async function investigarSemana() {
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "full" });
  const prompt = `Hoy es ${hoy}. Eres Iván, el investigador de contenido de Earth Park. Investiga en internet (usa la búsqueda web)
qué contenido está funcionando AHORA en Instagram y TikTok en nuestro nicho: ecoturismo y glamping en Colombia y Latinoamérica,
naturaleza y ciencia de la naturaleza (mariposas, aves, bosques, restauración ecológica), bienestar y desconexión, escapadas
de fin de semana desde Bogotá. Busca cuentas y publicaciones con muchas reproducciones o guardados, formatos y tendencias de
las últimas semanas, fechas especiales de Colombia en los próximos 14 días y temporada (puentes festivos, vacaciones).

Luego dale a Sofía (estratega) una asesoría concreta para que la semana sea viral, educativa y haga que la gente quiera
visitarnos. Sé específico, nada genérico. Si no encuentras un dato, no lo inventes.

${GUIA_GANCHOS}

Responde ÚNICAMENTE con JSON válido:
{"resumen":"3 o 4 frases: lo más importante que encontraste y qué recomiendas",
 "tendencias":[{"titulo":"...","que_es":"...","ejemplo":"cuenta o publicación de referencia (si la encontraste)","por_que_funciona":"...","como_aplicarlo":"cómo lo haría Earth Park"}],
 "formatos":["formato recomendado y por qué (ej. reel documental de 40 s, carrusel guía de 8 slides)"],
 "ganchos":["5 ganchos listos para usar esta semana, con la esencia de Earth Park"],
 "temas":[{"tipo":"reel|carrusel","tema":"...","gancho":"...","objetivo":"alcance|guardados|conversación|reservas","por_que":"..."}],
 "fechas":["fecha o temporada relevante y cómo aprovecharla"],
 "evitar":["lo que NO conviene publicar esta semana y por qué"],
 "fuentes":["url"]}
Usa comillas simples dentro de los textos; nunca comillas dobles dentro de los valores.`;

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5", max_tokens: 8000, system: SISTEMA_AGENTE,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
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
  informe.fuentes = [...urls].slice(0, 12);

  let fila = { modo: "investigacion", tema: `Investigación semana ${hoy}`, resultado: informe, creado_at: new Date().toISOString() };
  if (supabase) {
    const { data: d, error } = await supabase.from("marketing_agente").insert({ modo: fila.modo, tema: fila.tema, resultado: informe }).select().single();
    if (!error && d?.creado_at) fila = d;
  }
  return fila;
}

/** Texto compacto del informe para dárselo a Sofía al armar el plan. */
export function informeParaPlan(fila) {
  const r = fila?.resultado;
  if (!r) return "";
  const lista = (xs, f = (x) => x) => (xs || []).slice(0, 6).map((x) => `- ${f(x)}`).join("\n");
  return [
    `Resumen: ${r.resumen}`,
    r.tendencias?.length ? `Tendencias:\n${lista(r.tendencias, (t) => `${t.titulo}: ${t.como_aplicarlo || t.que_es}`)}` : "",
    r.formatos?.length ? `Formatos:\n${lista(r.formatos)}` : "",
    r.ganchos?.length ? `Ganchos sugeridos:\n${lista(r.ganchos)}` : "",
    r.temas?.length ? `Temas sugeridos:\n${lista(r.temas, (t) => `${t.tipo}: ${t.tema} (${t.gancho})`)}` : "",
    r.fechas?.length ? `Fechas:\n${lista(r.fechas)}` : "",
    r.evitar?.length ? `Evitar:\n${lista(r.evitar)}` : "",
  ].filter(Boolean).join("\n");
}
