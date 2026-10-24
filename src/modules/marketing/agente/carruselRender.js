// Dibuja cada slide del carrusel en un canvas 1080×1350 (formato 4:5, el que más
// espacio ocupa en el feed de Instagram) y lo exporta como PNG.

export const ANCHO = 1080;
export const ALTO = 1350;

const VERDE = "#a3e635";      // resaltado (*palabra*)
const BLANCO = "#ffffff";
const GRIS = "rgba(255,255,255,0.82)";
const FUENTE_TITULO = "Outfit, Inter, system-ui, sans-serif";
const FUENTE_TEXTO = "Inter, system-ui, sans-serif";
const PAD = 84;

const LOGO_URL = `${import.meta.env.BASE_URL}logo-earth-park.png`;

let fuentesListas = null;
function cargarFuentes() {
  if (!fuentesListas) {
    fuentesListas = Promise.all([
      document.fonts?.load(`800 80px Outfit`),
      document.fonts?.load(`700 80px Outfit`),
      document.fonts?.load(`500 40px Inter`),
    ]).catch(() => {});
  }
  return fuentesListas;
}

export function cargarImagen(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let logoPromesa = null;
const cargarLogo = () => (logoPromesa ||= cargarImagen(LOGO_URL));

/* ─── Texto con resaltados ────────────────────────────────── */

// "Lo que *nadie* te dice" → [{t:"Lo",h:false},{t:"que",h:false},{t:"nadie",h:true},...]
function tokenizar(texto) {
  const tokens = [];
  String(texto || "").split(/(\*[^*]+\*)/g).forEach((parte) => {
    const resaltado = parte.length > 2 && parte.startsWith("*") && parte.endsWith("*");
    const limpio = resaltado ? parte.slice(1, -1) : parte;
    limpio.split(/\s+/).filter(Boolean).forEach((t) => tokens.push({ t, h: resaltado }));
  });
  return tokens;
}

function partirLineas(ctx, tokens, maxW) {
  const lineas = [];
  let actual = [];
  let ancho = 0;
  const esp = ctx.measureText(" ").width;
  for (const tok of tokens) {
    const w = ctx.measureText(tok.t).width;
    if (actual.length && ancho + esp + w > maxW) {
      lineas.push(actual);
      actual = [];
      ancho = 0;
    }
    actual.push({ ...tok, w });
    ancho += (actual.length > 1 ? esp : 0) + w;
  }
  if (actual.length) lineas.push(actual);
  return lineas;
}

// Ajusta el tamaño de letra hasta que el texto quepa en maxLineas.
function medirBloque(ctx, texto, { peso, familia, tamaño, minTamaño, maxW, maxLineas }) {
  const tokens = tokenizar(texto);
  let t = tamaño;
  let lineas;
  do {
    ctx.font = `${peso} ${t}px ${familia}`;
    lineas = partirLineas(ctx, tokens, maxW);
    if (lineas.length <= maxLineas) break;
    t -= 4;
  } while (t >= minTamaño);
  return { lineas, tamaño: t, font: `${peso} ${t}px ${familia}` };
}

function dibujarBloque(ctx, bloque, x, y, { color, alineacion = "left", interlineado = 1.12 }) {
  ctx.font = bloque.font;
  ctx.textBaseline = "top";
  const esp = ctx.measureText(" ").width;
  const alto = bloque.tamaño * interlineado;
  bloque.lineas.forEach((linea, i) => {
    const anchoLinea = linea.reduce((s, tk, j) => s + tk.w + (j ? esp : 0), 0);
    let cx = alineacion === "center" ? x - anchoLinea / 2 : x;
    linea.forEach((tk) => {
      ctx.fillStyle = tk.h ? VERDE : color;
      ctx.fillText(tk.t, cx, y + i * alto);
      cx += tk.w + esp;
    });
  });
  return y + bloque.lineas.length * alto;
}

const altoBloque = (b, inter = 1.12) => b.lineas.length * b.tamaño * inter;

/* ─── Piezas gráficas ─────────────────────────────────────── */

function rectRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarFondo(ctx, img, tipo) {
  if (img) {
    const r = Math.max(ANCHO / img.width, ALTO / img.height);
    const w = img.width * r;
    const h = img.height * r;
    ctx.drawImage(img, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
    g.addColorStop(0, "#0b2a10");
    g.addColorStop(0.55, "#14451a");
    g.addColorStop(1, "#071a07");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ANCHO, ALTO);
  }
  // Capa oscura para que el texto siempre se lea. Más fuerte abajo, donde va el texto.
  const ov = ctx.createLinearGradient(0, 0, 0, ALTO);
  if (tipo === "cta") {
    ov.addColorStop(0, "rgba(3,12,4,0.55)");
    ov.addColorStop(1, "rgba(3,12,4,0.80)");
  } else {
    ov.addColorStop(0, "rgba(3,12,4,0.45)");
    ov.addColorStop(0.35, "rgba(3,12,4,0.10)");
    ov.addColorStop(0.62, "rgba(3,12,4,0.55)");
    ov.addColorStop(1, "rgba(3,12,4,0.92)");
  }
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, ANCHO, ALTO);
}

