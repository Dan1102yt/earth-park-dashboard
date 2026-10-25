// Generación de los visuales del modo cinematográfico:
//   1) fotograma clave de cada escena (imagen IA, barata) → storyboard para aprobar
//   2) solo las escenas marcadas como "video" se animan (Gemini Omni Flash), partiendo de su fotograma
// Todo se guarda en Supabase Storage para no volver a pagar por lo mismo.
import { supabase } from "../../../lib/supabaseClient";
import { listarFotosCarpeta } from "../../../services/driveService";
import { obtenerCategorias, buscarCategoria, urlsFoto } from "../agente/fotosCarrusel";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

// Precios de referencia (Gemini API, plan pago): imagen 1K ≈ US$0,034 · video 720p ≈ US$0,10 por segundo
export const PRECIO_IMAGEN = 0.034;
export const PRECIO_SEG_VIDEO = 0.10;
export const SEG_VIDEO_ESTIMADOS = 6;

// Reglas de composición (inspiradas en los reels de referencia: mundos llenos, sujeto protagonista, cámara con intención)
const ESTILO_FOTOGRAMA =
  "Vertical 9:16 full-bleed frame. The main subject is LARGE and clearly readable, filling most of the frame. " +
  "Rich, detailed environment from edge to edge (no empty blurry voids). Dramatic lighting with strong contrast " +
  "and vivid, saturated colors. Cinematic depth. No text, no letters, no numbers, no logos, no watermarks, no UI.";

const PLANOS = {
  macro: "extreme macro close-up, the subject fills the frame",
  primer_plano: "close-up shot of the subject",
  cenital: "top-down overhead view",
  contrapicado: "low-angle shot looking up at the subject, epic scale",
  isometrico: "isometric diorama view, miniature world",
  general: "wide establishing shot showing the whole environment",
  seguimiento: "dynamic tracking shot, subject in motion",
};

export function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function errorDe(res) {
  try { return (await res.json()).error || `Error ${res.status}`; } catch { return `Error ${res.status}`; }
}

// Convierte cualquier imagen a JPEG 1080×1920 (formato fijo, más liviano para guardar y para animar)
export async function aJpeg916(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1920;
    const ctx = c.getContext("2d");
    const r = Math.max(1080 / img.width, 1920 / img.height);
    ctx.drawImage(img, (1080 - img.width * r) / 2, (1920 - img.height * r) / 2, img.width * r, img.height * r);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reduce una foto a JPEG (máx. 1280 px de lado) sin recortarla: para fotos de referencia. */
export async function aJpegReferencia(blob, max = 1280) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Fotograma clave con IA.
 * opciones.estilo: base64 del primer fotograma → SOLO para mantener paleta y tipo de render (no la composición).
 * opciones.sujeto: [base64] fotos reales del protagonista → para que se vea igual al real (ej. la mariposa 88).
 * opciones.plano: tipo de plano de cámara (ver PLANOS).
 */
export async function generarFotograma(estiloVisual, prompt, opciones = {}) {
  const { estilo = null, sujeto = [], plano = null, formato = null } = opciones;
  const referencias = [];
  let guia = "";
  sujeto.slice(0, 2).forEach((data) => referencias.push({ data, mime: "image/jpeg" }));
  if (sujeto.length) {
    guia += ` The first ${sujeto.length > 1 ? "images are real photos" : "image is a real photo"} of the main subject: ` +
      "reproduce its exact shape, colors, markings and proportions faithfully (scientifically accurate), rendered in the art style described.";
  }
  if (estilo) {
    referencias.push({ data: estilo, mime: "image/jpeg" });
    guia += " The last image is ONLY a style reference: match its color palette, lighting and rendering technique, " +
      "but do NOT copy its composition, camera angle, framing or subject placement. Create a completely new composition.";
  }
  // Documental: el video se ve en una franja 4:5 al centro → todo lo importante en la zona central
  const doc = formato === "doc"
    ? " Keep the subject and all important action inside the central 70% of the frame height; top and bottom edges are only sky, ground or texture. Painterly, cinematic, poetic composition with a clear silhouette and a single focal point."
    : "";
  const texto = `${estiloVisual ? estiloVisual + ". " : ""}${plano && PLANOS[plano] ? PLANOS[plano] + ". " : ""}${prompt}. ${ESTILO_FOTOGRAMA}${doc}${guia}`;
  return aJpeg916(await imagenGemini(texto, referencias));
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reintenta cuando la conexión se cae ("Failed to fetch"): hasta 3 intentos. */
export async function conReintentos(fn, intentos = 3) {
  for (let k = 1; ; k++) {
    try { return await fn(); } catch (err) {
      const deRed = err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err.message || "");
      if (!deRed || k >= intentos) throw deRed ? new Error("Se cayó la conexión con el servidor de imágenes. Intenta de nuevo.") : err;
      await esperar(1500 * k);
    }
  }
}

function base64ABlob(data, mime) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "image/png" });
}

