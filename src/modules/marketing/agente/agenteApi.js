import { SISTEMA_AGENTE } from "./agentePrompts";

const MODEL = "claude-sonnet-4-5";

function limpiarMarkdown(texto) {
  return texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

export function extraerObjetoJSON(texto) {
  if (!texto) return null;
  const limpio = limpiarMarkdown(texto);
  try { return JSON.parse(limpio); } catch {}
  const ini = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (ini !== -1 && fin > ini) {
    try { return JSON.parse(limpio.slice(ini, fin + 1)); } catch {}
  }
  return null;
}

/**
 * Llama a Claude a través del Worker de Cloudflare (ruta por defecto = proxy a Anthropic).
 * Si usaWeb es true, activa la herramienta de búsqueda web del lado de Anthropic.
 */
export async function llamarAgente(workerUrl, modo, tema) {
  const body = {
    model: MODEL,
    max_tokens: modo.usaWeb ? 8000 : 4096,
    system: SISTEMA_AGENTE,
    messages: [{ role: "user", content: modo.construirPrompt(tema.trim()) }],
  };
  if (modo.usaWeb) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }];
  }

  const res = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Worker error ${res.status}: ${err.substring(0, 300)}`);
  }

  const data = await res.json();
  // Con búsqueda web la respuesta trae varios bloques; unimos solo los de texto.
  const texto = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!texto) throw new Error("Respuesta vacía del modelo");

  if (modo.formato === "json") {
    const obj = extraerObjetoJSON(texto);
    if (!obj) throw new Error("No se pudo interpretar la respuesta. Primeros 300 caracteres: " + texto.substring(0, 300));
    return obj;
  }
  return texto;
}
