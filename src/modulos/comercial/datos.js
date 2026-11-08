// Lectura y escritura de Precios y Cotizaciones en Supabase (tablas de base-de-datos/08).
import { supabase } from "../../compartido/lib/supabaseClient";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const BASE = import.meta.env.BASE_URL || "/";

function revisar({ data, error }) {
  if (error) {
    if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
      throw new Error("Faltan las tablas de precios. Corre base-de-datos/08 y privado/08 en Supabase → SQL Editor.");
    }
    throw new Error(error.message);
  }
  return data;
}
const sb = () => {
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
};

export const cargarCatalogo = async () => revisar(await sb().from("catalogo").select("*").order("orden"));
export const cargarPlanes = async () => revisar(await sb().from("planes_venta").select("*").eq("activo", true).order("orden"));
export const cargarDescuentos = async () => revisar(await sb().from("descuentos_cliente").select("*").order("orden"));

export async function guardarCatalogo(item, quien) {
  const fila = { ...item, actualizado_at: new Date().toISOString(), actualizado_por: quien || null };
  return revisar(await sb().from("catalogo").upsert(fila).select().single());
}
export const borrarCatalogo = async (codigo) => revisar(await sb().from("catalogo").delete().eq("codigo", codigo));

export async function guardarPlan(plan) {
  const { id, itinerario, fotos, mensaje, precio_referencia } = plan;
  return revisar(await sb().from("planes_venta")
    .update({ itinerario, fotos, mensaje, precio_referencia, actualizado_at: new Date().toISOString() })
    .eq("id", id).select().single());
}

export const guardarDescuento = async (d) => revisar(await sb().from("descuentos_cliente").upsert(d).select().single());

export const listarCotizaciones = async () =>
  revisar(await sb().from("cotizaciones").select("*").order("creado_at", { ascending: false }).limit(200));

export async function guardarCotizacion(cot) {
  const fila = { ...cot, actualizado_at: new Date().toISOString() };
  if (!fila.id) delete fila.id;
  if (!fila.numero) delete fila.numero;
  return revisar(await sb().from("cotizaciones").upsert(fila).select().single());
}

export async function subirPdf(blob, cot) {
  const ruta = `cotizaciones/${cot.numero}-${cot.id}.pdf`;
  const { error } = await sb().storage.from("videos").upload(ruta, blob, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(`No se pudo guardar el PDF: ${explicarSubida(error.message)}`);
  return sb().storage.from("videos").getPublicUrl(ruta).data.publicUrl;
}

/** Traduce el error de Supabase cuando el bucket no acepta ese tipo de archivo. */
export const explicarSubida = (msg) =>
  /mime type/i.test(msg) ? "ese tipo de archivo aún no está permitido. Corre base-de-datos/10_bucket_imagenes_pdf.sql en Supabase." : msg;

// ── Fotos ──
// Una foto se guarda como:  "cotizacion/macanal.jpg" (incluida en el panel) · "drive:<id>" (Drive) · "https://..." (otra)
export const FOTOS_INCLUIDAS = [
  "macanal", "arbol-hollywood", "embalse-kayak", "lancha", "kayak", "mirador-luna", "mirador-luna-2", "grupo-mirador",
  "luna-atardecer", "cascada", "cascada-2", "paisaje", "paisaje-2", "grupo-campo", "hospedaje", "hospedaje-terraza",
  "hospedaje-2", "comida-montana", "hamburguesa", "mesa", "helado", "mariposa", "mariposa-2", "estacion-mariposa",
  "noche-mariposa", "noche-luces", "mineria", "pueblo", "tradicion", "taller-pintura",
].map((k) => `cotizacion/${k}.jpg`);

export function urlFoto(ref) {
  if (!ref) return "";
  if (ref.startsWith("drive:")) return `${WORKER_URL}/drive/image?id=${encodeURIComponent(ref.slice(6))}`;
  if (/^(https?:|data:|blob:)/.test(ref)) return ref;
  return `${BASE}${ref.replace(/^\//, "")}`;
}

/** Carga la foto y la recorta al tamaño pedido (como "cover"), para que el PDF no la deforme. */
export async function fotoRecortada(ref, ancho, alto) {
  const url = urlFoto(ref);
  if (!url) return "";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar la foto (${r.status})`);
  const bmp = await createImageBitmap(await r.blob());
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const esc = Math.max(ancho / bmp.width, alto / bmp.height);
  const w = bmp.width * esc;
  const h = bmp.height * esc;
  lienzo.getContext("2d").drawImage(bmp, (ancho - w) / 2, (alto - h) / 2, w, h);
  return lienzo.toDataURL("image/jpeg", 0.86);
}

// ── Datos de la empresa (pagos, redes, logos) ──
export async function cargarEmpresa() {
  const { data, error } = await sb().from("datos_empresa").select("datos").eq("id", "principal").maybeSingle();
  if (error) return null; // si la tabla aún no existe, la propuesta sale con los datos iniciales
  return data?.datos || null;
}
export async function guardarEmpresa(datos) {
  return revisar(await sb().from("datos_empresa").upsert({ id: "principal", datos, actualizado_at: new Date().toISOString() }).select().single()).datos;
}
export async function subirLogo(clave, archivo) {
  const ext = (archivo.name.split(".").pop() || "png").toLowerCase();
  const ruta = `marca/logos/${clave}-${Date.now()}.${ext}`;
  const { error } = await sb().storage.from("videos").upload(ruta, archivo, { contentType: archivo.type || "image/png" });
  if (error) throw new Error(`No se pudo subir el logo: ${explicarSubida(error.message)}`);
  return sb().storage.from("videos").getPublicUrl(ruta).data.publicUrl;
}