function dibujarCabecera(ctx, logo, indice, total) {
  // Marca arriba a la izquierda
  let x = PAD;
  if (logo) {
    const h = 64;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, x, PAD - 20, w, h);
    x += w + 16;
  }
  ctx.font = `700 30px ${FUENTE_TITULO}`;
  ctx.fillStyle = BLANCO;
  ctx.textBaseline = "middle";
  ctx.fillText("EARTH PARK", x, PAD + 12);

  // Contador arriba a la derecha
  const txt = `${indice + 1}/${total}`;
  ctx.font = `600 28px ${FUENTE_TEXTO}`;
  const w = ctx.measureText(txt).width + 40;
  rectRedondo(ctx, ANCHO - PAD - w, PAD - 10, w, 48, 24);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.fillStyle = BLANCO;
  ctx.fillText(txt, ANCHO - PAD - w + 20, PAD + 14);
}

function dibujarPie(ctx, ultima) {
  ctx.textBaseline = "middle";
  ctx.font = `500 30px ${FUENTE_TEXTO}`;
  ctx.fillStyle = GRIS;
  ctx.fillText("@earthpark.co", PAD, ALTO - PAD + 10);
  if (!ultima) {
    const txt = "Desliza  →";
    ctx.font = `700 32px ${FUENTE_TITULO}`;
    const w = ctx.measureText(txt).width;
    ctx.fillStyle = VERDE;
    ctx.fillText(txt, ANCHO - PAD - w, ALTO - PAD + 10);
  }
}

/* ─── Slides ──────────────────────────────────────────────── */

const ZONA_INF = ALTO - PAD - 60; // límite inferior del texto (encima del pie)
const MAX_W = ANCHO - PAD * 2;

function slidePortada(ctx, s) {
  const titulo = medirBloque(ctx, s.titulo, { peso: 800, familia: FUENTE_TITULO, tamaño: 112, minTamaño: 64, maxW: MAX_W, maxLineas: 5 });
  const texto = s.texto ? medirBloque(ctx, s.texto, { peso: 500, familia: FUENTE_TEXTO, tamaño: 40, minTamaño: 30, maxW: MAX_W, maxLineas: 3 }) : null;
  const alto = altoBloque(titulo, 1.05) + (texto ? 36 + altoBloque(texto, 1.3) : 0);
  let y = ZONA_INF - alto;
  y = dibujarBloque(ctx, titulo, PAD, y, { color: BLANCO, interlineado: 1.05 });
  if (texto) dibujarBloque(ctx, texto, PAD, y + 36, { color: GRIS, interlineado: 1.3 });
}

