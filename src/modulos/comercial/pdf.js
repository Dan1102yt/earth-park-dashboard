// Prepara las fotos y convierte las hojas de DocumentoCotizacion en un PDF A4.
import { fotoRecortada } from "./datos";
import { TAM_FOTOS } from "./DocumentoCotizacion";

const BASE = import.meta.env.BASE_URL || "/";
const seguro = (p) => p.catch(() => "");

/** Recorta todas las fotos de la cotización. Si una falla, esa queda vacía (no daña el resto). */
export async function prepararImagenes(fotos = {}, dias = 1) {
  const [pw, ph] = dias >= 3 ? TAM_FOTOS.portadaCompacta : TAM_FOTOS.portada;
  const [portada, logo, m1, m2, ...resto] = await Promise.all([
    seguro(fotoRecortada(fotos.portada, pw, ph)),
    seguro(cargarComoDataUrl(`${BASE}logo-earth-park.png`)),
    seguro(cargarComoDataUrl(`${BASE}cotizacion/mariposa-adorno-2.png`)),
    seguro(cargarComoDataUrl(`${BASE}cotizacion/mariposa-adorno-8.png`)),
    ...Array.from({ length: dias }, (_, i) => seguro(fotoRecortada(fotos.dias?.[i], ...TAM_FOTOS.dia))),
    ...[0, 1, 2].map((i) => seguro(fotoRecortada(fotos.tira?.[i], ...TAM_FOTOS.tira))),
  ]);
  return { imgs: { portada, dias: resto.slice(0, dias), tira: resto.slice(dias) }, logo, mariposas: [m1, m2] };
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
