// Lu (community manager): preparar archivos para Instagram y hablar con el Worker que publica.
import { supabase } from "../../../lib/supabaseClient";
import { marcarPlan } from "./usePlan";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

async function llamar(ruta, cuerpo) {
  const res = await fetch(`${WORKER_URL}${ruta}`, cuerpo
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }
    : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/** ¿Está conectada la cuenta? → { usuario, tipo, cupo } */
export const estadoInstagram = () => llamar("/ig/estado");
/** Publicar ya una publicación del plan. */
export const publicarAhora = (id) => llamar("/ig/publicar-ahora", { id });

async function subir(blob, extension) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const nombre = `instagram/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const tipo = extension === "mp4" ? "video/mp4" : "image/jpeg";
  const { error } = await supabase.storage.from("videos").upload(nombre, blob, { contentType: tipo, upsert: false });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  return supabase.storage.from("videos").getPublicUrl(nombre).data.publicUrl;
}

/** Canvas → JPEG (Instagram solo acepta JPEG para fotos y carruseles). */
export const canvasAJpeg = (canvas) => new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));

/**
 * Deja la publicación del plan "lista" para que Lu la programe:
 * sube los archivos y guarda el caption.
 */
export async function enviarALu(planId, { tipo, archivos, caption }) {
  if (!planId) throw new Error("Esta pieza no viene del plan de la Oficina");
  if (tipo === "reel") {
    const v = archivos[0];
    if (!v || !String(v.type).includes("mp4")) throw new Error("Instagram necesita el video en MP4. Exporta de nuevo desde Chrome o Edge.");
  }
  const urls = [];
  for (const a of archivos) urls.push(await subir(a, tipo === "reel" ? "mp4" : "jpg"));
  await marcarPlan(planId, { estado: "lista", media_urls: urls, caption: caption || "", error: null, ig_contenedor: null });
  return urls;
}

/** Caption con hashtags. */
export const captionCompleto = (caption, hashtags = []) =>
  `${caption || ""}\n\n${(hashtags || []).map((h) => (String(h).startsWith("#") ? h : `#${h}`)).join(" ")}`.trim();
