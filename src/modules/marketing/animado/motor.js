// Motor de animación tipo "explainer" profesional (línea fina, fondo oscuro, un color de acento).
// Todo se calcula a partir del tiempo: dibujarFrame(ctx, guion, t) siempre da el mismo resultado
// para el mismo t. Así funcionan igual la vista previa en vivo y la exportación fotograma a fotograma.

import { ICONOS } from "./iconos";

export const ANCHO = 1080;
export const ALTO = 1920;
export const FPS = 30;

export const TEMAS = {
  bosque: { nombre: "Bosque", fondo: "#04110a", fondo2: "#0b2414", brillo: "rgba(90,180,70,0.24)", linea: "#f1ecdf", tenue: "rgba(241,236,223,0.55)", acento: "#a3e635", acentoRGB: "163,230,53" },
  calido: { nombre: "Cálido", fondo: "#0f0905", fondo2: "#24150a", brillo: "rgba(240,130,40,0.22)", linea: "#f6ecdc", tenue: "rgba(246,236,220,0.55)", acento: "#f59e0b", acentoRGB: "245,158,11" },
  amarillo: { nombre: "Amarillo", fondo: "#100d02", fondo2: "#2a2205", brillo: "rgba(250,204,21,0.22)", linea: "#fbf7e6", tenue: "rgba(251,247,230,0.55)", acento: "#facc15", acentoRGB: "250,204,21" },
  noche:  { nombre: "Noche",  fondo: "#050813", fondo2: "#0d1630", brillo: "rgba(90,130,240,0.22)", linea: "#eaf0fb", tenue: "rgba(234,240,251,0.55)", acento: "#7dd3fc", acentoRGB: "125,211,252" },
};

const FUENTE_TITULO = "Outfit, Inter, system-ui, sans-serif";
const FUENTE_TEXTO = "Inter, system-ui, sans-serif";

// Zonas del lienzo
const ZONA_TITULO_Y = 230;
const ZONA_ELEM = { x0: 90, x1: 990, y0: 640 };
const Y_SUBTITULOS = 1545;
const Y_LOGO = 1770;
const TRANS = 0.32; // duración de la transición entre escenas (s)
export const RETRASO_VOZ = 0.2; // la voz empieza un poco después de que entra la escena

/** Texto con reborde oscuro: se lee siempre, sobre cualquier fondo (subtítulos, titulares). */
export function textoConBorde(ctx, txt, x, y, tamaño) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(5, tamaño * 0.16);
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = tamaño * 0.25;
  ctx.strokeText(txt, x, y);
  ctx.restore();
  ctx.fillText(txt, x, y);
}

/* ─── Utilidades ──────────────────────────────────────────── */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeBack = (t) => { t = clamp(t); const c = 1.9; return Math.max(0, 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)); };
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

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
    } catch { /* sin DOM SVG */ }
    longitudes.set(d, L);
  }
  return { path: caminos.get(d), largo: longitudes.get(d) };
}

