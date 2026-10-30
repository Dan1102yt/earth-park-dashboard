// Biblioteca de transiciones entre escenas.
// Cada transición mezcla el final de la escena anterior (A) con el inicio de la nueva (B),
// ambas ya dibujadas en lienzos auxiliares. Se dibuja solo dentro de "area" (la franja del documental o todo el video).
import { ANCHO, ALTO, easeOut, easeInOut, hash } from "../animado/motor";

// Duración (s) de cada transición. "corte" es un corte seco con un pequeño golpe de cámara.
export const TRANSICIONES = {
  corte: 0.28,
  fundido: 0.55,
  negro: 0.7,
  blanco: 0.35,
  zoom: 0.42,
  empuje: 0.4,
  deslizar: 0.4,
  barrido: 0.34,
  desenfoque: 0.55,
  iris: 0.55,
  cortina: 0.5,
  glitch: 0.36,
  luz: 0.7,
  tinta: 0.7,
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const NOMBRES_TRANSICION = Object.keys(TRANSICIONES);

// Paletas para elegir automáticamente cuando el guion no dice o se repite
const PALETA = {
  doc: ["corte", "fundido", "corte", "desenfoque", "luz", "corte", "tinta", "barrido", "corte", "zoom", "negro", "empuje"],
  reel: ["barrido", "zoom", "glitch", "empuje", "iris", "cortina", "luz", "deslizar", "blanco", "desenfoque", "tinta"],
};

/**
 * Elige la transición de cada escena: respeta la del guion si es válida, pero nunca repite la misma
 * dos veces seguidas (salvo "corte" en documental, máximo 2 seguidos).
 */
export function elegirTransiciones(pedidas, formato) {
  const paleta = PALETA[formato] || PALETA.reel;
  const out = [];
  pedidas.forEach((p, i) => {
    if (i === 0) { out.push("ninguna"); return; }
    const ant = out[i - 1], ant2 = out[i - 2];
    const repetida = (t) => t === ant && (t !== "corte" || formato !== "doc" || ant2 === "corte");
    let t = TRANSICIONES[p] ? p : null;
    if (formato === "reel" && t === "corte") t = null;
    if (!t || repetida(t)) {
      for (let k = 0; k < paleta.length; k++) {
        const c = paleta[Math.floor(hash(i * 3.7 + k) * paleta.length)];
        if (!repetida(c)) { t = c; break; }
      }
      t = t || paleta.find((c) => !repetida(c));
    }
    out.push(t);
  });
  return out;
}

/* ─── Lienzos auxiliares ─── */
const lienzos = {};
export function aux(nombre) {
  if (!lienzos[nombre]) {
    const c = document.createElement("canvas");
    c.width = ANCHO; c.height = ALTO;
    lienzos[nombre] = c;
  }
  return lienzos[nombre];
}

// Dibuja solo la zona visible (area) de una escena, desplazada dx, dy (así no se ven las barras negras moverse)
function zona(ctx, img, area, dx = 0, dy = 0) {
  ctx.drawImage(img, area.x, area.y, area.w, area.h, area.x + dx, area.y + dy, area.w, area.h);
}

function conEscala(ctx, img, s, area, alpha = 1, dx = 0, dy = 0) {
  const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx + dx, cy + dy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  zona(ctx, img, area);
  ctx.restore();
}

/**
 * Dibuja la transición en ctx.
 * A, B: lienzos con la escena anterior y la nueva · k: avance 0–1 · area: zona visible · acento: color del tema
 */
export function componerTransicion(ctx, A, B, k, tipo, area, acento = "rgba(163,230,53,1)", semilla = 0) {
  const e = easeInOut(k), eo = easeOut(k);
  ctx.save();
  ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
  ctx.fillStyle = "#000"; ctx.fillRect(area.x, area.y, area.w, area.h);

  switch (tipo) {
    case "corte": {
      // Corte seco con un "asentamiento" de la imagen nueva: da golpe sin efecto llamativo
      conEscala(ctx, B, 1 + 0.04 * (1 - eo), area);
      break;
    }
    case "fundido": {
      ctx.drawImage(A, 0, 0);
      ctx.globalAlpha = e; ctx.drawImage(B, 0, 0);
      break;
    }
    case "negro": {
      if (k < 0.5) { ctx.drawImage(A, 0, 0); ctx.fillStyle = `rgba(0,0,0,${easeInOut(k * 2)})`; }
      else { ctx.drawImage(B, 0, 0); ctx.fillStyle = `rgba(0,0,0,${1 - easeInOut((k - 0.5) * 2)})`; }
      ctx.fillRect(area.x, area.y, area.w, area.h);
      break;
    }
    case "blanco": {
      ctx.drawImage(k < 0.3 ? A : B, 0, 0);
      const f = k < 0.3 ? k / 0.3 : 1 - easeOut((k - 0.3) / 0.7);
      ctx.fillStyle = `rgba(255,252,240,${(0.92 * f).toFixed(3)})`;
      ctx.fillRect(area.x, area.y, area.w, area.h);
      break;
    }
    case "zoom": {
      // Atraviesa la imagen: A crece y se desvanece, B llega desde más lejos. Estela radial simple.
      for (let i = 3; i >= 0; i--) conEscala(ctx, A, 1 + (0.5 + i * 0.12) * e, area, (1 - e) * (i ? 0.18 : 1));
      for (let i = 3; i >= 0; i--) conEscala(ctx, B, 0.8 + 0.2 * eo - i * 0.03 * (1 - eo), area, e * (i ? 0.2 : 1));
      break;
    }
    case "empuje":
    case "deslizar":
    case "barrido": {
      // Empuje / deslizar: la nueva imagen empuja a la anterior. Barrido: igual pero muy rápido y con estela (whip pan).
      const horizontal = tipo !== "deslizar";
      const signo = hash(semilla) > 0.5 ? 1 : -1;
      const largo = horizontal ? area.w : area.h;
      const avance = tipo === "barrido" ? easeInOut(clamp01((k - 0.15) / 0.7)) : e;
      const d = largo * avance * signo;
      const estela = tipo === "barrido" ? Math.sin(Math.PI * avance) : 0;
      const pasos = estela > 0.05 ? 6 : 1;
      for (let i = 0; i < pasos; i++) {
        const extra = (i - (pasos - 1) / 2) * 70 * estela * signo;
        ctx.globalAlpha = i === Math.floor(pasos / 2) || pasos === 1 ? 1 : 0.18;
        zona(ctx, A, area, horizontal ? -d + extra : 0, horizontal ? 0 : -d + extra);
        zona(ctx, B, area, horizontal ? largo * signo - d + extra : 0, horizontal ? 0 : largo * signo - d + extra);
      }
      ctx.globalAlpha = 1;
      if (tipo !== "barrido") {
        // Sombra en el borde entre las dos imágenes
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        if (horizontal) ctx.fillRect(area.x + (signo > 0 ? area.w : 0) - d - 12, area.y, 24, area.h);
        else ctx.fillRect(area.x, area.y + (signo > 0 ? area.h : 0) - d - 12, area.w, 24);
      }
      break;
    }
    case "desenfoque": {
      ctx.filter = `blur(${(24 * e).toFixed(1)}px)`; ctx.drawImage(A, 0, 0);
      ctx.filter = `blur(${(24 * (1 - e)).toFixed(1)}px)`; ctx.globalAlpha = e; ctx.drawImage(B, 0, 0);
      ctx.filter = "none";
      break;
    }
    case "iris": {
      ctx.drawImage(A, 0, 0);
      const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
      const r = Math.hypot(area.w, area.h) * 0.55 * easeInOut(k);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2); ctx.clip();
      conEscala(ctx, B, 1.08 - 0.08 * eo, area);
      ctx.restore();
      ctx.strokeStyle = acento; ctx.lineWidth = 6; ctx.globalAlpha = 1 - k;
      ctx.shadowColor = acento; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "cortina": {
      // Barrido diagonal con borde de luz
      ctx.drawImage(A, 0, 0);
      const ancho = area.w + area.h * 0.5;
      const x = -area.h * 0.5 + ancho * e;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(area.x - area.h, area.y); ctx.lineTo(x + area.h * 0.25, area.y);
      ctx.lineTo(x - area.h * 0.25, area.y + area.h); ctx.lineTo(area.x - area.h, area.y + area.h); ctx.closePath();
      ctx.clip();
      ctx.drawImage(B, 0, 0);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 5; ctx.shadowColor = acento; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.moveTo(x + area.h * 0.25, area.y); ctx.lineTo(x - area.h * 0.25, area.y + area.h); ctx.stroke();
      break;
    }
    case "glitch": {
      const img = k < 0.5 ? A : B;
      const fuerza = Math.sin(Math.PI * k);
      ctx.drawImage(img, 0, 0);
      const f = Math.floor(k * 30);
      for (let i = 0; i < 16; i++) {
        const y = area.y + Math.floor(hash(i + f * 13) * area.h);
        const h = 20 + hash(i * 3 + f) * 140;
        const dx = (hash(i * 7 + f) - 0.5) * 220 * fuerza;
        ctx.drawImage(hash(i + f) > 0.5 ? A : B, 0, y, ANCHO, h, dx, y, ANCHO, h);
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.3 * fuerza; ctx.drawImage(img, 16 * fuerza, 0);
      ctx.globalAlpha = 0.3 * fuerza; ctx.drawImage(img, -16 * fuerza, 0);
      break;
    }
    case "luz": {
      // Fundido con destello de luz cálida (light leak) que cruza la imagen
      ctx.drawImage(A, 0, 0);
      ctx.globalAlpha = e; ctx.drawImage(B, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "screen";
      const cx = area.x - area.w * 0.3 + area.w * 1.6 * k, cy = area.y + area.h * (0.3 + 0.3 * k);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, area.w * 0.9);
      const a = Math.sin(Math.PI * k);
      g.addColorStop(0, `rgba(255,214,150,${(0.85 * a).toFixed(3)})`);
      g.addColorStop(0.4, `rgba(255,140,60,${(0.4 * a).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = g; ctx.fillRect(area.x, area.y, area.w, area.h);
      break;
    }
    case "tinta": {
      // La imagen nueva aparece como manchas de pintura que crecen (ideal para el estilo pintado)
      ctx.drawImage(A, 0, 0);
      const m = aux("mascara").getContext("2d");
      m.clearRect(0, 0, ANCHO, ALTO);
      m.fillStyle = "#fff";
      for (let i = 0; i < 9; i++) {
        const bx = area.x + hash(i + semilla * 5) * area.w, by = area.y + hash(i * 2 + 1 + semilla * 5) * area.h;
        const retraso = hash(i * 9 + semilla) * 0.35;
        const r = Math.max(0, easeInOut((k - retraso) / (1 - retraso))) * area.h * 0.75;
        if (r <= 0) continue;
        m.beginPath();
        for (let a = 0; a <= 24; a++) {
          const ang = (a / 24) * Math.PI * 2;
          const rr = r * (0.85 + 0.15 * Math.sin(ang * 5 + i) + 0.08 * Math.sin(ang * 11 + i * 2));
          const px = bx + Math.cos(ang) * rr, py = by + Math.sin(ang) * rr;
          if (a) m.lineTo(px, py); else m.moveTo(px, py);
        }
        m.fill();
      }
      m.globalCompositeOperation = "source-in";
      m.drawImage(B, 0, 0);
      m.globalCompositeOperation = "source-over";
      ctx.drawImage(aux("mascara"), 0, 0);
      break;
    }
    default:
      ctx.drawImage(B, 0, 0);
  }
  ctx.restore();
}