/**
 * Pide la imagen a Gemini por el Worker.
 * Modo directo: el navegador arma la petición y convierte la respuesta; el Worker solo la reenvía
 * (antes el Worker hacía la conversión y a veces se quedaba sin CPU → "Failed to fetch").
 * Si el Worker aún no tiene el modo directo, usa la ruta anterior.
 */
async function imagenGemini(texto, referencias) {
  return conReintentos(async () => {
    const cuerpo = {
      contents: [{ parts: [
        ...referencias.slice(0, 3).map((r) => ({ inlineData: { mimeType: r.mime || "image/jpeg", data: r.data } })),
        { text: texto },
      ] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } },
    };
    const res = await fetch(`${WORKER_URL}/image/generate?modo=directo`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
    });
    const data = await res.json().catch(() => ({}));
    const parte = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
    const inline = parte?.inlineData || parte?.inline_data;
    if (inline?.data) return base64ABlob(inline.data, inline.mimeType || inline.mime_type);
    const msg = data.error?.message || data.error || "";
    if (/Prompt vac/i.test(msg)) {
      // Worker sin modo directo todavía
      const r2 = await fetch(`${WORKER_URL}/image/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: texto, aspectRatio: "9:16", referencias }),
      });
      if (!r2.ok) throw new Error(await errorDe(r2));
      return r2.blob();
    }
    throw new Error(msg || (data.candidates ? "El modelo no devolvió imagen, intenta de nuevo" : `Error ${res.status}`));
  });
}

/** Foto de Drive elegida por el usuario → JPEG 9:16. */
export async function fotoDriveElegida(foto) {
  for (const url of urlsFoto(foto)) {
    try {
      const r = await fetch(url);
      if (r.ok) return aJpeg916(await r.blob());
    } catch { /* probar la siguiente */ }
  }
  throw new Error("No se pudo descargar esa foto de Drive");
}

/** Anima un fotograma como clip de video (con el mismo estilo). */
export async function animarFotograma(fotogramaBlob, estiloVisual, prompt, movimiento) {
  const texto = `${movimiento || "Slow cinematic camera push-in"}. Scene: ${prompt}. ` +
    `${estiloVisual ? "Art style: " + estiloVisual + ". " : ""}Keep exactly the art style and composition of the image. ` +
    "Smooth continuous camera motion, subtle living details (lights, particles, small movements), about 6 seconds. " +
    "No dialogue, no voice, no music, no text on screen.";
  const res = await fetch(`${WORKER_URL}/visual/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagen: await blobABase64(fotogramaBlob), mime: "image/jpeg", prompt: texto }),
  });
  if (!res.ok) throw new Error(await errorDe(res));
  return res.blob();
}

/** Foto real de Earth Park desde Drive (gratis), para escenas que muestran el parque. */
export async function fotoDeDrive(categoriaNombre, saltar = 0) {
  const cats = await obtenerCategorias();
  const cat = buscarCategoria(cats, categoriaNombre) || cats[0];
  if (!cat) throw new Error("No hay carpetas de fotos en Drive");
  const fotos = (await listarFotosCarpeta(cat.id)).filter((f) => f.mimeType?.startsWith("image/"));
  if (!fotos.length) throw new Error(`La carpeta ${cat.nombre} no tiene fotos`);
  const foto = fotos[(Math.floor(Math.random() * fotos.length) + saltar) % fotos.length];
  for (const url of urlsFoto(foto)) {
    try {
      const r = await fetch(url);
      if (r.ok) return aJpeg916(await r.blob());
    } catch { /* probar la siguiente */ }
  }
  throw new Error("No se pudo descargar la foto de Drive (revisa la ruta /drive/image del Worker)");
}