function slideContenido(ctx, s) {
  const items = (s.items || []).filter(Boolean);
  const titulo = medirBloque(ctx, s.titulo, { peso: 800, familia: FUENTE_TITULO, tamaño: 84, minTamaño: 52, maxW: MAX_W, maxLineas: 4 });
  const texto = s.texto ? medirBloque(ctx, s.texto, { peso: 500, familia: FUENTE_TEXTO, tamaño: 40, minTamaño: 30, maxW: MAX_W, maxLineas: items.length ? 3 : 6 }) : null;

  // Lista en una tarjeta translúcida
  const filas = items.map((it) =>
    medirBloque(ctx, it, { peso: 500, familia: FUENTE_TEXTO, tamaño: 36, minTamaño: 28, maxW: MAX_W - 120, maxLineas: 2 }));
  const altoFilas = filas.reduce((s, f) => s + altoBloque(f, 1.25) + 22, 0);
  const altoTarjeta = items.length ? altoFilas + 50 : 0;

  const alto = altoBloque(titulo, 1.08) + (texto ? 28 + altoBloque(texto, 1.3) : 0) + (items.length ? 36 + altoTarjeta : 0);
  let y = ZONA_INF - alto;
  y = dibujarBloque(ctx, titulo, PAD, y, { color: BLANCO, interlineado: 1.08 });
  if (texto) y = dibujarBloque(ctx, texto, PAD, y + 28, { color: GRIS, interlineado: 1.3 });
  if (items.length) {
    y += 36;
    rectRedondo(ctx, PAD - 24, y, MAX_W + 48, altoTarjeta, 28);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    ctx.fill();
    let fy = y + 28;
    filas.forEach((f) => {
      ctx.beginPath();
      ctx.arc(PAD + 22, fy + f.tamaño * 0.62, 18, 0, Math.PI * 2);
      ctx.fillStyle = VERDE;
      ctx.fill();
      ctx.font = `800 22px ${FUENTE_TITULO}`;
      ctx.fillStyle = "#0b2a10";
      ctx.textBaseline = "middle";
      ctx.fillText("✓", PAD + 13, fy + f.tamaño * 0.62 + 1);
      fy = dibujarBloque(ctx, f, PAD + 64, fy, { color: BLANCO, interlineado: 1.25 }) + 22;
    });
  }
}

function slideCta(ctx, s, extra) {
  const cx = ANCHO / 2;
  const titulo = medirBloque(ctx, s.titulo, { peso: 800, familia: FUENTE_TITULO, tamaño: 96, minTamaño: 56, maxW: MAX_W, maxLineas: 4 });
  const texto = s.texto ? medirBloque(ctx, s.texto, { peso: 500, familia: FUENTE_TEXTO, tamaño: 40, minTamaño: 30, maxW: MAX_W, maxLineas: 4 }) : null;
  const palabra = extra?.palabra_comentar;
  const alto = altoBloque(titulo, 1.08) + (texto ? 32 + altoBloque(texto, 1.3) : 0) + (palabra ? 60 + 110 : 0);
  let y = (ALTO - alto) / 2;
  y = dibujarBloque(ctx, titulo, cx, y, { color: BLANCO, alineacion: "center", interlineado: 1.08 });
  if (texto) y = dibujarBloque(ctx, texto, cx, y + 32, { color: GRIS, alineacion: "center", interlineado: 1.3 });
  if (palabra) {
    const etiqueta = `Comenta  ${String(palabra).toUpperCase()}`;
    ctx.font = `800 48px ${FUENTE_TITULO}`;
    const w = ctx.measureText(etiqueta).width + 96;
    y += 60;
    rectRedondo(ctx, cx - w / 2, y, w, 110, 55);
    ctx.fillStyle = VERDE;
    ctx.fill();
    ctx.fillStyle = "#0b2a10";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(etiqueta, cx, y + 57);
    ctx.textAlign = "left";
  }
}

/**
 * Dibuja una slide y devuelve el canvas.
 * extra = { palabra_comentar } del carrusel completo.
 */
export async function renderizarSlide(slide, indice, total, imagen, extra) {
  await cargarFuentes();
  const logo = await cargarLogo();
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");

  const ultima = indice === total - 1;
  const tipo = slide.tipo === "cta" || (ultima && slide.tipo !== "portada") ? "cta" : (indice === 0 ? "portada" : slide.tipo);

  dibujarFondo(ctx, imagen, tipo);
  dibujarCabecera(ctx, logo, indice, total);
  if (tipo === "portada") slidePortada(ctx, slide);
  else if (tipo === "cta") slideCta(ctx, slide, extra);
  else slideContenido(ctx, slide);
  dibujarPie(ctx, ultima);
  return canvas;
}

export const canvasABlob = (canvas) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
