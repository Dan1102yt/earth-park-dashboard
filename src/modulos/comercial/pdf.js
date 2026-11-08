// Prepara las fotos y convierte las hojas de DocumentoCotizacion en un PDF A4.
import { fotoRecortada } from "./datos";
import { TAM_FOTOS } from "./DocumentoCotizacion";
import { CANALES, iconoGenerico } from "./empresa";

const BASE = import.meta.env.BASE_URL || "/";
const seguro = (p) => p.catch(() => "");

/** Recorta todas las fotos de la cotización. Si una falla, esa queda vacía (no daña el resto). */
export async function prepararImagenes(fotos = {}, dias = 1, empresa = null) {
  const [pw, ph] = dias >= 3 ? TAM_FOTOS.portadaCompacta : TAM_FOTOS.portada;
  const [portada, logo, animales, ...resto] = await Promise.all([
    seguro(fotoRecortada(fotos.portada, pw, ph)),
    seguro(cargarComoDataUrl(`${BASE}logo-earth-park.png`)),
    cargarAnimales(),
    ...Array.from({ length: dias }, (_, i) => seguro(fotoRecortada(fotos.dias?.[i], ...TAM_FOTOS.dia))),
    ...[0, 1, 2].map((i) => seguro(fotoRecortada(fotos.tira?.[i], ...TAM_FOTOS.tira))),
  ]);
  return { imgs: { portada, dias: resto.slice(0, dias), tira: resto.slice(dias) }, logo, animales, logosEmpresa: await prepararLogos(empresa) };
}

/** Logos de pagos y redes: el subido en Precios → Empresa, o un ícono genérico si no hay. */
async function prepararLogos(empresa) {
  const claves = ["bancolombia", "nequi", ...CANALES.map((c) => c.clave)];
  const urls = await Promise.all(claves.map((k) => (empresa?.logos?.[k] ? seguro(logoCuadrado(empresa.logos[k])) : Promise.resolve(""))));
  return Object.fromEntries(claves.map((k, i) => [k, urls[i] || iconoGenerico(k)]));
}

// Animales que decoran la propuesta (ilustraciones de la página web)
const ANIMALES = { mariposaAzul: 2, monarca: 5, cometa: 6, colibri: 7, ave: 8, colibriFlor: 9, abeja: 10 };
async function cargarAnimales() {
  const pares = await Promise.all(Object.entries(ANIMALES).map(async ([k, n]) => [k, await seguro(cargarComoDataUrl(`${BASE}cotizacion/animal-${n}.png`))]));
  return Object.fromEntries(pares);
}

/**
 * Deja el logo cuadrado: recorta el borde transparente y lo centra sin deformarlo.
 * (Muchos PNG oficiales traen mucho espacio vacío alrededor, y html2canvas no respeta object-fit.)
 */
async function logoCuadrado(url, lado = 256) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`logo ${r.status}`);
  const bmp = await createImageBitmap(await r.blob());
  const tmp = document.createElement("canvas");
  tmp.width = bmp.width;
  tmp.height = bmp.height;
  const c = tmp.getContext("2d");
  c.drawImage(bmp, 0, 0);
  const { data } = c.getImageData(0, 0, bmp.width, bmp.height);
  let x0 = bmp.width, y0 = bmp.height, x1 = -1, y1 = -1;
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      if (data[(y * bmp.width + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = bmp.width - 1; y1 = bmp.height - 1; }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const esc = lado / Math.max(w, h);
  const out = document.createElement("canvas");
  out.width = lado;
  out.height = lado;
  out.getContext("2d").drawImage(tmp, x0, y0, w, h, (lado - w * esc) / 2, (lado - h * esc) / 2, w * esc, h * esc);
  return out.toDataURL("image/png");
}

async function cargarComoDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((res, rej) => {
    const lector = new FileReader();
    lector.onload = () => res(lector.result);
    lector.onerror = rej;
    lector.readAsDataURL(blob);
  });
}

/** nodo = el div que contiene las hojas [data-hoja] → Blob PDF */
export async function generarPdf(nodo) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  await document.fonts?.ready;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const hojas = [...nodo.querySelectorAll("[data-hoja]")];
  for (let i = 0; i < hojas.length; i++) {
    const lienzo = await html2canvas(hojas[i], { scale: 2, useCORS: true, backgroundColor: "#fbfaf5", logging: false });
    if (i > 0) pdf.addPage();
    pdf.addImage(lienzo.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  }
  return pdf.output("blob");
}
