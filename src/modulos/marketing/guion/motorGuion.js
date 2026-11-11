// Dibuja un fotograma del video con guion propio, en vertical (1080×1920) o horizontal (1920×1080).
// Fotos reales con movimiento de cámara suave, fundidos, texto en pantalla, subtítulos opcionales
// y un cierre con el logo, una mariposa volando, la llamada a la acción y los datos de contacto.
import { FUNDIDO, RETRASO_VOZ, indiceEn, gruposDePalabras } from "./linea";

export const FORMATOS = {
  vertical: { ancho: 1080, alto: 1920, nombre: "Vertical 9:16" },
  horizontal: { ancho: 1920, alto: 1080, nombre: "Horizontal 16:9" },
};

const VERDE = "#a3e635";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (k) => k * k * (3 - 2 * k);
const salida = (k) => 1 - Math.pow(1 - k, 3);

// Movimiento de cámara de cada plano (4 variantes que se alternan)
function encuadre(variante, k) {
  const e = suave(clamp(k));
  switch (variante) {
    case 0: return { s: 1.04 + 0.12 * e, dx: 0, dy: 0 };             // acercar
    case 1: return { s: 1.16 - 0.10 * e, dx: 0, dy: 0 };             // alejar
    case 2: return { s: 1.12, dx: -0.04 + 0.08 * e, dy: 0 };          // paneo a la derecha
    default: return { s: 1.12, dx: 0.04 - 0.08 * e, dy: -0.01 };      // paneo a la izquierda
  }
}

function foto(ctx, img, W, H, variante, k, desenfoque = 0) {
  if (!img) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#14310f");
    g.addColorStop(1, "#071a07");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const { s, dx, dy } = encuadre(variante, k);
  const base = Math.max(W / img.width, H / img.height) * s;
  const w = img.width * base;
  const h = img.height * base;
  if (desenfoque) ctx.filter = `blur(${desenfoque}px)`;
  ctx.drawImage(img, (W - w) / 2 + dx * W, (H - h) / 2 + dy * H, w, h);
  if (desenfoque) ctx.filter = "none";
}

function plano(ctx, p, t, rec) {
  const k = (t - p.inicio) / p.duracion;
  if (p.video) {
    const v = rec.videos?.get(p.video.ref);
    if (v?.el && v.el.readyState >= 2) {
      // El video ya viene en movimiento: solo un acercamiento muy leve
      const el = v.el;
      const s = 1.02 + 0.04 * clamp(k);
      const base = Math.max(rec.W / el.videoWidth, rec.H / el.videoHeight) * s;
      const w = el.videoWidth * base;
      const h = el.videoHeight * base;
      if (p.cierre) ctx.filter = "blur(18px)";
      ctx.drawImage(el, (rec.W - w) / 2, (rec.H - h) / 2, w, h);
      if (p.cierre) ctx.filter = "none";
      return;
    }
    foto(ctx, null, rec.W, rec.H, 0, 0);
    return;
  }
  foto(ctx, rec.imagenes.get(p.foto), rec.W, rec.H, p.variante, k, p.cierre ? 18 : 0);
}

function gradacion(ctx, W, H, cierre) {
  // Viñeta + oscurecer abajo (donde va el texto) para que siempre se lea
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, "rgba(5,15,5,0)");
  g.addColorStop(1, "rgba(5,15,5,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  if (cierre) {
    ctx.fillStyle = "rgba(6,20,6,0.55)";
    ctx.fillRect(0, 0, W, H);
  }
}

function lineas(ctx, texto, maxW) {
  const palabras = String(texto || "").split(/\s+/).filter(Boolean);
  const out = [];
  let l = "";
  for (const p of palabras) {
    const prueba = l ? `${l} ${p}` : p;
    if (ctx.measureText(prueba).width > maxW && l) { out.push(l); l = p; } else l = prueba;
  }
  if (l) out.push(l);
  return out;
}

