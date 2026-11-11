// Videos de las escenas: subirlos, cargarlos y ponerlos en el segundo exacto.
import { supabase } from "../../../compartido/lib/supabaseClient";
import { posicionar } from "../cine/visuales";
import { indiceEn, tiempoEnClip, FUNDIDO } from "./linea";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const LIMITE_MB = 50; // límite por archivo del plan gratis de Supabase
const locales = new Map(); // "local:…" → blob URL (solo en este equipo, mientras la página esté abierta)

/** Sube el video a Supabase. Si pesa más de 50 MB, queda solo en este equipo (hay que volver a cargarlo después). */
export async function subirVideo(archivo) {
  if (archivo.size > LIMITE_MB * 1024 * 1024 || !supabase) {
    const ref = `local:${Date.now()}-${archivo.name}`;
    locales.set(ref, URL.createObjectURL(archivo));
    return { ref, local: true };
  }
  const ruta = `guion/videos/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("videos").upload(ruta, archivo, { contentType: archivo.type || "video/mp4" });
  if (error) {
    if (/mime type/i.test(error.message)) throw new Error("Supabase aún no acepta ese tipo de video. Corre base-de-datos/10_bucket_imagenes_pdf.sql, o usa MP4.");
    throw new Error(error.message);
  }
  return { ref: supabase.storage.from("videos").getPublicUrl(ruta).data.publicUrl, local: false };
}

export function urlVideo(ref) {
  if (!ref) return "";
  if (ref.startsWith("local:")) return locales.get(ref) || "";
  if (ref.startsWith("drive:")) return `${WORKER_URL}/drive/video?id=${encodeURIComponent(ref.slice(6))}`;
  return ref;
}

/** Carga el video completo (para poder ponerlo en cualquier segundo sin esperas) → { el, dur } */
export async function cargarVideo(ref) {
  const url = urlVideo(ref);
  if (!url) throw new Error("Este video estaba solo en el otro equipo: vuelve a cargarlo");
  let src = url;
  if (!url.startsWith("blob:")) {
    const r = await fetch(url);
    if (!r.ok) {
      if (ref.startsWith("drive:")) {
        const d = await r.json().catch(() => ({}));
        throw new Error(r.status === 404 && !d.error
          ? "El servidor aún no sabe traer videos de Drive: actualiza servidor/worker.js en Cloudflare"
          : `Drive: ${d.error || r.status}`);
      }
      throw new Error(`Video ${r.status}`);
    }
    src = URL.createObjectURL(await r.blob());
  }
  const el = document.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.src = src;
  await new Promise((res, rej) => {
    el.onloadeddata = res;
    el.onerror = () => rej(new Error("Este navegador no puede leer ese video. Prueba exportándolo como MP4 (H.264)."));
  });
  return { el, dur: el.duration || 0 };
}

/** Planos con video que se ven en el segundo t (el actual y, durante el fundido, el anterior). */
export function planosVisibles(linea, t) {
  const i = indiceEn(linea.planos, t);
  const out = [linea.planos[i]];
  if (i > 0 && t - linea.planos[i].inicio < FUNDIDO) out.push(linea.planos[i - 1]);
  return out.filter((p) => p?.video);
}

/** Antes de dibujar un fotograma exacto (vista previa quieta o exportación): pone cada video en su segundo. */
export async function prepararVideos(linea, t, videos) {
  await Promise.all(planosVisibles(linea, t).map((p) => {
    const v = videos.get(p.video.ref);
    return v?.el ? posicionar(v.el, tiempoEnClip(p, t)) : null;
  }));
}
