// Piezas para Cavipetrol (Earth Park es CaviAliado): historias 9:16, posts 4:5 y banner web.
// Siguen los lineamientos de Cavipetrol: zona segura, un mensaje principal, máximo 2 bloques de texto y CTA claro.
import { PLANES } from "../../../configuracion/planesConfig";

export const FORMATOS = {
  historia: { nombre: "Historia", w: 1080, h: 1920, relacion: "9:16", seguro: { arriba: 250, abajo: 340 } },
  post: { nombre: "Post", w: 1080, h: 1350, relacion: "4:5", seguro: { arriba: 90, abajo: 90 } },
  banner: { nombre: "Banner web", w: 1574, h: 676, relacion: "web", seguro: { arriba: 40, abajo: 40 } },
};

export const PLANTILLAS = {
  oferta: { nombre: "Oferta", desc: "Foto, franja con el descuento, mensaje y botón" },
  plan: { nombre: "Plan", desc: "Reserva + qué incluye + WhatsApp" },
  fecha: { nombre: "Fecha especial", desc: "Título arriba (ej. Mes de la Madre) y oferta abajo" },
};

export const COLORES = {
  rojo: { nombre: "Rojo", base: "#a3191d", claro: "#c8282e" },
  verde: { nombre: "Verde", base: "#4b7f22", claro: "#62a12f" },
  tierra: { nombre: "Tierra Earth Park", base: "#2f5a1a", claro: "#c08a2b" },
  azul: { nombre: "Azul", base: "#1d5fa8", claro: "#2b7bd1" },
};

// Tipografías disponibles (todas cargadas en index.html)
export const FUENTES = {
  bree: { nombre: "Bree Serif", css: "'Bree Serif', Georgia, serif" },
  outfit: { nombre: "Outfit", css: "'Outfit', 'Inter', sans-serif" },
  montserrat: { nombre: "Montserrat", css: "'Montserrat', 'Inter', sans-serif" },
  poppins: { nombre: "Poppins", css: "'Poppins', 'Inter', sans-serif" },
};

export const CTAS = ["¡CONOCE MÁS!", "¡RESERVA AQUÍ!", "¡ACCEDE AHORA!", "¡ESCRÍBENOS!"];

// Lo que incluye cada plan, en palabras cortas (para las pastillas)
export const INCLUYE_CORTO = {
  "2D1N": ["2 Desayunos", "Tour en lancha", "Miradores", "Cascada la 70", "Almuerzo", "Caminata guiada", "Alojamiento", "Seguro turístico"],
  "3D2N": ["3 Desayunos", "3 Almuerzos", "2 Cenas", "Lancha", "4 Miradores", "Talleres", "Alojamiento", "Seguro turístico"],
  visita: ["Entrada", "Recorrido", "Flora y fauna", "Miradores"],
};
export const DURACION = { "2D1N": "2 DÍAS 1 NOCHE", "3D2N": "3 DÍAS 2 NOCHES", visita: "VISITA DE UN DÍA" };

export const PIEZA_INICIAL = {
  formato: "historia", plantilla: "oferta", color: "rojo", plan: "2D1N",
  oferta: "10% OFF", fuente: "bree", mariposas: true, titulo: "", mensaje: "Tu escapada a la naturaleza en el Plan Conoce y Descansa. ¡Reserva ya!",
  cta: CTAS[0], telefonos: "3233195919 · 3228697438", incluye: INCLUYE_CORTO["2D1N"].join("\n"),
  legal: "*Aplican términos y condiciones. Beneficio exclusivo para afiliados Cavipetrol y grupo familiar.",
};

export const nombrePlan = (id) => PLANES[id]?.nombre || id;
const palabras = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/** Revisión automática contra los lineamientos de Cavipetrol → [{ ok, texto }] */
export function revisarLineamientos(p, { logoCavi }) {
  const bloques = [p.titulo, p.mensaje].filter((t) => String(t || "").trim()).length;
  return [
    { ok: true, texto: `Tamaño ${FORMATOS[p.formato].w} × ${FORMATOS[p.formato].h} px (${FORMATOS[p.formato].relacion}), 72 dpi` },
    { ok: true, texto: "Textos dentro de la zona segura (actívala para verla)" },
    { ok: bloques <= 2, texto: `Máximo 2 bloques de texto (${bloques})` },
    { ok: palabras(p.titulo) <= 7, texto: `Título corto: ${palabras(p.titulo)} palabras (máx. 7)` },
    { ok: palabras(p.mensaje) <= 20, texto: `Mensaje breve: ${palabras(p.mensaje)} palabras (máx. 20)` },
    { ok: !!String(p.cta || "").trim(), texto: "Llamado a la acción claro" },
    { ok: !!String(p.oferta || "").trim(), texto: "Beneficio visible (oferta)" },
    { ok: !!logoCavi, texto: logoCavi ? "Logos Cavipetrol + CaviAliados y Earth Park" : "Falta el logo de Cavipetrol (súbelo una vez)" },
  ];
}

