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

const ESTILO_FOTOGRAMA =
  "Vertical 9:16 frame, rich detail, strong composition, main subject in the center-lower area, " +
  "darker uncluttered area at the top for captions, no text, no letters, no numbers, no logos, no watermarks, no UI.";

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

/** Fotograma clave con IA. referencia: base64 JPEG del primer fotograma para mantener el estilo. */
export async function generarFotograma(estiloVisual, prompt, referencia = null) {
  const texto = `${estiloVisual ? estiloVisual + ". " : ""}${prompt}. ${ESTILO_FOTOGRAMA}` +
    (referencia ? " Match exactly the art style, palette and rendering of the reference image, but show the new scene." : "");
  const res = await fetch(`${WORKER_URL}/image/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: texto, aspectRatio: "9:16", referencia }),
  });
  if (!res.ok) throw new Error(await errorDe(res));
  return aJpeg916(await res.blob());
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
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar ${url.slice(0, 60)}...`);
  return r.blob();
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