let logo = null;
export async function cargarRecursos() {
  try {
    await Promise.all([
      document.fonts.load(`800 80px Outfit`), document.fonts.load(`700 64px Outfit`),
      document.fonts.load(`600 32px Inter`), document.fonts.load(`700 54px Inter`),
    ]);
  } catch { /* fuente del sistema */ }
  if (!logo) {
    logo = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${import.meta.env.BASE_URL}logo-earth-park.png`;
    });
  }
}
export const cargarFuentes = cargarRecursos; // compatibilidad

/* ─── Auto-encaje: los elementos de cada escena llenan la zona central ─── */

function extension(el) {
  const x = el.x, y = el.y;
  const t = num(el.tam, 220);
  let w = t, h = t;
  switch (el.tipo) {
    case "caja": w = num(el.ancho, 360); h = num(el.alto, 160); break;
    case "texto": { const n = String(el.texto || "").replace(/\*/g, "").length; h = num(el.tam, 56) * 1.2; w = n * num(el.tam, 56) * 0.56; break; }
    case "contador": { const n = `${el.prefijo || ""}${el.hasta ?? 100}${el.sufijo || ""}`.length; h = num(el.tam, 150) * 1.5; w = n * num(el.tam, 150) * 0.6; break; }
    case "barras": w = num(el.ancho, 720); h = num(el.alto, 480) + 60; break;
    case "puntos": { const tot = num(el.total, 10), cols = Math.min(tot, num(el.columnas, 5)), r = num(el.radio, 26);
      w = cols * r * 2.7; h = Math.ceil(tot / cols) * r * 2.7; break; }
    case "linea": return [Math.min(x, num(el.x2, x)), Math.min(y, num(el.y2, y)), Math.max(x, num(el.x2, x)), Math.max(y, num(el.y2, y))];
    default: if (el.etiqueta) h += 70;
  }
  const caja = [x - w / 2, y - t / 2, x + w / 2, y - t / 2 + h];
  if (!["caja", "texto", "contador", "barras", "puntos"].includes(el.tipo)) return caja;
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}

function encajar(elementos, zona) {
  if (!elementos.length) return elementos;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of elementos) {
    const cajas = [extension(el)];
    if (el.mover) cajas.push(extension({ ...el, x: num(el.mover.x, el.x), y: num(el.mover.y, el.y) }));
    for (const [a, b, c, d] of cajas) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); }
  }
  const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
  const zw = zona.x1 - zona.x0, zh = zona.y1 - zona.y0;
  const s = clamp(Math.min(zw / bw, zh / bh), 0.55, 2.2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const zx = (zona.x0 + zona.x1) / 2, zy = (zona.y0 + zona.y1) / 2;
  const X = (v) => zx + (v - cx) * s;
  const Y = (v) => zy + (v - cy) * s;
  const S = (v, d) => num(v, d) * s;
  return elementos.map((el) => {
    const n = { ...el, x: X(el.x), y: Y(el.y), tam: S(el.tam, el.tipo === "texto" ? 56 : el.tipo === "contador" ? 150 : 220) };
    if (el.ancho != null || ["caja", "barras"].includes(el.tipo)) n.ancho = S(el.ancho, el.tipo === "caja" ? 360 : 720);
    if (el.alto != null || ["caja", "barras"].includes(el.tipo)) n.alto = S(el.alto, el.tipo === "caja" ? 160 : 480);
    if (el.tipo === "puntos") n.radio = S(el.radio, 26);
    if (el.tipo === "caja") n.tam_texto = S(el.tam_texto, 40);
    if (el.tipo === "linea") { n.x2 = X(num(el.x2, el.x + 300)); n.y2 = Y(num(el.y2, el.y)); }
    if (el.mover) n.mover = { ...el.mover, x: X(num(el.mover.x, el.x)), y: Y(num(el.mover.y, el.y)) };
    n.escalaGrupo = s;
    return n;
  });
}

/* ─── Guion ───────────────────────────────────────────────── */

/**
 * voces: [{ dur, palabras:[{w, ini, fin}] } | null] por escena (opcional).
 * Si hay voz, la escena dura lo que dura la narración (+ un respiro).
 */
export function normalizarGuion(g, voces = []) {
  const conSubs = voces.some((v) => v?.palabras?.length);
  const zona = { ...ZONA_ELEM, y1: conSubs ? 1450 : 1640 };
  const escenas = (g?.escenas || []).map((e, i) => {
    const voz = voces[i];
    const base = clamp(num(e.duracion, 3.5), 1.5, 10);
    const duracion = voz?.dur ? Math.max(2, voz.dur + RETRASO_VOZ + 0.45) : base;
    const elementos = (e.elementos || []).slice(0, 10).map((el, k) => ({ ...el, x: num(el.x, 540), y: num(el.y, 1100), _k: k }));
    return { duracion, texto: String(e.texto || ""), elementos: encajar(elementos, zona), voz: voz || null };
  });
  if (g?.cta?.palabra) {
    const i = escenas.length;
    const voz = voces[i];
    escenas.push({
      duracion: voz?.dur ? Math.max(3.2, voz.dur + RETRASO_VOZ + 0.8) : 3.8,
      texto: g.cta.texto || "", cta: String(g.cta.palabra).toUpperCase(), elementos: [], voz: voz || null,
    });
  }
  let t = 0;
  for (const e of escenas) { e.inicio = t; t += e.duracion; }
  return { ...g, escenas, total: Math.max(1, t), tema: TEMAS[g?.tema] ? g.tema : "bosque", conSubs };
}

/* ─── Fondo ───────────────────────────────────────────────── */

function dibujarFondo(ctx, tema, t) {
  const g0 = ctx.createLinearGradient(0, 0, 0, ALTO);
  g0.addColorStop(0, tema.fondo);
  g0.addColorStop(0.55, tema.fondo2);
  g0.addColorStop(1, tema.fondo);
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Brillo que se mueve despacio
  const bx = ANCHO / 2 + Math.sin(t * 0.25) * 160, by = ALTO * 0.55 + Math.cos(t * 0.2) * 120;
  const g = ctx.createRadialGradient(bx, by, 40, bx, by, ALTO * 0.62);
  g.addColorStop(0, tema.brillo);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Partículas (como luciérnagas / polvo en el aire)
  for (let i = 0; i < 46; i++) {
    const vel = 14 + hash(i) * 30;
    const x = (hash(i + 3) * ANCHO + Math.sin(t * 0.6 + i) * 30) % ANCHO;
    const y = ALTO - ((hash(i + 7) * ALTO + t * vel) % (ALTO + 40));
    const r = 1.4 + hash(i + 11) * 3.2;
    const a = (0.15 + hash(i + 13) * 0.45) * (0.6 + 0.4 * Math.sin(t * (1 + hash(i)) + i));
    ctx.fillStyle = `rgba(${tema.acentoRGB},${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Viñeta
  const v = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, ALTO * 0.35, ANCHO / 2, ALTO / 2, ALTO * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, ANCHO, ALTO);
}

/* ─── Texto ───────────────────────────────────────────────── */

function palabras(texto) {
  const out = [];
  String(texto).split(/(\*[^*]+\*)/g).forEach((parte) => {
    const h = parte.length > 2 && parte.startsWith("*") && parte.endsWith("*");
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

// Titular de la escena: cada palabra entra con un pequeño rebote; las palabras clave llevan
// un "marcador" de color que se pinta detrás.
function dibujarTitular(ctx, texto, t, dur, tema, { centrado = true, y = ZONA_TITULO_Y, tamaño = 86 } = {}) {
  const ws = palabras(texto);
  if (!ws.length) return;
  ctx.font = `800 ${tamaño}px ${FUENTE_TITULO}`;
  let lineas = lineasDe(ctx, ws, 940);
  while (lineas.length > 3 && tamaño > 54) {
    tamaño -= 4;
    ctx.font = `800 ${tamaño}px ${FUENTE_TITULO}`;
    lineas = lineasDe(ctx, ws, 940);
  }
  const esp = ctx.measureText(" ").width;
  const alto = tamaño * 1.16;
  const ventana = Math.min(1.1, dur * 0.35);
  const paso = ventana / Math.max(1, ws.length);
  const base = ctx.globalAlpha;
  let k = 0;
  ctx.textBaseline = "middle";
  lineas.forEach((linea, li) => {
    const anchoLinea = linea.reduce((s, p, i) => s + p.ancho + (i ? esp : 0), 0);
    let x = centrado ? (ANCHO - anchoLinea) / 2 : 80;
    const cy = y + li * alto + tamaño / 2;
    linea.forEach((p) => {
      const tp = t - k * paso;
      const a = easeOut(tp / 0.3);
      if (a > 0) {
        const s = 0.55 + 0.45 * easeBack(tp / 0.42);
        ctx.save();
        ctx.translate(x + p.ancho / 2, cy + (1 - a) * 26);
        ctx.scale(s, s);
        ctx.globalAlpha = base * a;
        if (p.h) {
          // Marcador detrás de la palabra clave
          const m = easeOut((tp - 0.25) / 0.45);
          if (m > 0) {
            ctx.fillStyle = `rgba(${tema.acentoRGB},0.22)`;
            ctx.beginPath();
            ctx.roundRect(-p.ancho / 2 - esp / 2 - 4, -tamaño * 0.42, (p.ancho + esp + 8) * m, tamaño * 0.9, 14);
            ctx.fill();
          }
          ctx.shadowColor = `rgba(${tema.acentoRGB},0.55)`;
          ctx.shadowBlur = 24;
        }
        ctx.fillStyle = p.h ? tema.acento : tema.linea;
        ctx.textAlign = "center";
        textoConBorde(ctx, p.w, 0, 0, tamaño);
        ctx.restore();
      }
      x += p.ancho + esp;
      k++;
    });
  });
  ctx.globalAlpha = base;
  ctx.textAlign = "left";
}

// Subtítulos tipo karaoke de la narración: grupos de pocas palabras, la palabra que suena resalta.
function grupos(palabrasVoz) {
  const out = [];
  let actual = [];
  palabrasVoz.forEach((p, i) => {
    actual.push(p);
    const corte = /[.,;:!?]$/.test(p.w) || actual.length >= 4 || (palabrasVoz[i + 1] && palabrasVoz[i + 1].ini - p.fin > 0.35);
    if (corte) { out.push(actual); actual = []; }
  });
  if (actual.length) out.push(actual);
  return out;
}

function dibujarSubtitulos(ctx, voz, lt, tema) {
  if (!voz?.palabras?.length) return;
  const tv = lt - RETRASO_VOZ;
  if (!voz._grupos) voz._grupos = grupos(voz.palabras);
  const gs = voz._grupos;
  let g = null;
  for (let i = 0; i < gs.length; i++) {
    const ini = gs[i][0].ini - 0.08;
    const fin = gs[i + 1] ? gs[i + 1][0].ini - 0.08 : gs[i].at(-1).fin + 0.6;
    if (tv >= ini && tv < fin) { g = gs[i]; break; }
  }
  if (!g) return;
  const tam = 56;
  ctx.font = `800 ${tam}px ${FUENTE_TITULO}`;
  ctx.textBaseline = "middle";
  const esp = Math.max(ctx.measureText(" ").width, tam * 0.36);
  const anchos = g.map((p) => ctx.measureText(p.w.toUpperCase()).width);
  const total = anchos.reduce((s, w) => s + w, 0) + esp * (g.length - 1);
  const entrada = easeOut((tv - g[0].ini + 0.08) / 0.18);
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * entrada;
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath(); ctx.roundRect((ANCHO - total) / 2 - 34, Y_SUBTITULOS - tam * 0.85, total + 68, tam * 1.7, 28); ctx.fill();
  let x = (ANCHO - total) / 2;
  g.forEach((p, i) => {
    const activa = tv >= p.ini - 0.03 && tv <= p.fin + 0.08;
    const dicha = tv > p.fin;
    ctx.save();
    ctx.translate(x + anchos[i] / 2, Y_SUBTITULOS);
    if (activa) ctx.scale(1.08, 1.08);
    ctx.fillStyle = activa ? tema.acento : dicha ? tema.linea : "rgba(255,255,255,0.62)";
    ctx.textAlign = "center";
    textoConBorde(ctx, p.w.toUpperCase(), 0, 0, tam);
    ctx.restore();
    x += anchos[i] + esp;
  });
  ctx.globalAlpha = base;
}

/* ─── Elementos ───────────────────────────────────────────── */

function dibujarTrazos(ctx, trazos, progreso, color, grosor, brillo) {
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (brillo) { ctx.shadowColor = brillo; ctx.shadowBlur = 22; }
  const lista = trazos.map(trazo);
  const total = lista.reduce((s, x) => s + x.largo, 0);
  let restante = progreso * total;
  for (const { path, largo } of lista) {
    if (restante <= 0) break;
    const visible = Math.min(largo, restante);
    ctx.setLineDash(visible >= largo ? [] : [visible, largo + 1]);
    ctx.stroke(path);
    restante -= largo;
  }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function etiquetaBajo(ctx, texto, y, tema, alpha) {
  if (!texto || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `700 34px ${FUENTE_TEXTO}`;
  ctx.fillStyle = tema.tenue;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "4px";
  textoConBorde(ctx, String(texto).toUpperCase(), 0, y, 34);
  ctx.restore();
}

// Anillo que se expande cuando aparece algo importante
function pulso(ctx, t, r, tema) {
  if (t < 0 || t > 0.8) return;
  const k = easeOut(t / 0.8);
  ctx.save();
  ctx.strokeStyle = `rgba(${tema.acentoRGB},${(0.6 * (1 - k)).toFixed(3)})`;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, r * (0.6 + k * 0.8), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function dibujarElemento(ctx, el, t, tema) {
  const inicio = num(el.inicio, 0.3);
  const durEnt = num(el.duracion_entrada, el.entrada === "dibujar" || !el.entrada ? 0.9 : 0.55);
  if (t < inicio) return;
  const p = clamp((t - inicio) / durEnt);
  const tam = Math.max(30, num(el.tam, 220));
  let x = el.x, y = el.y, escala = 1, alpha = 1, giro = 0;

  if (el.mover) {
    const m = easeInOut((t - num(el.mover.inicio, inicio + durEnt)) / num(el.mover.duracion, 1));
    x += (el.mover.x - el.x) * m;
    y += (el.mover.y - el.y) * m;
  }

  const entrada = el.entrada || (ICONOS[el.tipo] || el.tipo === "custom" ? "dibujar" : "pop");
  let progresoTrazo = 1;
  if (entrada === "dibujar") { progresoTrazo = easeOut(p); escala = 0.92 + 0.08 * easeOut(p); }
  else if (entrada === "aparecer") { alpha = easeOut(p); escala = 0.9 + 0.1 * easeOut(p); }
  else if (entrada === "pop") { escala = easeBack(p); alpha = clamp(p * 3); }
  else if (entrada.startsWith("deslizar")) {
    const d = (1 - easeOut(p)) * 260;
    if (entrada.endsWith("izq")) x -= d; else if (entrada.endsWith("der")) x += d; else y += d;
    alpha = easeOut(p);
  }

  // Nada queda quieto: todos los elementos "respiran" un poco
  const tt = t - inicio;
  const fase = (el._k || 0) * 1.7;
  const efecto = el.efecto || "suave";
  if (efecto === "suave") y += Math.sin(tt * 1.6 + fase) * 5;
  if (efecto === "flotar") y += Math.sin(tt * 2.2 + fase) * 14;
  if (efecto === "latir") escala *= 1 + Math.max(0, Math.sin(tt * 5)) * 0.07;
  if (efecto === "girar") giro = tt * 0.8;
  if (efecto === "temblar") x += Math.sin(tt * 40) * 4;

  if (el.atenuar != null) alpha *= 1 - 0.72 * easeOut((t - num(el.atenuar, 99)) / 0.5);
  if (el.salir != null) alpha *= 1 - easeOut((t - num(el.salir, 99)) / 0.4);
  if (alpha <= 0.01) return;

  const color = el.acento ? tema.acento : tema.linea;
  const brillo = el.acento ? `rgba(${tema.acentoRGB},0.65)` : "rgba(255,255,255,0.18)";
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (giro) ctx.rotate(giro);
  ctx.scale(escala, escala);
  if (el.acento) pulso(ctx, t - inicio - durEnt * 0.7, tam * 0.6, tema);

  const tipo = el.tipo;
  if (ICONOS[tipo] || tipo === "custom") {
    const trazos = tipo === "custom" ? (el.trazos || []).filter((d) => typeof d === "string").slice(0, 12) : ICONOS[tipo];
    const s = tam / 100;
    // Disco suave detrás del ícono para darle profundidad
    const d = easeOut(p);
    ctx.fillStyle = el.acento ? `rgba(${tema.acentoRGB},0.08)` : "rgba(255,255,255,0.035)";
    ctx.beginPath(); ctx.arc(0, 0, tam * 0.62 * d, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(-tam / 2, -tam / 2);
    ctx.scale(s, s);
    dibujarTrazos(ctx, trazos, progresoTrazo, color, Math.max(5, Math.min(9, tam / 40)) / s, brillo);
    ctx.restore();
    etiquetaBajo(ctx, el.etiqueta, tam / 2 + 22, tema, clamp(p * 2 - 0.6));
  } else if (tipo === "texto") {
    const tf = clamp(num(el.tam, 56), 20, 220);
    ctx.font = `${el.negrita === false ? 600 : 800} ${tf}px ${FUENTE_TITULO}`;
    ctx.textBaseline = "middle";
    const ws = palabras(el.texto || "");
    const esp = ctx.measureText(" ").width;
    const total = ws.reduce((s, w, i) => s + ctx.measureText(w.w).width + (i ? esp : 0), 0);
    let cx = -total / 2;
    ws.forEach((w) => {
      const acento = w.h || el.acento;
      if (acento) { ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 26; }
      ctx.fillStyle = acento ? tema.acento : tema.linea;
      ctx.shadowBlur = 0;
      textoConBorde(ctx, w.w, cx, 0, tf);
      cx += ctx.measureText(w.w).width + esp;
    });
  } else if (tipo === "contador") {
    const desde = num(el.desde, 0), hasta = num(el.hasta, 100);
    const v = desde + (hasta - desde) * easeOut(clamp((t - inicio) / num(el.duracion_conteo, 1.4)));
    const dec = Number.isInteger(hasta) && Number.isInteger(desde) ? 0 : 1;
    const txt = `${el.prefijo || ""}${v.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${el.sufijo || ""}`;
    const tf = clamp(num(el.tam, 150), 40, 340);
    ctx.font = `800 ${tf}px ${FUENTE_TITULO}`;
    ctx.fillStyle = el.acento === false ? tema.linea : tema.acento;
    ctx.shadowColor = `rgba(${tema.acentoRGB},0.55)`; ctx.shadowBlur = 34;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    textoConBorde(ctx, txt, 0, 0, tf);
    etiquetaBajo(ctx, el.etiqueta, tf * 0.62, tema, 1);
  } else if (tipo === "barras") {
    const vals = (el.valores || []).map((v) => num(v, 0)).slice(0, 8);
    const max = Math.max(1, ...vals);
    const ancho = num(el.ancho, 720), alto = num(el.alto, 480);
    const paso = ancho / Math.max(1, vals.length), bw = paso * 0.58;
    ctx.strokeStyle = tema.tenue; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-ancho / 2, alto / 2); ctx.lineTo(ancho / 2, alto / 2); ctx.stroke();
    vals.forEach((v, i) => {
      const k = easeBack(clamp((t - inicio - i * 0.18) / 0.8));
      const h = (v / max) * alto * Math.min(1.04, k);
      const bx = -ancho / 2 + i * paso + (paso - bw) / 2;
      const dest = num(el.destacar, vals.indexOf(max)) === i;
      ctx.fillStyle = dest ? `rgba(${tema.acentoRGB},0.28)` : "rgba(255,255,255,0.05)";
      ctx.strokeStyle = dest ? tema.acento : tema.linea;
      ctx.lineWidth = 6;
      if (dest) { ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 24; }
      ctx.beginPath(); ctx.roundRect(bx, alto / 2 - h, bw, h, 10); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      if (el.etiquetas?.[i]) {
        ctx.font = `700 ${Math.round(Math.min(38, paso * 0.18))}px ${FUENTE_TEXTO}`; ctx.fillStyle = tema.tenue; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(String(el.etiquetas[i]).toUpperCase(), bx + bw / 2, alto / 2 + 18); ctx.textAlign = "left";
      }
    });
  } else if (tipo === "linea") {
    const x2 = num(el.x2, el.x + 300) - el.x, y2 = num(el.y2, el.y) - el.y;
    const k = easeOut(p);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = "round";
    if (el.acento) { ctx.shadowColor = brillo; ctx.shadowBlur = 18; }
    if (el.punteada) { ctx.setLineDash([16, 18]); ctx.lineDashOffset = -t * 40; }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2 * k, y2 * k); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    if (el.etiqueta) { ctx.translate(x2 / 2, y2 / 2 - 56); etiquetaBajo(ctx, el.etiqueta, 0, tema, k); }
  } else if (tipo === "caja") {
    const w = num(el.ancho, 360), h = num(el.alto, 160);
    const k = easeOut(p);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.fillStyle = el.acento ? `rgba(${tema.acentoRGB},0.10)` : "rgba(255,255,255,0.04)";
    if (el.acento) { ctx.shadowColor = brillo; ctx.shadowBlur = 22; }
    ctx.setLineDash([(w + h) * 2 * k, (w + h) * 2]);
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    if (el.etiqueta) {
      ctx.globalAlpha *= clamp(k * 2 - 0.6);
      ctx.font = `800 ${clamp(num(el.tam_texto, 40), 20, 120)}px ${FUENTE_TITULO}`;
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
      const k = easeBack(clamp((t - inicio - i * 0.07) / 0.45));
      const ll = clamp((t - inicio - 0.5 - i * 0.14) / 0.25);
      const lleno = i < activos ? ll : 0;
      ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(4, r / 6); ctx.strokeStyle = lleno > 0 ? tema.acento : tema.linea; ctx.stroke();
      if (lleno > 0) {
        ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.58 * easeBack(lleno), 0, Math.PI * 2); ctx.fillStyle = tema.acento; ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
  ctx.restore();
}

/* ─── Logo ────────────────────────────────────────────────── */

function dibujarLogo(ctx, x, y, d, alpha = 1) {
  if (!logo || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x, y, d / 2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  ctx.drawImage(logo, x - d / 2, y - d / 2, d, d);
  ctx.restore();
}

/* ─── Escena de cierre (CTA) ──────────────────────────────── */

function dibujarCta(ctx, escena, t, tema) {
  dibujarLogo(ctx, ANCHO / 2, 620, 300 * easeBack(t / 0.6), clamp(t / 0.3));
  dibujarTitular(ctx, escena.texto, t - 0.3, escena.duracion, tema, { y: 830, tamaño: 76 });
  const k = easeBack(clamp((t - 0.9) / 0.5));
  if (k <= 0) return;
  const pulsoK = t > 1.4 ? 1 + Math.max(0, Math.sin((t - 1.4) * 6)) * 0.045 : 1;
  const etiqueta = `Comenta  ${escena.cta}`;
  ctx.save();
  ctx.translate(ANCHO / 2, 1260);
  ctx.scale(k * pulsoK, k * pulsoK);
  ctx.font = `800 82px ${FUENTE_TITULO}`;
  const w = ctx.measureText(etiqueta).width + 130;
  ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 40;
  ctx.fillStyle = tema.acento;
  ctx.beginPath(); ctx.roundRect(-w / 2, -82, w, 164, 82); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = tema.fondo;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(etiqueta, 0, 4);
  ctx.restore();
  pulsoCta(ctx, t - 0.9, tema);
}
function pulsoCta(ctx, t, tema) {
  ctx.save(); ctx.translate(ANCHO / 2, 1260); pulso(ctx, t, 300, tema); ctx.restore();
}

/* ─── Fotograma completo ──────────────────────────────────── */

function dibujarEscena(ctx, escena, lt, tema, guion) {
  // Cámara: acercamiento lento durante toda la escena
  const zoom = 1 + 0.045 * easeInOut(lt / escena.duracion);
  ctx.save();
  ctx.translate(ANCHO / 2, ALTO * 0.55);
  ctx.scale(zoom, zoom);
  ctx.translate(-ANCHO / 2, -ALTO * 0.55);
  if (escena.cta) dibujarCta(ctx, escena, lt, tema);
  else {
    dibujarTitular(ctx, escena.texto, lt, escena.duracion, tema);
    escena.elementos.forEach((el) => dibujarElemento(ctx, el, lt, tema));
  }
  ctx.restore();
  if (guion.conSubs) dibujarSubtitulos(ctx, escena.voz, lt, tema);
}

export function dibujarFrame(ctx, guion, tiempo) {
  const tema = TEMAS[guion.tema] || TEMAS.bosque;
  dibujarFondo(ctx, tema, tiempo);

  const t = clamp(tiempo, 0, guion.total - 1e-6);
  const idx = Math.max(0, guion.escenas.findIndex((e) => t >= e.inicio && t < e.inicio + e.duracion));
  const escena = guion.escenas[idx];
  if (escena) {
    const lt = t - escena.inicio;
    const ultima = idx === guion.escenas.length - 1;
    // Transición: la escena sale hacia arriba mientras la siguiente entra desde abajo
    const entra = idx === 0 ? 1 : easeOut(lt / TRANS);
    const sale = ultima ? 0 : 1 - clamp((escena.duracion - lt) / TRANS);
    ctx.save();
    ctx.globalAlpha = entra * (1 - easeInOut(sale));
    ctx.translate(0, (1 - entra) * 90 - easeInOut(sale) * 90);
    dibujarEscena(ctx, escena, lt, tema, guion);
    ctx.restore();
    // Barrido de luz en el cambio de escena
    if (idx > 0 && lt < TRANS) {
      const k = lt / TRANS;
      ctx.fillStyle = `rgba(${tema.acentoRGB},${(0.10 * (1 - k)).toFixed(3)})`;
      ctx.fillRect(0, ALTO * (1 - k) - 160, ANCHO, 320);
    }
  }

  // Barra de progreso por segmentos (una por escena)
  const n = guion.escenas.length, gap = 10, anchoTotal = ANCHO - 160;
  const seg = (anchoTotal - gap * (n - 1)) / n;
  guion.escenas.forEach((e, i) => {
    const x = 80 + i * (seg + gap);
    const avance = clamp((tiempo - e.inicio) / e.duracion);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath(); ctx.roundRect(x, 130, seg, 7, 4); ctx.fill();
    if (avance > 0) {
      ctx.fillStyle = tema.acento;
      ctx.beginPath(); ctx.roundRect(x, 130, seg * avance, 7, 4); ctx.fill();
    }
  });

  // Logo de marca abajo (en la escena final el logo grande ya está arriba)
  if (!escena?.cta) dibujarLogo(ctx, ANCHO / 2, Y_LOGO, 128, 0.95);
}

// Piezas reutilizadas por el modo cinematográfico
export {
  encajar, palabras, grupos, dibujarElemento, dibujarLogo, dibujarTitular, dibujarTrazos, pulso,
  clamp, easeOut, easeInOut, easeBack, hash, FUENTE_TITULO, FUENTE_TEXTO, TRANS,
};