/** Sube a Supabase Storage (bucket "videos") y devuelve la URL pública. Sin Supabase: URL local. */
export async function guardarArchivo(blob, extension) {
  if (!supabase) return URL.createObjectURL(blob);
  const nombre = `cine/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const tipo = extension === "mp4" ? "video/mp4" : "image/jpeg";
  const { error } = await supabase.storage.from("videos").upload(nombre, blob, { contentType: tipo, upsert: false });
  if (error) { console.warn("[cine] guardar:", error.message); return URL.createObjectURL(blob); }
  return supabase.storage.from("videos").getPublicUrl(nombre).data.publicUrl;
}

/* ─── Cargar los recursos para dibujarlos ─────────────────── */

const cache = new Map(); // url → Promise<recurso>

export async function descargarBlob(url) {
  return conReintentos(async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo cargar ${url.slice(0, 60)}...`);
    return r.blob();
  });
}

/** { tipo: "imagen", img } */
export function cargarImagenRecurso(url) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const blob = url.startsWith("blob:") ? null : await descargarBlob(url);
      const src = blob ? URL.createObjectURL(blob) : url;
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      return { tipo: "imagen", img };
    })());
    cache.get(url).catch(() => cache.delete(url));
  }
  return cache.get(url);
}

/** { tipo: "video", el, dur } — el video se descarga completo para poder posicionarlo cuadro a cuadro. */
export function cargarVideoRecurso(url) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const blob = url.startsWith("blob:") ? null : await descargarBlob(url);
      const el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.src = blob ? URL.createObjectURL(blob) : url;
      await new Promise((res, rej) => { el.onloadeddata = res; el.onerror = () => rej(new Error("No se pudo leer el clip")); });
      return { tipo: "video", el, dur: el.duration || 6 };
    })());
    cache.get(url).catch(() => cache.delete(url));
  }
  return cache.get(url);
}

/** Posiciona un video en un segundo exacto (para exportar cuadro a cuadro). */
export function posicionar(el, t) {
  return new Promise((resolve) => {
    if (Math.abs(el.currentTime - t) < 0.005) return resolve();
    const listo = () => { el.removeEventListener("seeked", listo); resolve(); };
    el.addEventListener("seeked", listo);
    el.currentTime = t;
    setTimeout(listo, 1500); // por si el navegador no avisa
  });
}

/* ─── Control de calidad: Claude revisa cada fotograma antes de usarlo ─── */

export const PRECIO_VERIFICACION = 0.01;

/**
 * Revisa que el fotograma muestre lo que dice la narración y ubica los puntos que señalan las etiquetas.
 * Devuelve { coincide, problema, correccion, puntos: { [indiceDato]: {x, y} | null } }.
 */
export async function verificarFotograma(blob, { narracion, prompt, senalamientos = [] }) {
  const lista = senalamientos.length
    ? senalamientos.map((s) => `- ${s.i}: ${s.senala}`).join("\n")
    : "(ninguno)";
  const instrucciones = `Eres el supervisor de calidad de un video documental. Esta imagen es el fondo de UNA escena.
Narración de la escena: "${narracion}"
Lo que la imagen debía mostrar: "${prompt}"

1) ¿La imagen muestra lo que dice la narración en ESE momento? Sé estricto con contradicciones claras: otro sujeto,
otra etapa (ej. la narración habla de la oruga o del huevo y la protagonista es una mariposa adulta), detalles que
contradicen los datos, o elementos absurdos. Diferencias de estilo artístico NO son problema.
2) Para cada señalamiento de la lista, da el punto EXACTO en la imagen donde está eso, como fracción del ancho (x) y
del alto (y) desde la esquina superior izquierda (0 a 1). Si no aparece claramente en la imagen, pon null.
Señalamientos:
${lista}

Responde SOLO un JSON: {"coincide":true|false,"problema":"en español, corto (vacío si coincide)","correccion":"en inglés: qué cambiar en la imagen para que coincida (vacío si coincide)","puntos":{"0":{"x":0.5,"y":0.4}}}`;
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await blobABase64(blob) } },
        { type: "text", text: instrucciones },
      ] }],
    }),
  });
  if (!res.ok) throw new Error(`Verificación: ${await errorDe(res)}`);
  const data = await res.json();
  const texto = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const ini = texto.indexOf("{"), fin = texto.lastIndexOf("}");
  let r = null;
  try { r = JSON.parse(texto.slice(ini, fin + 1)); } catch { /* respuesta rara */ }
  if (!r) return { coincide: true, problema: "", correccion: "", puntos: {} };
  const puntos = {};
  for (const [k, v] of Object.entries(r.puntos || {})) {
    puntos[k] = v && Number.isFinite(+v.x) && Number.isFinite(+v.y)
      ? { x: Math.min(1, Math.max(0, +v.x)), y: Math.min(1, Math.max(0, +v.y)) } : null;
  }
  return { coincide: r.coincide !== false, problema: r.problema || "", correccion: r.correccion || "", puntos };
}
