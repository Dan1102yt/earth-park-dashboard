// Motor del modo cinematográfico: fondo de video/imagen con movimiento de cámara, clima, gradación,
// subtítulos sincronizados con la voz (palabras clave en "pastilla"), datos animados encima,
// transiciones glitch / zoom y el cierre con el logo.
import {
  ANCHO, ALTO, TEMAS, RETRASO_VOZ, dibujarElemento, dibujarLogo, dibujarTitular, grupos,
  clamp, easeOut, easeInOut, easeBack, hash, FUENTE_TITULO,
} from "../animado/motor";

const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const limpiar = (w) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
export const sinAsteriscos = (s) => String(s || "").replace(/\*/g, "");
const clavesDe = (s) => new Set((String(s || "").match(/\*([^*]+)\*/g) || []).flatMap((m) => m.slice(1, -1).split(/\s+/)).map(limpiar));

const TRANS = 0.35;

/* ─── Guion ───────────────────────────────────────────────── */

/**
 * crudo: guion del agente · voces: por escena (+cierre) {dur, palabras} · recursos: por escena {tipo, img|el, dur}
 */
export function normalizarCine(crudo, voces = [], recursos = []) {
  const doc = crudo?.dimension === "doc";
  const escenas = (crudo?.escenas || []).map((e, i) => {
    const voz = voces[i] || null;
    const base = clamp(num(e.duracion, 4), 2, 10);
    const duracion = voz?.dur ? Math.max(doc ? 1.6 : 2.5, voz.dur + RETRASO_VOZ + (doc ? 0.12 : 0.35)) : (doc ? clamp(base, 2, 4) : base);
    const datos = (doc ? [] : e.datos || []).slice(0, 6).map((d, k) => ({
      ...d, _k: k,
      // Coordenadas del agente (0–1000) → zona útil del video
      x: 60 + num(d.x, 500) * 0.96, y: 520 + num(d.y, 500) * 1.08,
      tam: num(d.tam, 200) * 1.05,
      ...(d.x2 != null ? { x2: 60 + num(d.x2, 500) * 0.96, y2: 520 + num(d.y2, 500) * 1.08 } : {}),
      ...(d.apunta ? { apunta: { x: 60 + num(d.apunta.x, 500) * 0.96, y: 520 + num(d.apunta.y, 500) * 1.08 } } : {}),
    }));
    // Sin voz todavía: repartir las palabras en el tiempo para poder ver los subtítulos
    const subt = voz?.palabras?.length ? voz : palabrasRepartidas(e.narracion, duracion);
    return {
      duracion, voz: subt, datos, recurso: recursos[i] || null,
      claves: clavesDe(e.narracion),
      textoSinVoz: e.narracion || "",
      camara: e.visual?.camara || "acercar",
      clima: e.visual?.clima || "ninguno",
      transicion: i === 0 ? "ninguna" : doc ? "corte" : (e.transicion || (i % 2 ? "glitch" : "zoom")),
    };
  });
  if (crudo?.cta?.palabra) {
    const i = escenas.length;
    const voz = voces[i] || null;
    escenas.push({
      duracion: voz?.dur ? Math.max(3.2, voz.dur + RETRASO_VOZ + 0.8) : 3.8,
      cta: String(crudo.cta.palabra).toUpperCase(), texto: crudo.cta.texto || "", voz,
      recurso: escenas.at(-1)?.recurso || null, datos: [], claves: new Set(), camara: "alejar", clima: "ninguno",
      transicion: "zoom",
    });
  }
  let t = 0;
  for (const e of escenas) { e.inicio = t; t += e.duracion; }
  return { escenas, total: Math.max(1, t), tema: TEMAS[crudo?.tema] ? crudo.tema : "bosque", formato: doc ? "doc" : "reel" };
}

function palabrasRepartidas(texto, duracion) {
  const ws = sinAsteriscos(texto).split(/\s+/).filter(Boolean);
  if (!ws.length) return null;
  const paso = Math.max(0.18, (duracion - RETRASO_VOZ - 0.5) / ws.length);
  return { palabras: ws.map((w, i) => ({ w, ini: i * paso, fin: i * paso + paso * 0.9 })) };
}