/* ─── Dibujo ─────────────────────────────────────────────── */
let FUENTE = FUENTES.bree.css; // la elige el usuario en cada pieza

/** Mariposa 88 (insignia de Earth Park): alas blancas con borde rojo y el "88". */
function mariposa(ctx, x, y, s, giro = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(giro); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8;
  [-1, 1].forEach((l) => {
    ctx.fillStyle = "#c81e1e";
    ctx.beginPath(); ctx.ellipse(l * 26, -14, 30, 24, l * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(l * 20, 18, 20, 17, -l * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f5f5f0";
    ctx.beginPath(); ctx.ellipse(l * 25, -13, 23, 18, l * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(l * 19, 17, 14, 12, -l * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.2;
    [[-6, 0], [6, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(l * 19 + dx * 0.6, 15, 3.4, 0, Math.PI * 2); ctx.stroke(); });
  });
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(0, 0, 4, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, -24); ctx.quadraticCurveTo(-10, -40, -16, -42); ctx.moveTo(2, -24); ctx.quadraticCurveTo(10, -40, 16, -42); ctx.stroke();
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function cubrir(ctx, img, x, y, w, h) {
  if (!img) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#2f5d2a"); g.addColorStop(1, "#13240f"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); return; }
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

/** Parte un texto en líneas que caben en "ancho". */
function lineas(ctx, texto, ancho) {
  const out = [];
  String(texto || "").split("\n").forEach((parrafo) => {
    let linea = "";
    parrafo.split(/\s+/).filter(Boolean).forEach((w) => {
      const prueba = linea ? `${linea} ${w}` : w;
      if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = w; } else linea = prueba;
    });
    if (linea) out.push(linea);
  });
  return out;
}

function textoCentrado(ctx, texto, cx, y, ancho, tam, color = "#fff", alto = 1.22) {
  ctx.font = `${tam}px ${FUENTE}`;
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "top";
  const ls = lineas(ctx, texto, ancho);
  ls.forEach((l, i) => ctx.fillText(l, cx, y + i * tam * alto));
  return ls.length * tam * alto;
}

function boton(ctx, texto, cx, y, tam, color) {
  ctx.font = `${tam}px ${FUENTE}`;
  const w = ctx.measureText(texto).width + tam * 1.4, h = tam * 1.6;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = tam * 0.5; ctx.shadowOffsetY = tam * 0.12;
  rr(ctx, cx - w / 2, y, w, h, h * 0.28); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = Math.max(2, tam * 0.06); rr(ctx, cx - w / 2, y, w, h, h * 0.28); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(texto, cx, y + h / 2 + 2);
  return h;
}

function pastilla(ctx, texto, x, y, w, h, color, tam) {
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = color; ctx.fill();
  ctx.font = `${tam}px ${FUENTE}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(texto, x + w / 2, y + h / 2 + 1, w - 16);
}

/** Barra blanca con los logos de Cavipetrol/CaviAliados + sello de Earth Park. */
function encabezado(ctx, W, y, recursos, escala = 1) {
  const pw = 640 * escala, ph = 150 * escala;
  const px = (W - pw) / 2 - 40 * escala;
  ctx.save();
  ctx.translate(px + pw / 2, y + ph / 2); ctx.rotate(-0.035);
  ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 24 * escala;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, 36 * escala); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.shadowBlur = 0;
  if (recursos.logoCavi) {
    const l = recursos.logoCavi, s = Math.min((pw - 60 * escala) / l.width, (ph - 36 * escala) / l.height);
    ctx.drawImage(l, -l.width * s / 2, -l.height * s / 2, l.width * s, l.height * s);
  } else {
    ctx.font = `${40 * escala}px ${FUENTE}`; ctx.fillStyle = "#333"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("cavipetrol  |  CaviAliados", 0, 2);
  }
  ctx.restore();
  if (recursos.logoEP) {
    const t = 210 * escala, x = px + pw - 40 * escala, yy = y + ph * 0.55;
    ctx.save(); ctx.beginPath(); ctx.arc(x + t / 2, yy + t / 2, t / 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip();
    ctx.drawImage(recursos.logoEP, x, yy, t, t); ctx.restore();
  }
}

function telefonos(ctx, texto, W, y, tam) {
  ctx.font = `${tam}px ${FUENTE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = tam * 0.4; ctx.fillStyle = "#fff";
  ctx.fillText(`WhatsApp ${texto}`, W / 2, y); ctx.restore();
}

function velo(ctx, W, H, desde, hasta, alfa = 0.55) {
  const g = ctx.createLinearGradient(0, desde, 0, hasta);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${alfa})`);
  ctx.fillStyle = g; ctx.fillRect(0, desde, W, hasta - desde);
}

/** Dibuja la pieza completa en el canvas (a tamaño real). */
export function dibujarPieza(canvas, p, recursos = {}) {
  const F = FORMATOS[p.formato] || FORMATOS.historia;
  const W = F.w, H = F.h;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const col = COLORES[p.color] || COLORES.rojo;
  FUENTE = (FUENTES[p.fuente] || FUENTES.bree).css;
  ctx.clearRect(0, 0, W, H);

  if (p.formato === "banner") {
    banner(ctx, W, H, p, recursos, col);
    if (p.mariposas) { mariposa(ctx, W * 0.56, 120, 1.3, 0.3); mariposa(ctx, W * 0.5, H - 150, 0.9, -0.4); }
    return;
  }
  // Mariposas de Earth Park: se dibujan al final, sobre la foto y sin tapar textos
  const conMariposas = () => { if (!p.mariposas) return; const k2 = p.formato === "post" ? 0.8 : 1; mariposa(ctx, 90, F.seguro.arriba + 420 * k2, 1.4 * k2, -0.35); mariposa(ctx, W - 110, F.seguro.arriba + 560 * k2, 1.0 * k2, 0.4); };

  cubrir(ctx, recursos.foto, 0, 0, W, H);
  const k = p.formato === "post" ? 0.72 : 1;      // el post es más bajito
  const top = F.seguro.arriba + 20;            // logos dentro de la zona segura
  encabezado(ctx, W, top, recursos, p.formato === "post" ? 0.82 : 1);
  const limite = H - F.seguro.abajo;
  const ancho = W - 160;

  if (p.plantilla === "plan") {
    velo(ctx, W, H, H * 0.45, H, 0.55);
    let y = top + 330 * k;
    // RESERVA + duración
    pastilla(ctx, "RESERVA", W / 2 - 230, y, 460, 100 * k, `${col.base}e6`, 62 * k);
    y += 112 * k;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 16;
    textoCentrado(ctx, DURACION[p.plan] || "", W / 2, y, ancho, 64 * k); ctx.restore();
    y = limite - (p.formato === "post" ? 470 : 640);
    pastilla(ctx, p.oferta, W / 2 - 330, y, 660, 108 * k, col.claro, 64 * k);
    y += 140 * k;
    const items = String(p.incluye || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 9);
    const cols = 3, gx = 20, cw = (ancho - gx * (cols - 1)) / cols, ch = 84 * k;
    items.forEach((t, i) => {
      const c = i % cols, f = Math.floor(i / cols);
      pastilla(ctx, t, 80 + c * (cw + gx), y + f * (ch + 18 * k), cw, ch, `${col.base}d9`, 38 * k);
    });
    y += Math.ceil(items.length / cols) * (ch + 18 * k) + 20 * k;
    if (p.telefonos) telefonos(ctx, p.telefonos, W, Math.min(y + 40, limite - 30), 48 * k);
    conMariposas();
    return;
  }

  if (p.plantilla === "fecha" && p.titulo) {
    ctx.font = `${78 * k}px ${FUENTE}`;
    const ls = lineas(ctx, p.titulo, ancho - 80);
    const h = ls.length * 78 * k * 1.2 + 50 * k;
    const y = top + 330 * k;
    rr(ctx, 80, y, ancho, h, 20); ctx.fillStyle = `${COLORES.verde.base}ee`; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 4; ctx.stroke();
    textoCentrado(ctx, p.titulo, W / 2, y + 25 * k, ancho - 80, 78 * k);
  }

  // Caja inferior: descuento + mensaje + botón (plantillas "oferta" y "fecha")
  ctx.font = `${50 * k}px ${FUENTE}`;
  const msg = lineas(ctx, p.mensaje, ancho - 80);
  const titulo = p.plantilla === "oferta" && p.titulo ? p.titulo : "";
  const hCaja = 150 * k + msg.length * 50 * k * 1.22 + (titulo ? 70 * k : 0) + 170 * k;
  let y = limite - hCaja;
  velo(ctx, W, H, y - 300, H, 0.5);
  rr(ctx, 80, y, ancho, 130 * k, 18); ctx.fillStyle = col.base; ctx.fill();
  textoCentrado(ctx, p.oferta, W / 2, y + 22 * k, ancho, 92 * k);
  y += 150 * k;
  rr(ctx, 80, y - 20 * k, ancho, hCaja - 150 * k, 18); ctx.fillStyle = `${col.base}80`; ctx.fill();
  if (titulo) { y += textoCentrado(ctx, titulo, W / 2, y, ancho - 80, 56 * k, "#fff") + 10; }
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 10;
  y += textoCentrado(ctx, p.mensaje, W / 2, y, ancho - 80, 50 * k); ctx.restore();
  boton(ctx, p.cta, W / 2, y + 20 * k, 52 * k, col.claro);
  conMariposas();
}

function banner(ctx, W, H, p, recursos, col) {
  // Derecha: foto · Izquierda: panel verde con el mensaje
  cubrir(ctx, recursos.foto, W * 0.6, 0, W * 0.4, H);
  const g = ctx.createLinearGradient(0, 0, W * 0.64, 0);
  g.addColorStop(0, "#1f3d12"); g.addColorStop(0.85, "#2f5a1a"); g.addColorStop(1, "rgba(47,90,26,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.66, H);
  // logos arriba al centro del panel
  const pw = 420, ph = 96, px = W * 0.34 - pw / 2;
  rr(ctx, px, 30, pw, ph, 26); ctx.fillStyle = "#fff"; ctx.fill();
  if (recursos.logoCavi) { const l = recursos.logoCavi, s = Math.min((pw - 40) / l.width, (ph - 24) / l.height); ctx.drawImage(l, px + pw / 2 - l.width * s / 2, 30 + ph / 2 - l.height * s / 2, l.width * s, l.height * s); }
  else { ctx.font = `30px ${FUENTE}`; ctx.fillStyle = "#333"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("cavipetrol  |  CaviAliados", px + pw / 2, 30 + ph / 2); }
  if (recursos.logoEP) { ctx.save(); ctx.beginPath(); ctx.arc(px + pw + 90, 80, 70, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip(); ctx.drawImage(recursos.logoEP, px + pw + 20, 10, 140, 140); ctx.restore(); }
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = `30px ${FUENTE}`; ctx.fillStyle = "#facc15"; ctx.fillText("Beneficio exclusivo · Afiliados Cavipetrol", 70, 150);
  let y = 195;
  ctx.font = `50px ${FUENTE}`; ctx.fillStyle = "#fff";
  lineas(ctx, p.titulo || "¡Cavipetrol y Earth Park te reconectan con la naturaleza!", W * 0.52).slice(0, 2).forEach((l) => { ctx.fillText(l, 70, y); y += 60; });
  y += 10;
  ctx.font = `110px ${FUENTE}`; ctx.fillStyle = "#facc15"; ctx.fillText(p.oferta, 70, y - 10);
  const dw = ctx.measureText(p.oferta).width;
  ctx.font = `34px ${FUENTE}`; ctx.fillStyle = "#fff";
  lineas(ctx, p.mensaje, W * 0.5 - dw).slice(0, 2).forEach((l, i) => ctx.fillText(l, 100 + dw, y + 12 + i * 42));
  y += 130;
  ctx.font = `40px ${FUENTE}`;
  const bw = ctx.measureText(p.cta).width + 60;
  rr(ctx, 70, y, bw, 70, 20); ctx.fillStyle = col.claro; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(p.cta, 100, y + 37);
  ctx.textBaseline = "top"; ctx.font = `20px ${FUENTE}`; ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(p.legal || "", 70, H - 110);
  ctx.font = `26px ${FUENTE}`; ctx.fillStyle = "#fff"; ctx.fillText("earthpark.com.co  ·  @earthpark.co", 70, H - 78);
}

/** Dibuja encima las franjas de la zona segura (solo para revisar, no sale en la descarga). */
export function dibujarZonaSegura(canvas, formato) {
  const F = FORMATOS[formato]; const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(239,68,68,0.28)";
  ctx.fillRect(0, 0, F.w, F.seguro.arriba); ctx.fillRect(0, F.h - F.seguro.abajo, F.w, F.seguro.abajo);
  ctx.strokeStyle = "rgba(239,68,68,0.9)"; ctx.setLineDash([18, 12]); ctx.lineWidth = 4;
  ctx.strokeRect(2, F.seguro.arriba, F.w - 4, F.h - F.seguro.arriba - F.seguro.abajo); ctx.setLineDash([]);
}
