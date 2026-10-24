import { listarSubcarpetas, listarFotosCarpeta } from "../../../services/driveService";

// Misma carpeta raíz de la Galería web: una subcarpeta por categoría de fotos.
export const FOTOS_ROOT_ID = "14VB2pCIKlIHqOtEm7hlLNdKnoZXRyE65";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

let categoriasPromesa = null;
const fotosPorCategoria = new Map();

/** [{id, nombre}] — se pide una sola vez por sesión. */
export function obtenerCategorias() {
  if (!categoriasPromesa) {
    categoriasPromesa = listarSubcarpetas(FOTOS_ROOT_ID).catch((e) => {
      categoriasPromesa = null;
      console.warn("[carrusel] categorías:", e.message);
      return [];
    });
  }
  return categoriasPromesa;
}

/** Fotos (solo imágenes) de una categoría, en caché. */
export async function obtenerFotos(categoria) {
  if (!categoria) return [];
  if (!fotosPorCategoria.has(categoria.id)) {
    const p = listarFotosCarpeta(categoria.id)
      .then((fs) => fs.filter((f) => f.mimeType?.startsWith("image/")))
      .catch(() => []);
    fotosPorCategoria.set(categoria.id, p);
  }
  return fotosPorCategoria.get(categoria.id);
}

/** Todas las fotos de todas las categorías (para cuando no hay categoría sugerida). */
export async function obtenerTodasLasFotos() {
  const cats = await obtenerCategorias();
  const listas = await Promise.all(cats.map(obtenerFotos));
  return listas.flat();
}

/**
 * URLs a probar para dibujar la foto en el canvas sin "contaminarlo" (CORS):
 * 1) el Worker, que la sirve con CORS abierto; 2) el CDN de Google (si la foto es pública).
 */
export function urlsFoto(foto) {
  if (!foto) return [];
  return [
    `${WORKER_URL}/drive/image?id=${encodeURIComponent(foto.id)}`,
    `https://lh3.googleusercontent.com/d/${foto.id}=w1600`,
  ];
}

/** Busca la categoría que más se parece al nombre sugerido por el agente. */
export function buscarCategoria(categorias, nombre) {
  if (!nombre || !categorias.length) return null;
  const n = normalizar(nombre);
  return categorias.find((c) => normalizar(c.nombre) === n)
    || categorias.find((c) => normalizar(c.nombre).includes(n) || n.includes(normalizar(c.nombre)))
    || null;
}

const normalizar = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/* ─── Fondos generados con IA (Gemini, vía el Worker) ─────── */

const iaCache = new Map(); // prompt → Promise<objectURL>

const ESTILO_IA = "Vertical 4:5 photograph, realistic, natural light, earthy greens and warm tones, " +
  "main subject in the upper half, darker and uncluttered lower half for overlay text, " +
  "no text, no letters, no logos, no watermarks. Scene: ";

/** Genera una imagen y devuelve una URL local (blob:) que se puede dibujar en el canvas. */
export function generarImagenIA(prompt) {
  const clave = String(prompt || "").trim();
  if (!clave) return Promise.reject(new Error("Sin prompt"));
  if (!iaCache.has(clave)) {
    const p = (async () => {
      const res = await fetch(`${WORKER_URL}/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: ESTILO_IA + clave, aspectRatio: "4:5" }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { msg = (await res.json()).error || msg; } catch {}
        throw new Error(msg);
      }
      return URL.createObjectURL(await res.blob());
    })();
    p.catch(() => iaCache.delete(clave)); // si falla, se puede reintentar
    iaCache.set(clave, p);
  }
  return iaCache.get(clave);
}
