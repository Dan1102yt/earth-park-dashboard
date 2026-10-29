// Lu (community manager): preparar archivos para Instagram y hablar con el Worker que publica.
import { supabase } from "../../../lib/supabaseClient";
import { marcarPlan, lunesDe } from "./usePlan";

const LIMITE_MB = 50; // máximo por archivo en Supabase (plan gratis)
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
 * Le entrega a Lu una pieza terminada: sube los archivos y deja la publicación "lista" para programar.
 * Si la pieza no venía del plan de la Oficina (planId vacío), crea la publicación en el plan.
 * fecha (opcional, ISO): si viene, queda programada de una vez.
 */
export async function enviarALu(planId, { tipo, archivos, caption, tema, fecha = null }) {
  if (!supabase) throw new Error("Supabase no está configurado");
  if (!archivos?.length) throw new Error("No hay archivos para enviar");
  if (tipo === "reel") {
    const v = archivos[0];
    if (!v || !String(v.type).includes("mp4")) throw new Error("Instagram necesita el video en MP4. Exporta de nuevo desde Chrome o Edge.");
  }
  const grande = archivos.find((a) => a.size > LIMITE_MB * 1024 * 1024);
  if (grande) {
    throw new Error(`El archivo pesa ${(grande.size / 1048576).toFixed(0)} MB y el máximo es ${LIMITE_MB} MB. `
      + (tipo === "reel"
        ? "Si lo hiciste en Videos cine IA, vuelve a exportarlo (ahora sale más liviano). Si es un video tuyo, comprímelo (por ejemplo con CapCut a 1080p) y súbelo de nuevo."
        : "Reduce el tamaño de la foto e intenta de nuevo."));
  }
  let id = planId;
  if (!id) {
    const { data, error } = await supabase.from("contenido_plan").insert({
      semana: lunesDe(), tipo, tema: (tema || "Publicación").slice(0, 200), estado: "lista",
      propuesta: { origen: "manual" }, fecha_publicacion: fecha,
    }).select().single();
    if (error) throw new Error(error.message.includes("does not exist")
      ? "Falta crear la tabla contenido_plan en Supabase (supabase/contenido_plan.sql)" : error.message);
    id = data.id;
  }
  const urls = [];
  for (const a of archivos) urls.push(await subir(a, tipo === "reel" ? "mp4" : "jpg"));
  await marcarPlan(id, {
    estado: fecha ? "programada" : "lista", media_urls: urls, caption: caption || "", error: null, ig_contenedor: null,
    ...(fecha ? { fecha_publicacion: fecha } : {}),
  });
  return id;
}

/** Imagen subida por el usuario (PNG, HEIC convertido por el navegador, etc.) → JPEG. */
export async function aJpegInstagram(archivo) {
  if (archivo.type === "image/jpeg") return archivo;
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return await canvasAJpeg(c);
  } finally { URL.revokeObjectURL(url); }
}

/** Caption con hashtags. */
export const captionCompleto = (caption, hashtags = []) =>
  `${caption || ""}\n\n${(hashtags || []).map((h) => (String(h).startsWith("#") ? h : `#${h}`)).join(" ")}`.trim();