/** Segundo del clip que corresponde al tiempo local de la escena (si el clip es corto, va más lento y luego se congela). */
export function tiempoClip(escena, lt) {
  const dur = escena.recurso?.dur || 6;
  const vel = clamp(dur / escena.duracion, 0.6, 1);
  return Math.min(lt * vel, Math.max(0, dur - 0.06));
}

/* ─── Fondo ───────────────────────────────────────────────── */

// Encuadre del fondo en cada instante: dónde queda la imagen/clip dentro del lienzo.
// Se usa para dibujar el fondo y para que las etiquetas apunten al punto exacto de la imagen.
function encuadre(escena, lt, area = { x: 0, y: 0, w: ANCHO, h: ALTO }) {
  const r = escena.recurso;
  if (!r) return null;
  const k = easeInOut(lt / escena.duracion);
  let w, h, s = 1, dx = 0, dy = 0;
  if (r.tipo === "video") {
    w = r.el.videoWidth || 720; h = r.el.videoHeight || 1280; s = 1.02 + 0.04 * k;
  } else {
    w = r.img.width; h = r.img.height;
    [s, dx, dy] = {
      acercar: [1.04 + 0.14 * k, 0, 0],
      alejar: [1.18 - 0.14 * k, 0, 0],
      paneo_izq: [1.16, 70 - 140 * k, 0],
      paneo_der: [1.16, -70 + 140 * k, 0],
      subir: [1.16, 0, 110 - 220 * k],
      bajar: [1.16, 0, -110 + 220 * k],
      orbita: [1.12 + 0.06 * k, Math.sin(k * Math.PI) * 60, 0],
    }[escena.camara] || [1.04 + 0.14 * k, 0, 0];
  }
  const esc = Math.max(area.w / w, area.h / h) * s;
  const W = w * esc, H = h * esc;
  return { x: area.x + (area.w - W) / 2 + dx, y: area.y + (area.h - H) / 2 + dy, W, H };
}

/** Punto (nx, ny en 0–1 de la imagen) → coordenadas del lienzo en el instante lt. */
export function puntoEnLienzo(escena, lt, nx, ny) {
  const e = encuadre(escena, lt);
  if (!e) return { x: nx * ANCHO, y: ny * ALTO };
  return { x: e.x + nx * e.W, y: e.y + ny * e.H };
}

function dibujarFondo(ctx, escena, lt, tema) {
  const r = escena.recurso;
  const e = encuadre(escena, lt);
  if (!e) {
    const g = ctx.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0, tema.fondo); g.addColorStop(1, tema.fondo2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
    return;
  }
  const fuente = r.tipo === "video" ? r.el : r.img;
  if (escena.cta) { ctx.save(); ctx.filter = "blur(14px)"; }
  ctx.drawImage(fuente, e.x, e.y, e.W, e.H);
  if (escena.cta) ctx.restore();
}

function gradacion(ctx, escena, tema) {
  // Oscurecer arriba (subtítulos) y abajo (logo), viñeta y un leve tinte del color del tema
  const g = ctx.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, "rgba(0,0,0,0.62)");
  g.addColorStop(0.28, "rgba(0,0,0,0.05)");
  g.addColorStop(0.72, "rgba(0,0,0,0.05)");
  g.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
  const v = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, ALTO * 0.3, ANCHO / 2, ALTO / 2, ALTO * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = `rgba(${tema.acentoRGB},0.05)`; ctx.fillRect(0, 0, ANCHO, ALTO);
  if (escena.cta) { ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, ANCHO, ALTO); }
}

