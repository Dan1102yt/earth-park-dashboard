// Motor de animación tipo "explainer" (línea fina, fondo oscuro, un color de acento).
// Todo se calcula a partir del tiempo: dibujarFrame(ctx, guion, t) siempre da el mismo
// resultado para el mismo t. Eso permite la vista previa en vivo y exportar fotograma a fotograma.

import { ICONOS } from "./iconos";

export const ANCHO = 1080;
export const ALTO = 1920;
export const FPS = 30;

export const TEMAS = {
  bosque: { nombre: "Bosque", fondo: "#06140a", brillo: "rgba(74,160,60,0.22)", linea: "#efe8d6", tenue: "rgba(239,232,214,0.55)", acento: "#a3e635" },
  calido: { nombre: "Cálido", fondo: "#120c07", brillo: "rgba(230,120,40,0.20)", linea: "#f3e9d8", tenue: "rgba(243,233,216,0.55)", acento: "#f28c28" },
  noche:  { nombre: "Noche",  fondo: "#070b16", brillo: "rgba(80,120,230,0.20)", linea: "#e8ecf6", tenue: "rgba(232,236,246,0.55)", acento: "#7dd3fc" },
};

const FUENTE_TITULO = "Outfit, Inter, system-ui, sans-serif";
const FUENTE_TEXTO = "Inter, system-ui, sans-serif";

/* ─── Utilidades ──────────────────────────────────────────── */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeBack = (t) => { t = clamp(t); const c = 1.7; return Math.max(0, 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)); };
const num = (v, d) => (Number.isFinite(+v) ? +v : d);

// Longitud de cada trazo SVG (para el efecto "se dibuja solo"); se calcula una vez.
const longitudes = new Map();
const caminos = new Map();
function trazo(d) {
  if (!caminos.has(d)) caminos.set(d, new Path2D(d));
  if (!longitudes.has(d)) {
    let L = 300;
    try {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      L = p.getTotalLength() || 300;
    } catch { /* sin DOM SVG: valor aproximado */ }
    longitudes.set(d, L);
  }
  return { path: caminos.get(d), largo: longitudes.get(d) };
}

export async function cargarFuentes() {
  try {
    await Promise.all([
      document.fonts.load(`700 64px Outfit`), document.fonts.load(`800 64px Outfit`),
      document.fonts.load(`500 32px Inter`), document.fonts.load(`600 32px Inter`),
    ]);
  } catch { /* se usa la fuente del sistema */ }
}

/* ─── Normalizar el guion que manda el agente ─────────────── */

export function normalizarGuion(g) {
  const escenas = (g?.escenas || []).map((e) => ({
    duracion: clamp(num(e.duracion, 3.5), 1.5, 8),
    texto: String(e.texto || ""),
    elementos: (e.elementos || []).slice(0, 10).map((el) => ({ ...el, x: num(el.x, 540), y: num(el.y, 1100) })),
  }));
  if (g?.cta?.palabra) {
    escenas.push({ duracion: 3.5, texto: g.cta.texto || "", cta: String(g.cta.palabra).toUpperCase(), elementos: [] });
  }
  let t = 0;
  for (const e of escenas) { e.inicio = t; t += e.duracion; }
  return { ...g, escenas, total: t, tema: TEMAS[g?.tema] ? g.tema : "bosque" };
}

/* ─── Texto ───────────────────────────────────────────────── */

function palabras(texto) {
  const out = [];
  String(texto).split(/(\*[^*]+\*)/g).forEach((parte) => {
    const h = parte.length > 2 && parte.startsWith("*") && parte.endsWith("*");
    // Si una parte empieza pegada (ej. ", fogata" después de *embalse*), la puntuación va unida a la palabra anterior
    const pegada = !h && out.length && /^[.,;:!?)»]/.test(parte);
    (h ? parte.slice(1, -1) : parte).split(/\s+/).filter(Boolean).forEach((w, i) => {
      if (i === 0 && pegada) {
        const m = w.match(/^[.,;:!?)»]+/)[0];
        out[out.length - 1] = { ...out[out.length - 1], w: out[out.length - 1].w + m };
        w = w.slice(m.length);
        if (!w) return;
      }
      out.push({ w, h });
    });
  });
  return out;
}

function lineasDe(ctx, ws, maxW) {
  const lineas = [[]];
  let ancho = 0;
  const esp = ctx.measureText(" ").width;
  for (const p of ws) {
    const w = ctx.measureText(p.w).width;
    if (lineas.at(-1).length && ancho + esp + w > maxW) { lineas.push([]); ancho = 0; }
    lineas.at(-1).push({ ...p, ancho: w });
    ancho += (lineas.at(-1).length > 1 ? esp : 0) + w;
  }
  return lineas;
}

