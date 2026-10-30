// El Estratega arma el plan semanal y ajusta propuestas según lo que digas en la reunión.
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { GUIA_GANCHOS } from "../agente/ganchos";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const MODEL = "claude-sonnet-4-5";

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

async function preguntar(prompt, max = 4000) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: max, system: SISTEMA_AGENTE, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const texto = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const obj = extraerObjetoJSON(texto);
  if (!obj) throw new Error("El agente respondió algo que no se pudo leer. Intenta de nuevo.");
  return obj;
}

const FORMATOS = `- "reel": video explicativo/documental (se produce en Videos cine IA). Curiosidades de naturaleza, ciencia del
  bienestar, el Valle de Tenza, la mariposa 88, la restauración de la tierra.
- "carrusel": 6–8 slides guardables (se produce en Agente IA). Guías, listas, errores comunes, qué empacar, planes.`;

/**
 * Plan de una semana.
 * semana: "YYYY-MM-DD" (lunes) · cantidad: publicaciones · previas: temas ya publicados o planeados (para no repetir)
 * indicaciones: lo que Oscar quiera para esa semana (opcional)
 */
export async function pedirPlanSemana({ semana, cantidad = 4, previas = [], indicaciones = "", investigacion = "" }) {
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "full" });
  const prompt = `Hoy es ${hoy}. Arma el plan de Instagram de Earth Park para la semana que empieza el lunes ${semana}.

- ${cantidad} publicaciones, mezcla de formatos:
${FORMATOS}
- Cada una con un objetivo claro (alcance, guardados, conversación o reservas) y un pilar de contenido distinto.
- Ten en cuenta la temporada (fechas especiales, festivos de Colombia, temporada alta de noviembre a enero).
- No repitas estos temas recientes: ${previas.length ? previas.slice(0, 30).join(" | ") : "(ninguno)"}.
- Días y horas buenas para una audiencia de Bogotá (ej. martes y jueves 6:30 p. m., domingo 10:00 a. m.); no dos el mismo día.
${indicaciones ? `- Indicaciones de Oscar para esta semana: ${indicaciones}` : ""}
${investigacion ? `
INFORME DE INVESTIGACIÓN DE ESTA SEMANA (úsalo para decidir temas, formatos y ganchos):
${investigacion}
` : ""}
${GUIA_GANCHOS}

Responde ÚNICAMENTE con JSON válido:
{"resumen":"2 o 3 frases como si se lo dijeras a Oscar en una reunión: el enfoque de la semana y por qué",
 "propuestas":[{"tipo":"reel|carrusel","tema":"el tema tal como se le pediría al productor","gancho":"primera frase o portada",
 "por_que":"por qué funciona (1 frase)","pilar":"educación|inspiración|comunidad|venta|detrás de cámaras",
 "objetivo":"alcance|guardados|conversación|reservas","dia":"YYYY-MM-DD","hora":"HH:MM"}]}
Usa comillas simples dentro de los textos; nunca comillas dobles dentro de los valores.`;
  const r = await preguntar(prompt, 3500);
  if (!Array.isArray(r.propuestas) || !r.propuestas.length) throw new Error("El plan llegó vacío. Intenta de nuevo.");
  return r;
}

/** Ajusta una propuesta según el comentario de Oscar en la reunión. */
export async function ajustarPropuesta(fila, comentario) {
  const actual = { tipo: fila.tipo, tema: fila.tema, ...fila.propuesta, fecha: fila.fecha_publicacion };
  const prompt = `Estamos en la reunión de planeación de Instagram de Earth Park. Esta es una propuesta tuya:
${JSON.stringify(actual)}

Oscar te dice: "${comentario}"

Ajusta la propuesta según lo que pide (si pide otro tema, propón uno nuevo; si pide otro día u hora, cámbialo).
Responde ÚNICAMENTE con JSON válido:
{"respuesta":"lo que le contestas a Oscar, 1 o 2 frases, cercano","tipo":"reel|carrusel","tema":"...","gancho":"...","por_que":"...",
 "pilar":"...","objetivo":"...","dia":"YYYY-MM-DD","hora":"HH:MM"}`;
  return preguntar(prompt, 1500);
}

/** "YYYY-MM-DD" + "HH:MM" (hora de Colombia) → ISO. */
export function fechaColombia(dia, hora = "18:30") {
  if (!dia) return null;
  const h = /^\d{1,2}:\d{2}$/.test(hora || "") ? hora.padStart(5, "0") : "18:30";
  const d = new Date(`${dia}T${h}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "martes 28 · 6:30 p. m." en hora de Colombia. */
export function fechaBonita(iso) {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "short" });
  const hora = d.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

/** ISO → valor para <input type="datetime-local"> en hora de Colombia. */
export function aInputLocal(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}
export const desdeInputLocal = (v) => (v ? new Date(`${v}:00-05:00`).toISOString() : null);

export { DIAS };