function clima(ctx, tipo, t, tema) {
  if (tipo === "lluvia") {
    ctx.strokeStyle = "rgba(200,215,255,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 140; i++) {
      const x = (hash(i) * ANCHO + t * 120) % ANCHO;
      const y = (hash(i + 50) * ALTO + t * (1400 + hash(i + 9) * 600)) % ALTO;
      ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 46);
    }
    ctx.stroke();
  } else if (tipo === "niebla") {
    for (let i = 0; i < 5; i++) {
      const x = ((hash(i) * ANCHO + t * (20 + i * 8)) % (ANCHO + 600)) - 300;
      const y = ALTO * (0.45 + hash(i + 3) * 0.4);
      const g = ctx.createRadialGradient(x, y, 10, x, y, 420);
      g.addColorStop(0, "rgba(230,235,240,0.16)"); g.addColorStop(1, "rgba(230,235,240,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 420, y - 420, 840, 840);
    }
  } else if (tipo === "luciernagas" || tipo === "polvo") {
    const color = tipo === "polvo" ? "255,240,210" : tema.acentoRGB;
    for (let i = 0; i < 50; i++) {
      const x = (hash(i + 3) * ANCHO + Math.sin(t * 0.7 + i) * 40) % ANCHO;
      const y = ALTO - ((hash(i + 7) * ALTO + t * (10 + hash(i) * 25)) % ALTO);
      const a = (0.2 + hash(i + 13) * 0.5) * (0.5 + 0.5 * Math.sin(t * (1.5 + hash(i)) + i));
      ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.6 + hash(i + 11) * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* ─── Subtítulos estilo reel ──────────────────────────────── */
// Las palabras aparecen a medida que se dicen; las palabras clave van en una "pastilla" de color.

function dibujarSubtitulos(ctx, escena, lt, tema) {
  const voz = escena.voz;
  if (!voz?.palabras?.length) return;
  const tv = lt - RETRASO_VOZ;
  if (!voz._gruposCine) voz._gruposCine = agrupar(voz.palabras);
  const gs = voz._gruposCine;
  let g = null;
  for (let i = 0; i < gs.length; i++) {
    const ini = gs[i][0].ini - 0.05;
    const fin = gs[i + 1] ? gs[i + 1][0].ini - 0.05 : gs[i].at(-1).fin + 0.7;
    if (tv >= ini && tv < fin) { g = gs[i]; break; }
  }
  if (!g) return;
  const tam = 62;
  ctx.font = `700 ${tam}px ${FUENTE_TITULO}`;
  ctx.textBaseline = "middle";
  const esp = tam * 0.3;
  // Partir el grupo en máximo 2 líneas
  const anchos = g.map((p) => ctx.measureText(p.w).width + (escena.claves.has(limpiar(p.w)) ? 36 : 0));
  const lineas = [[]];
  let ancho = 0;
  g.forEach((p, i) => {
    if (lineas.at(-1).length && ancho + esp + anchos[i] > 900) { lineas.push([]); ancho = 0; }
    lineas.at(-1).push(i);
    ancho += (lineas.at(-1).length > 1 ? esp : 0) + anchos[i];
  });
  const base = ctx.globalAlpha;
  lineas.forEach((ids, li) => {
    const total = ids.reduce((s, i, j) => s + anchos[i] + (j ? esp : 0), 0);
    let x = (ANCHO - total) / 2;
    const y = 330 + li * tam * 1.3;
    ids.forEach((i) => {
      const p = g[i];
      const a = easeOut((tv - p.ini + 0.06) / 0.16);
      if (a > 0) {
        const clave = escena.claves.has(limpiar(p.w));
        ctx.save();
        ctx.globalAlpha = base * a;
        ctx.translate(x + anchos[i] / 2, y + (1 - a) * 14);
        const s = clave ? 0.85 + 0.15 * easeBack((tv - p.ini) / 0.3) : 1;
        ctx.scale(s, s);
        if (clave) {
          ctx.fillStyle = tema.acento;
          ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 26;
          ctx.beginPath(); ctx.roundRect(-anchos[i] / 2, -tam * 0.62, anchos[i], tam * 1.22, 16); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = tema.fondo;
        } else {
          ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 14;
          ctx.fillStyle = "#ffffff";
        }
        ctx.textAlign = "center";
        ctx.fillText(p.w, 0, 2);
        ctx.restore();
      }
      x += anchos[i] + esp;
    });
  });
  ctx.globalAlpha = base;
}

function agrupar(palabras) {
  // Grupos más largos que en el modo ilustrado (hasta ~7 palabras), cortando en pausas y puntuación
  const out = [];
  let actual = [];
  palabras.forEach((p, i) => {
    actual.push(p);
    const sig = palabras[i + 1];
    if (/[.!?]$/.test(p.w) || actual.length >= 7 || (sig && sig.ini - p.fin > 0.4) || (/[,;:]$/.test(p.w) && actual.length >= 4)) {
      out.push(actual); actual = [];
    }
  });
  if (actual.length) out.push(actual);
  return out;
}

/* ─── Datos animados encima del video ─────────────────────── */

function dibujarEtiqueta(ctx, d, t, tema, escena) {
  // Si la etiqueta señala algo de la imagen, solo se dibuja cuando se verificó dónde está (ancla)
  if (d.senala && !d.ancla) return;
  const inicio = num(d.inicio, 0.6);
  const k = easeOut((t - inicio) / 0.5);
  if (k <= 0) return;
  let destino = d.apunta || { x: d.x, y: d.y + 140 };
  if (d.ancla) {
    destino = puntoEnLienzo(escena, t, d.ancla.x, d.ancla.y);
    // La pastilla se ubica al lado del punto, sin taparlo y dentro de la zona segura
    d = { ...d,
      x: Math.min(900, Math.max(180, destino.x + (destino.x < ANCHO / 2 ? 230 : -230))),
      y: Math.min(1460, Math.max(500, destino.y - 190)) };
  }
  ctx.save();
  ctx.globalAlpha *= k;
  // Línea guía y punto
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 4;
  ctx.shadowColor = `rgba(${tema.acentoRGB},0.7)`; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + (destino.x - d.x) * k, d.y + (destino.y - d.y) * k); ctx.stroke();
  ctx.beginPath(); ctx.arc(destino.x, destino.y, 10 * easeBack((t - inicio - 0.3) / 0.4), 0, Math.PI * 2); ctx.fillStyle = tema.acento; ctx.fill();
  ctx.shadowBlur = 0;
  // Pastilla con el texto
  ctx.font = `700 40px ${FUENTE_TITULO}`;
  const w = ctx.measureText(String(d.texto || "")).width + 44;
  ctx.translate(d.x, d.y);
  ctx.scale(easeBack((t - inicio) / 0.45), easeBack((t - inicio) / 0.45));
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-w / 2, -34, w, 68, 34); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(d.texto || ""), 0, 2);
  ctx.restore();
}