// Texto de la escena: aparece palabra por palabra, arriba del cuadro.
function dibujarTextoEscena(ctx, texto, t, dur, tema, centrado = false, yBase = 250, tamaño = 74) {
  const ws = palabras(texto);
  if (!ws.length) return;
  ctx.font = `700 ${tamaño}px ${FUENTE_TITULO}`;
  let lineas = lineasDe(ctx, ws, 920);
  while (lineas.length > 4 && tamaño > 46) {
    tamaño -= 4;
    ctx.font = `700 ${tamaño}px ${FUENTE_TITULO}`;
    lineas = lineasDe(ctx, ws, 920);
  }
  const esp = ctx.measureText(" ").width;
  const alto = tamaño * 1.18;
  const ventana = Math.min(1.3, dur * 0.4);       // tiempo total en que aparecen todas las palabras
  const paso = ventana / Math.max(1, ws.length);
  let k = 0;
  const base = ctx.globalAlpha;
  ctx.textBaseline = "top";
  lineas.forEach((linea, li) => {
    const anchoLinea = linea.reduce((s, p, i) => s + p.ancho + (i ? esp : 0), 0);
    let x = centrado ? (ANCHO - anchoLinea) / 2 : 80;
    linea.forEach((p) => {
      const a = easeOut((t - k * paso) / 0.28);
      if (a > 0) {
        ctx.globalAlpha = base * a;
        ctx.fillStyle = p.h ? tema.acento : tema.linea;
        ctx.fillText(p.w, x, yBase + li * alto + (1 - a) * 18);
      }
      x += p.ancho + esp;
      k++;
    });
  });
  ctx.globalAlpha = base;
}

/* ─── Elementos ───────────────────────────────────────────── */

function dibujarTrazos(ctx, trazos, progreso, color, grosor, relleno) {
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const lista = trazos.map(trazo);
  const total = lista.reduce((s, x) => s + x.largo, 0);
  let restante = progreso * total;
  for (const { path, largo } of lista) {
    if (restante <= 0) break;
    const visible = Math.min(largo, restante);
    if (relleno && progreso >= 1) { ctx.fillStyle = relleno; ctx.fill(path); }
    ctx.setLineDash(visible >= largo ? [] : [visible, largo + 1]);
    ctx.stroke(path);
    restante -= largo;
  }
  ctx.setLineDash([]);
}

function etiquetaBajo(ctx, texto, y, tema, alpha) {
  if (!texto) return;
  ctx.globalAlpha *= alpha;
  ctx.font = `600 30px ${FUENTE_TEXTO}`;
  ctx.fillStyle = tema.tenue;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const t = String(texto).toUpperCase().split("").join(" "); // un poco de espaciado
  ctx.fillText(t, 0, y);
  ctx.textAlign = "left";
}