function textoSombra(ctx, txt, x, y) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillText(txt, x, y);
  ctx.restore();
}

// Texto en pantalla de la escena: entra subiendo, sale desvaneciendo
function textoEnPantalla(ctx, escena, t, rec) {
  if (!escena.texto) return;
  const { W, H } = rec;
  const vertical = H > W;
  const lt = t - escena.inicio;
  const entra = salida(clamp((lt - 0.3) / 0.55));
  const sale = clamp((escena.duracion - lt) / 0.35);
  const a = Math.min(entra, sale);
  if (a <= 0) return;
  const tam = vertical ? 76 : 66;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `${tam}px "Bree Serif", Georgia, serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  const maxW = vertical ? W * 0.84 : W * 0.6;
  const ls = lineas(ctx, escena.texto, maxW);
  const alto = ls.length * tam * 1.12;
  const y0 = (vertical ? H * 0.66 : H * 0.8) - alto + (1 - entra) * 40;
  const x = vertical ? W / 2 : W * 0.07;
  ctx.textAlign = vertical ? "center" : "left";
  // Rayita verde arriba del texto
  ctx.fillStyle = VERDE;
  const barra = vertical ? 120 : 110;
  ctx.fillRect(vertical ? x - (barra / 2) * entra : x, y0 - tam * 0.95, barra * entra, 8);
  ctx.fillStyle = "#ffffff";
  ls.forEach((l, i) => textoSombra(ctx, l, x, y0 + i * tam * 1.12));
  ctx.restore();
}

function subtitulos(ctx, escena, t, rec) {
  const pal = escena.voz?.palabras;
  if (!rec.subtitulos || !pal?.length) return;
  const { W, H } = rec;
  const vertical = H > W;
  const lt = t - escena.inicio - RETRASO_VOZ;
  const g = gruposDePalabras(pal).find((x) => lt >= x.ini - 0.05 && lt <= x.fin + 0.25);
  if (!g) return;
  const tam = vertical ? 46 : 40;
  ctx.save();
  ctx.font = `600 ${tam}px Outfit, Arial, sans-serif`;
  ctx.textAlign = "center";
  const w = Math.min(ctx.measureText(g.texto).width, W * 0.86) + 44;
  const y = vertical ? H * 0.82 : H * 0.92;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - w / 2, y - tam - 6, w, tam + 26, 16);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(g.texto, W / 2, y, W * 0.86);
  ctx.restore();
}

function logoEsquina(ctx, rec, alpha) {
  if (!rec.logo || alpha <= 0) return;
  const { W, H } = rec;
  const s = Math.min(W, H) * 0.11;
  ctx.save();
  ctx.globalAlpha = 0.9 * alpha;
  ctx.beginPath();
  ctx.arc(W - s * 0.75 - 24, s * 0.75 + 24, s * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.drawImage(rec.logo, W - s * 1.25 - 24, s * 0.25 + 24, s, s);
  ctx.restore();
}

function mariposa(ctx, rec, lt) {
  if (!rec.mariposa) return;
  const { W, H } = rec;
  const k = clamp(lt / 4.5);
  const x = W * (-0.1 + 1.25 * k);
  const y = H * (0.5 - 0.22 * k) + Math.sin(lt * 2.6) * H * 0.04;
  const tam = Math.min(W, H) * 0.12;
  const aleteo = 0.55 + 0.45 * Math.abs(Math.sin(lt * 11));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 + Math.sin(lt * 2) * 0.12);
  ctx.scale(aleteo, 1);
  ctx.drawImage(rec.mariposa, -tam / 2, -tam / 2, tam, (tam * rec.mariposa.height) / rec.mariposa.width);
  ctx.restore();
}

function cierre(ctx, escena, t, rec) {
  const { W, H } = rec;
  const vertical = H > W;
  const lt = t - escena.inicio;
  const cx = W / 2;

  // Logo que aparece con un pequeño rebote
  const kl = clamp(lt / 0.8);
  const rebote = kl < 1 ? salida(kl) * (1 + 0.12 * Math.sin(kl * Math.PI)) : 1;
  const tamLogo = (vertical ? W * 0.42 : H * 0.36) * rebote;
  const yLogo = vertical ? H * 0.27 : H * 0.3;
  if (rec.logo && tamLogo > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, yLogo, tamLogo * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();
    ctx.drawImage(rec.logo, cx - tamLogo / 2, yLogo - tamLogo / 2, tamLogo, tamLogo);
  }

  mariposa(ctx, rec, lt);

  // Llamada a la acción
  const kc = salida(clamp((lt - 0.7) / 0.5));
  if (kc > 0) {
    ctx.save();
    ctx.globalAlpha = kc;
    const tam = vertical ? 84 : 72;
    ctx.font = `${tam}px "Bree Serif", Georgia, serif`;
    ctx.textAlign = "center";
    const txt = rec.cta || "Reserva tu cupo";
    const w = ctx.measureText(txt).width + 90;
    const y = vertical ? H * 0.5 : H * 0.6;
    ctx.fillStyle = VERDE;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - tam * 0.95 + (1 - kc) * 30, w, tam * 1.45, tam * 0.72);
    ctx.fill();
    ctx.fillStyle = "#14310f";
    ctx.fillText(txt, cx, y + tam * 0.18 + (1 - kc) * 30);
    ctx.restore();
  }

  // Frase de la escena y contacto
  const kt = clamp((lt - 1.2) / 0.5);
  if (kt > 0) {
    ctx.save();
    ctx.globalAlpha = kt;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    const tam = vertical ? 44 : 38;
    ctx.font = `600 ${tam}px Outfit, Arial, sans-serif`;
    let y = vertical ? H * 0.6 : H * 0.74;
    if (escena.texto) { lineas(ctx, escena.texto, W * 0.84).forEach((l) => { textoSombra(ctx, l, cx, y); y += tam * 1.25; }); y += tam * 0.4; }
    ctx.font = `${tam * 0.9}px Outfit, Arial, sans-serif`;
    ctx.fillStyle = "#e7f5d0";
    const datos = (rec.contacto || []).filter(Boolean);
    if (vertical) datos.forEach((d) => { textoSombra(ctx, d, cx, y); y += tam * 1.2; });
    else textoSombra(ctx, datos.join("   ·   "), cx, y);
    ctx.restore();
  }
}

/**
 * linea: resultado de armarLinea · t: segundo · rec: { W, H, imagenes (Map ref→imagen), logo, mariposa, cta, contacto, subtitulos }
 */
export function dibujarFrameGuion(ctx, linea, t, rec) {
  const { W, H } = rec;
  const { escenas, planos, total } = linea;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Foto con fundido entre planos
  const ip = indiceEn(planos, t);
  const p = planos[ip];
  if (p) {
    const lt = t - p.inicio;
    if (ip > 0 && lt < FUNDIDO) {
      plano(ctx, planos[ip - 1], t, rec);
      ctx.globalAlpha = suave(lt / FUNDIDO);
      plano(ctx, p, t, rec);
      ctx.globalAlpha = 1;
    } else plano(ctx, p, t, rec);
  }

  const ie = indiceEn(escenas, t);
  const e = escenas[ie];
  if (e) {
    gradacion(ctx, W, H, e.cierre);
    if (e.cierre) cierre(ctx, e, t, rec);
    else {
      textoEnPantalla(ctx, e, t, rec);
      subtitulos(ctx, e, t, rec);
      logoEsquina(ctx, rec, clamp(t / 0.8));
    }
  }

  // Entrada desde negro y salida a negro
  const negro = Math.max(1 - clamp(t / 0.35), clamp((t - (total - 0.6)) / 0.6));
  if (negro > 0) {
    ctx.fillStyle = `rgba(0,0,0,${negro})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