function dibujarDatos(ctx, escena, lt, tema) {
  for (const d of escena.datos) {
    if (d.tipo === "etiqueta") dibujarEtiqueta(ctx, d, lt, tema, escena);
    else dibujarElemento(ctx, { ...d, acento: d.acento !== false, efecto: d.efecto || "ninguno" }, lt, tema);
  }
}

/* ─── Cierre ──────────────────────────────────────────────── */

function dibujarCierre(ctx, escena, t, tema) {
  dibujarLogo(ctx, ANCHO / 2, 640, 320 * easeBack(t / 0.6), clamp(t / 0.3));
  dibujarTitular(ctx, escena.texto, t - 0.3, escena.duracion, tema, { y: 860, tamaño: 76 });
  const k = easeBack(clamp((t - 0.9) / 0.5));
  if (k <= 0) return;
  const p = t > 1.4 ? 1 + Math.max(0, Math.sin((t - 1.4) * 6)) * 0.045 : 1;
  const etiqueta = `Comenta  ${escena.cta}`;
  ctx.save();
  ctx.translate(ANCHO / 2, 1290);
  ctx.scale(k * p, k * p);
  ctx.font = `800 82px ${FUENTE_TITULO}`;
  const w = ctx.measureText(etiqueta).width + 130;
  ctx.shadowColor = `rgba(${tema.acentoRGB},0.6)`; ctx.shadowBlur = 40;
  ctx.fillStyle = tema.acento;
  ctx.beginPath(); ctx.roundRect(-w / 2, -82, w, 164, 82); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = tema.fondo; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(etiqueta, 0, 4);
  ctx.restore();
}

/* ─── Fotograma completo ──────────────────────────────────── */

let lienzo = null;
function lienzoAux() {
  if (!lienzo) { lienzo = document.createElement("canvas"); lienzo.width = ANCHO; lienzo.height = ALTO; }
  return lienzo;
}

function dibujarEscena(ctx, escena, lt, tema) {
  dibujarFondo(ctx, escena, lt, tema);
  clima(ctx, escena.clima, lt, tema);
  gradacion(ctx, escena, tema);
  if (escena.cta) dibujarCierre(ctx, escena, lt, tema);
  else { dibujarDatos(ctx, escena, lt, tema); dibujarSubtitulos(ctx, escena, lt, tema); }
}