function dibujarElemento(ctx, el, t, tema) {
  const inicio = num(el.inicio, 0.3);
  const durEnt = num(el.duracion_entrada, el.entrada === "dibujar" || !el.entrada ? 1 : 0.6);
  const p = clamp((t - inicio) / durEnt);
  if (t < inicio) return;

  const tam = clamp(num(el.tam, 220), 40, 900);
  let x = el.x, y = el.y, escala = 1, alpha = 1, giro = 0;

  // Movimiento de un punto a otro
  if (el.mover) {
    const m = clamp((t - num(el.mover.inicio, inicio + durEnt)) / num(el.mover.duracion, 1));
    const e = easeInOut(m);
    x += (num(el.mover.x, el.x) - el.x) * e;
    y += (num(el.mover.y, el.y) - el.y) * e;
  }

  // Entrada
  const entrada = el.entrada || "dibujar";
  let progresoTrazo = 1;
  if (entrada === "dibujar") progresoTrazo = easeOut(p);
  else if (entrada === "aparecer") alpha = easeOut(p);
  else if (entrada === "pop") { escala = easeBack(p); alpha = clamp(p * 3); }
  else if (entrada.startsWith("deslizar")) {
    const d = (1 - easeOut(p)) * 220;
    if (entrada.endsWith("izq")) x -= d; else if (entrada.endsWith("der")) x += d; else y += d;
    alpha = easeOut(p);
  }

  // Efectos continuos
  const tt = t - inicio;
  if (el.efecto === "flotar") y += Math.sin(tt * 2.2) * 10;
  if (el.efecto === "latir") escala *= 1 + Math.max(0, Math.sin(tt * 5)) * 0.06;
  if (el.efecto === "girar") giro = tt * 0.8;
  if (el.efecto === "temblar") x += Math.sin(tt * 40) * 3;

  // Atenuar (pasa a segundo plano) y salir
  if (el.atenuar != null) alpha *= 1 - 0.7 * easeOut((t - num(el.atenuar, 99)) / 0.5);
  if (el.salir != null) alpha *= 1 - easeOut((t - num(el.salir, 99)) / 0.4);
  if (alpha <= 0.01) return;

  const color = el.acento ? tema.acento : tema.linea;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (giro) ctx.rotate(giro);
  ctx.scale(escala, escala);

  const tipo = el.tipo;
  if (ICONOS[tipo] || tipo === "custom") {
    const trazos = tipo === "custom" ? (el.trazos || []).filter((d) => typeof d === "string").slice(0, 12) : ICONOS[tipo];
    const s = tam / 100;
    ctx.save();
    ctx.translate(-tam / 2, -tam / 2);
    ctx.scale(s, s);
    dibujarTrazos(ctx, trazos, progresoTrazo, color, 6 / s, el.acento ? "rgba(255,255,255,0.04)" : null);
    ctx.restore();
    etiquetaBajo(ctx, el.etiqueta, tam / 2 + 18, tema, clamp(p * 2 - 0.5));
  } else if (tipo === "texto") {
    const tf = clamp(num(el.tam, 56), 20, 160);
    ctx.font = `${el.negrita === false ? 500 : 800} ${tf}px ${FUENTE_TITULO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ws = palabras(el.texto || "");
    const total = ws.reduce((s, w, i) => s + ctx.measureText(w.w).width + (i ? ctx.measureText(" ").width : 0), 0);
    let cx = -total / 2;
    ctx.textAlign = "left";
    ws.forEach((w) => {
      ctx.fillStyle = w.h || el.acento ? tema.acento : tema.linea;
      ctx.fillText(w.w, cx, 0);
      cx += ctx.measureText(w.w + " ").width;
    });
  } else if (tipo === "contador") {
    const desde = num(el.desde, 0), hasta = num(el.hasta, 100);
    const v = desde + (hasta - desde) * easeOut(clamp((t - inicio) / num(el.duracion_conteo, 1.5)));
    const dec = Number.isInteger(hasta) && Number.isInteger(desde) ? 0 : 1;
    const txt = `${el.prefijo || ""}${v.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${el.sufijo || ""}`;
    const tf = clamp(num(el.tam, 150), 40, 260);
    ctx.font = `800 ${tf}px ${FUENTE_TITULO}`;
    ctx.fillStyle = el.acento === false ? tema.linea : tema.acento;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, 0, 0);
    etiquetaBajo(ctx, el.etiqueta, tf * 0.6, tema, 1);
  } else if (tipo === "barras") {
    const vals = (el.valores || []).map((v) => num(v, 0)).slice(0, 8);
    const max = Math.max(1, ...vals);
    const ancho = num(el.ancho, 720), alto = num(el.alto, 480);
    const bw = ancho / Math.max(1, vals.length) * 0.6;
    ctx.strokeStyle = tema.tenue; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-ancho / 2, alto / 2); ctx.lineTo(ancho / 2, alto / 2); ctx.stroke();
    vals.forEach((v, i) => {
      const k = easeOut(clamp((t - inicio - i * 0.15) / 0.7));
      const h = (v / max) * alto * k;
      const bx = -ancho / 2 + (i + 0.2) * (ancho / vals.length);
      const destacada = (el.destacar ?? vals.indexOf(max)) === i;
      ctx.strokeStyle = destacada ? tema.acento : tema.linea;
      ctx.fillStyle = destacada ? tema.acento + "33" : "rgba(255,255,255,0.04)";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.rect(bx, alto / 2 - h, bw, h); ctx.fill(); ctx.stroke();
      if (el.etiquetas?.[i]) {
        ctx.font = `600 28px ${FUENTE_TEXTO}`; ctx.fillStyle = tema.tenue; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(String(el.etiquetas[i]), bx + bw / 2, alto / 2 + 14); ctx.textAlign = "left";
      }
    });
  } else if (tipo === "linea") {
    const x2 = num(el.x2, el.x + 300) - el.x, y2 = num(el.y2, el.y) - el.y;
    const k = easeOut(p);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round";
    if (el.punteada) ctx.setLineDash([14, 16]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2 * k, y2 * k); ctx.stroke();
    ctx.setLineDash([]);
    if (el.etiqueta) {
      ctx.translate(x2 / 2, y2 / 2 - 50);
      etiquetaBajo(ctx, el.etiqueta, 0, tema, k);
    }
  } else if (tipo === "caja") {
    const w = num(el.ancho, 360), h = num(el.alto, 160);
    const k = easeOut(p);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.setLineDash([(w + h) * 2 * k, (w + h) * 2]);
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    if (el.etiqueta) {
      ctx.globalAlpha *= clamp(k * 2 - 0.6);
      ctx.font = `700 ${clamp(num(el.tam_texto, 40), 20, 90)}px ${FUENTE_TITULO}`;
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(el.etiqueta), 0, 2); ctx.textAlign = "left";
    }
  } else if (tipo === "puntos") {
    const total = clamp(num(el.total, 10), 1, 30), activos = clamp(num(el.activos, 5), 0, total);
    const cols = Math.min(total, num(el.columnas, 5));
    const r = num(el.radio, 26), gap = r * 2.7;
    const filas = Math.ceil(total / cols);
    for (let i = 0; i < total; i++) {
      const cx = (i % cols - (cols - 1) / 2) * gap, cy = (Math.floor(i / cols) - (filas - 1) / 2) * gap;
      const k = easeBack(clamp((t - inicio - i * 0.08) / 0.4));
      const lleno = i < activos && t - inicio > 0.4 + i * 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      ctx.lineWidth = 5; ctx.strokeStyle = lleno ? tema.acento : tema.linea; ctx.stroke();
      if (lleno) { ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = tema.acento; ctx.fill(); }
    }
  }
  ctx.restore();
}

/* ─── Escena de cierre (CTA) ──────────────────────────────── */

function dibujarCta(ctx, escena, t, tema) {
  dibujarTextoEscena(ctx, escena.texto, t, escena.duracion, tema, true, 560);
  const k = easeBack(clamp((t - 0.6) / 0.5));
  if (k <= 0) return;
  const pulso = 1 + Math.max(0, Math.sin((t - 1.1) * 6)) * 0.04 * (t > 1.1 ? 1 : 0);
  const etiqueta = `Comenta  ${escena.cta}`;
  ctx.save();
  ctx.translate(ANCHO / 2, 1080);
  ctx.scale(k * pulso, k * pulso);
  ctx.font = `800 76px ${FUENTE_TITULO}`;
  const w = ctx.measureText(etiqueta).width + 120;
  ctx.fillStyle = tema.acento;
  ctx.beginPath(); ctx.roundRect(-w / 2, -75, w, 150, 75); ctx.fill();
  ctx.fillStyle = tema.fondo;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(etiqueta, 0, 4);
  ctx.restore();

  // Mariposa de marca subiendo suave
  const m = clamp((t - 1) / 1.2);
  if (m > 0) {
    ctx.save();
    ctx.globalAlpha = easeOut(m);
    ctx.translate(ANCHO / 2, 1420 - easeOut(m) * 40 + Math.sin(t * 2) * 8);
    const s = 1.8;
    ctx.translate(-50 * s, -50 * s); ctx.scale(s, s);
    dibujarTrazos(ctx, ICONOS.mariposa, easeOut(m), tema.acento, 6 / s);
    ctx.restore();
  }
}

/* ─── Fotograma completo ──────────────────────────────────── */

export function dibujarFrame(ctx, guion, tiempo) {
  const tema = TEMAS[guion.tema] || TEMAS.bosque;
  // Fondo con un brillo suave en el centro
  ctx.fillStyle = tema.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const g = ctx.createRadialGradient(ANCHO / 2, ALTO * 0.58, 50, ANCHO / 2, ALTO * 0.58, ALTO * 0.6);
  g.addColorStop(0, tema.brillo);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  const t = clamp(tiempo, 0, guion.total - 1e-6);
  const escena = guion.escenas.find((e) => t >= e.inicio && t < e.inicio + e.duracion) || guion.escenas.at(-1);
  if (escena) {
    const lt = t - escena.inicio;
    // Transición: la escena entra y sale con un fundido corto
    const esUltima = escena === guion.escenas.at(-1);
    ctx.globalAlpha = Math.min(clamp(lt / 0.25), esUltima ? 1 : clamp((escena.duracion - lt) / 0.2));
    ctx.save();
    if (escena.cta) dibujarCta(ctx, escena, lt, tema);
    else {
      dibujarTextoEscena(ctx, escena.texto, lt, escena.duracion, tema);
      escena.elementos.forEach((el) => dibujarElemento(ctx, el, lt, tema));
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Barra de progreso arriba (ayuda a que vean el video completo) y marca abajo
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(80, 150, ANCHO - 160, 6);
  ctx.fillStyle = tema.acento;
  ctx.fillRect(80, 150, (ANCHO - 160) * clamp(tiempo / guion.total), 6);
  ctx.font = `600 30px ${FUENTE_TEXTO}`;
  ctx.fillStyle = tema.tenue;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("@earthpark.co", ANCHO / 2, ALTO - 150);
  ctx.textAlign = "left";
}