export function dibujarFrameCine(ctx, guion, tiempo) {
  if (guion.formato === "doc") return dibujarFrameDoc(ctx, guion, tiempo);
  const tema = TEMAS[guion.tema] || TEMAS.bosque;
  const t = clamp(tiempo, 0, guion.total - 1e-6);
  const idx = Math.max(0, guion.escenas.findIndex((e) => t >= e.inicio && t < e.inicio + e.duracion));
  const escena = guion.escenas[idx];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ANCHO, ALTO);
  if (!escena) return;
  const lt = t - escena.inicio;
  const enTransicion = lt < TRANS && escena.transicion !== "ninguna";

  if (!enTransicion) {
    dibujarEscena(ctx, escena, lt, tema);
  } else {
    const k = lt / TRANS;
    const aux = lienzoAux().getContext("2d");
    dibujarEscena(aux, escena, lt, tema);
    if (escena.transicion === "glitch") {
      // Cortes horizontales desplazados + separación de color
      const fuerza = 1 - easeOut(k);
      for (let i = 0; i < 14; i++) {
        const y = Math.floor(hash(i + Math.floor(lt * 30)) * ALTO);
        const h = 40 + hash(i * 3) * 160;
        const dx = (hash(i * 7 + Math.floor(lt * 60)) - 0.5) * 160 * fuerza;
        ctx.drawImage(lienzo, 0, y, ANCHO, h, dx, y, ANCHO, h);
      }
      ctx.globalAlpha = 1 - fuerza * 0.6;
      ctx.drawImage(lienzo, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35 * fuerza;
      ctx.drawImage(lienzo, 14 * fuerza, 0);
      ctx.globalAlpha = 0.35 * fuerza;
      ctx.drawImage(lienzo, -14 * fuerza, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    } else {
      // Zoom: entra desde más cerca, con un destello
      const s = 1.25 - 0.25 * easeOut(k);
      ctx.save();
      ctx.translate(ANCHO / 2, ALTO / 2); ctx.scale(s, s); ctx.translate(-ANCHO / 2, -ALTO / 2);
      ctx.globalAlpha = easeOut(k * 1.6);
      ctx.drawImage(lienzo, 0, 0);
      ctx.restore();
      ctx.fillStyle = `rgba(255,255,255,${(0.25 * (1 - k)).toFixed(3)})`;
      ctx.fillRect(0, 0, ANCHO, ALTO);
    }
  }

  // Barra de progreso por segmentos y logo
  const n = guion.escenas.length, gap = 8, anchoTotal = ANCHO - 160;
  const seg = (anchoTotal - gap * (n - 1)) / n;
  guion.escenas.forEach((e, i) => {
    const x = 80 + i * (seg + gap);
    const avance = clamp((tiempo - e.inicio) / e.duracion);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath(); ctx.roundRect(x, 120, seg, 6, 3); ctx.fill();
    if (avance > 0) { ctx.fillStyle = tema.acento; ctx.beginPath(); ctx.roundRect(x, 120, seg * avance, 6, 3); ctx.fill(); }
  });
  if (!escena.cta) dibujarLogo(ctx, ANCHO / 2, 1780, 120, 0.95);
}

/* ─── Formato documental (estilo wil_lab) ─────────────────────
   Franja de imagen 4:5 al centro con barras negras, cortes secos al ritmo de la voz,
   una sola palabra en pantalla, grano de película y logo pequeño abajo. */

const BANDA = { x: 0, y: 285, w: ANCHO, h: 1350 };
let grano = null;
function lienzoGrano() {
  if (grano) return grano;
  grano = document.createElement("canvas");
  grano.width = grano.height = 256;
  const g = grano.getContext("2d");
  const im = g.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.floor(hash(i * 0.37 + 1) * 255);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return grano;
}

function fondoDoc(ctx, escena, lt, tema) {
  const r = escena.recurso;
  ctx.save();
  ctx.beginPath(); ctx.rect(BANDA.x, BANDA.y, BANDA.w, BANDA.h); ctx.clip();
  // Corte seco con un pequeño "asentamiento" de la imagen (da golpe al corte sin efecto llamativo)
  const golpe = escena.transicion === "corte" ? 1 + 0.035 * (1 - easeOut(lt / 0.3)) : 1;
  ctx.translate(ANCHO / 2, BANDA.y + BANDA.h / 2); ctx.scale(golpe, golpe); ctx.translate(-ANCHO / 2, -(BANDA.y + BANDA.h / 2));
  const e = encuadre(escena, lt, BANDA);
  if (!e) {
    const g = ctx.createLinearGradient(0, BANDA.y, 0, BANDA.y + BANDA.h);
    g.addColorStop(0, tema.fondo); g.addColorStop(1, tema.fondo2);
    ctx.fillStyle = g; ctx.fillRect(BANDA.x, BANDA.y, BANDA.w, BANDA.h);
  } else {
    if (escena.cta) ctx.filter = "blur(14px)";
    ctx.drawImage(r.tipo === "video" ? r.el : r.img, e.x, e.y, e.W, e.H);
    ctx.filter = "none";
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  clima(ctx, escena.clima, lt, tema);
  // Viñeta suave dentro de la franja
  const v = ctx.createRadialGradient(ANCHO / 2, BANDA.y + BANDA.h / 2, BANDA.h * 0.3, ANCHO / 2, BANDA.y + BANDA.h / 2, BANDA.h * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v; ctx.fillRect(BANDA.x, BANDA.y, BANDA.w, BANDA.h);
  if (escena.cta) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(BANDA.x, BANDA.y, BANDA.w, BANDA.h); }
  // Grano de película (cambia cada cuadro)
  const gr = lienzoGrano();
  const f = Math.floor(lt * 24);
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = "overlay";
  const ox = Math.floor(hash(f) * 256), oy = Math.floor(hash(f + 7) * 256);
  for (let y = BANDA.y - oy; y < BANDA.y + BANDA.h; y += 256) {
    for (let x = -ox; x < ANCHO; x += 256) ctx.drawImage(gr, x, y);
  }
  ctx.restore();
}

// Una palabra a la vez, al centro de la imagen, en el instante exacto en que se dice
function palabraDoc(ctx, escena, lt, tema) {
  const ps = escena.voz?.palabras;
  if (!ps?.length) return;
  const tv = lt - RETRASO_VOZ;
  let i = -1;
  for (let k = 0; k < ps.length; k++) if (tv >= ps[k].ini - 0.03) i = k;
  if (i < 0) return;
  const p = ps[i];
  const finVisible = ps[i + 1] ? Infinity : p.fin + 0.45;
  if (tv > finVisible) return;
  const w = String(p.w).replace(/[.,;:!?¡¿"]/g, "");
  if (!w) return;
  const clave = escena.claves.has(limpiar(w));
  const k = easeOut((tv - p.ini + 0.03) / 0.09);
  ctx.save();
  ctx.translate(ANCHO / 2, BANDA.y + BANDA.h / 2);
  const s = 1.14 - 0.14 * k;
  ctx.scale(s, s);
  ctx.globalAlpha = clamp(k * 1.5);
  ctx.font = `italic 800 ${clave ? 74 : 64}px ${FUENTE_TITULO}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 22;
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeText(w, 0, 0);
  ctx.fillStyle = clave ? tema.acento : "#ffffff";
  ctx.fillText(w, 0, 0);
  ctx.restore();
}

function dibujarFrameDoc(ctx, guion, tiempo) {
  const tema = TEMAS[guion.tema] || TEMAS.bosque;
  const t = clamp(tiempo, 0, guion.total - 1e-6);
  const idx = Math.max(0, guion.escenas.findIndex((e) => t >= e.inicio && t < e.inicio + e.duracion));
  const escena = guion.escenas[idx];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ANCHO, ALTO);
  if (!escena) return;
  const lt = t - escena.inicio;
  fondoDoc(ctx, escena, lt, tema);
  if (escena.cta) dibujarCierre(ctx, escena, lt, tema);
  else {
    palabraDoc(ctx, escena, lt, tema);
    dibujarLogo(ctx, ANCHO / 2, 1770, 96, 0.85);
  }
  // Aparición desde negro al inicio y salida a negro al final
  const negro = Math.max(1 - clamp(t / 0.35), clamp((t - (guion.total - 0.4)) / 0.4));
  if (negro > 0) { ctx.fillStyle = `rgba(0,0,0,${negro.toFixed(3)})`; ctx.fillRect(0, 0, ANCHO, ALTO); }
}
