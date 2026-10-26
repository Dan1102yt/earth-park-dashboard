// Oficina Earth Park isométrica, dibujada con código (sin imágenes).
// Se dibuja en un lienzo lógico (W×H) y se renderiza a ESCALA× para que se vea definido (no pixelado).

export const W = 248;
export const H = 178;
export const ESCALA = 3;
const TW = 24, TH = 12;            // tamaño de una baldosa isométrica
const OX = 118, OY = 56;           // origen de la cuadrícula en el lienzo
const MUROS = 46;                  // alto de las paredes
const COLS = 10, FILAS = 9;

/** Cuadrícula (x, y, altura z) → punto del lienzo lógico. */
export function iso(x, y, z = 0) {
  return { x: OX + (x - y) * (TW / 2), y: OY + (x + y) * (TH / 2) - z };
}

/* ─── Agentes y su sitio en la oficina ─────────────────────── */
// "look" es el avatar por defecto; se puede cambiar en el editor de avatares (personajes originales).

export const PEINADOS = ["corto", "largo", "cola", "rizado", "moño", "puntas", "calvo"];
export const ACCESORIOS = ["ninguno", "gafas", "boina", "audifonos", "gorra", "lapiz", "bata", "lupa", "telefono", "collar"];

export const AGENTES = [
  { id: "investigador", nombre: "Iván", rol: "Investigador", emoji: "🔬",
    look: { piel: "#c98e62", pelo: "#1f1a17", peinado: "rizado", camisa: "#0f766e", accesorios: ["bata", "gafas", "lupa"] },
    escritorio: { x: 5.2, y: 6.8 }, silla: { x: 5.95, y: 6.25 }, asiento: { x: 3.95, y: 6.35 } },
  { id: "estratega", nombre: "Sofía", rol: "Estratega", emoji: "🧭",
    look: { piel: "#e8b48a", pelo: "#3b2414", peinado: "largo", camisa: "#2f7d4f", accesorios: ["gafas"] },
    escritorio: { x: 5.2, y: 1.6 }, silla: { x: 5.95, y: 1.05 }, asiento: { x: 0.55, y: 6.4 } },
  { id: "guionista", nombre: "Mateo", rol: "Guionista", emoji: "✍️",
    look: { piel: "#c98e62", pelo: "#151515", peinado: "corto", camisa: "#d97706", accesorios: ["lapiz"] },
    escritorio: { x: 7.8, y: 1.6 }, silla: { x: 8.55, y: 1.05 }, asiento: { x: 0.55, y: 7.5 } },
  { id: "disenador", nombre: "Valen", rol: "Diseñadora", emoji: "🎨",
    look: { piel: "#f1c7a1", pelo: "#b4532a", peinado: "moño", camisa: "#7c3aed", accesorios: ["boina"] },
    escritorio: { x: 5.2, y: 4.2 }, silla: { x: 5.95, y: 3.65 }, asiento: { x: 1.6, y: 8.45 } },
  { id: "editor", nombre: "Claudia", rol: "Editora de video", emoji: "🎬",
    look: { piel: "#e2a87e", pelo: "#5b3a29", peinado: "rizado", camisa: "#c2643c", accesorios: ["audifonos"] },
    escritorio: { x: 7.8, y: 4.2 }, silla: { x: 8.55, y: 3.65 }, asiento: { x: 2.7, y: 8.45 } },
  { id: "community", nombre: "Lu", rol: "Community manager", emoji: "📲",
    look: { piel: "#dba27c", pelo: "#6b3f1d", peinado: "cola", camisa: "#db2777", accesorios: ["telefono", "collar"] },
    escritorio: { x: 7.8, y: 6.8 }, silla: { x: 8.55, y: 6.25 }, asiento: { x: 3.95, y: 7.45 } },
];

export const MESA = { x: 1.05, y: 5.75, w: 2.55, d: 2.0 };
export const SILLA_OSCAR = { x: 2.3, y: 5.15 };

/** Ruta caminando del escritorio a la mesa de reuniones (por el pasillo, sin atravesar muebles). */
export function rutaReunion(a) {
  const s = a.silla, m = a.asiento;
  return [s, { x: 4.6, y: s.y }, { x: 4.6, y: m.y }, m];
}

/** Punto de una ruta según el avance 0–1 (velocidad constante). */
export function puntoEnRuta(ruta, k) {
  const tramos = [];
  let total = 0;
  for (let i = 1; i < ruta.length; i++) {
    const l = Math.hypot(ruta[i].x - ruta[i - 1].x, ruta[i].y - ruta[i - 1].y);
    tramos.push(l); total += l;
  }
  let d = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < tramos.length; i++) {
    if (d <= tramos[i] || i === tramos.length - 1) {
      const f = tramos[i] ? Math.min(1, d / tramos[i]) : 1;
      const a = ruta[i], b = ruta[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y };
    }
    d -= tramos[i];
  }
  return { ...ruta.at(-1), dx: 0, dy: 0 };
}

/* ─── Primitivas ───────────────────────────────────────────── */

function poligono(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

/** Caja isométrica: cara de arriba, cara izquierda (frente) y cara derecha. */
function caja(ctx, x, y, w, d, h, c, z = 0) {
  const p = (a, b, zz) => iso(a, b, zz);
  poligono(ctx, [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], c.izq);
  poligono(ctx, [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], c.der);
  poligono(ctx, [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], c.arriba);
}

const px = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

/* ─── Habitación ───────────────────────────────────────────── */

function cieloSegunHora() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }));
  if (h >= 6 && h < 17) return { arriba: "#7cc4f0", abajo: "#cfeefc", noche: false };
  if (h >= 17 && h < 19) return { arriba: "#f59e5b", abajo: "#fcd9a8", noche: false };
  return { arriba: "#0f1b3d", abajo: "#2b3b6b", noche: true };
}

function dibujarHabitacion(ctx, t) {
  // Fondo
  ctx.fillStyle = "#0b1a0b"; ctx.fillRect(0, 0, W, H);

  // Paredes (izquierda: x=0, derecha: y=0)
  const izq = [iso(0, FILAS, 0), iso(0, 0, 0), iso(0, 0, MUROS), iso(0, FILAS, MUROS)];
  const der = [iso(0, 0, 0), iso(COLS, 0, 0), iso(COLS, 0, MUROS), iso(0, 0, MUROS)];
  poligono(ctx, izq, "#d9cdb0");
  poligono(ctx, der, "#e9dfc4");
  // Zócalo y borde superior
  poligono(ctx, [iso(0, FILAS, 0), iso(0, 0, 0), iso(0, 0, 4), iso(0, FILAS, 4)], "#8a6a45");
  poligono(ctx, [iso(0, 0, 0), iso(COLS, 0, 0), iso(COLS, 0, 4), iso(0, 0, 4)], "#9a7850");
  poligono(ctx, [iso(0, FILAS, MUROS), iso(0, 0, MUROS), iso(0, 0, MUROS + 3), iso(0, FILAS, MUROS + 3)], "#5c4630");
  poligono(ctx, [iso(0, 0, MUROS), iso(COLS, 0, MUROS), iso(COLS, 0, MUROS + 3), iso(0, 0, MUROS + 3)], "#6b5236");

  // Piso de madera en dos tonos
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < FILAS; y++) {
      const reunion = x <= 4 && y >= 5;
      const c = reunion ? ((x + y) % 2 ? "#3f7a3a" : "#468443") : ((x + y) % 2 ? "#b88a57" : "#c4955f");
      poligono(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
    }
  }

  // Ventanal con vista al embalse y las montañas (pared derecha, x 1.2–4.6)
  const cielo = cieloSegunHora();
  const v = (a, z) => iso(a, 0, z);
  const x0 = 1.2, x1 = 4.6, z0 = 14, z1 = 38;
  const g = ctx.createLinearGradient(0, v(x0, z1).y, 0, v(x0, z0).y);
  g.addColorStop(0, cielo.arriba); g.addColorStop(1, cielo.abajo);
  ctx.fillStyle = g;
  ctx.beginPath(); [v(x0, z0), v(x1, z0), v(x1, z1), v(x0, z1)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.fill();
  ctx.save();
  ctx.beginPath(); [v(x0, z0), v(x1, z0), v(x1, z1), v(x0, z1)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.clip();
  for (let i = 0; i <= 34; i++) {
    const a = x0 + (x1 - x0) * (i / 34);
    const montaña = 22 + Math.sin(a * 2.3) * 4 + Math.sin(a * 5.1) * 2;
    const base = v(a, z0);
    const p = v(a, montaña);
    px(ctx, base.x, p.y, 3, base.y - p.y, cielo.noche ? "#1d3a2a" : "#3d7a4a");
    const lago = v(a, 19);
    px(ctx, base.x, lago.y, 3, base.y - lago.y, cielo.noche ? "#1e3a5f" : "#5aa7c9");
  }
  if (cielo.noche) for (let i = 0; i < 8; i++) { const s = v(x0 + 0.3 + i * 0.42, 32 + (i % 3) * 2); px(ctx, s.x, s.y, 1, 1, "#fff"); }
  ctx.restore();
  // Marco de la ventana
  ctx.strokeStyle = "#6b5236"; ctx.lineWidth = 2;
  ctx.beginPath(); [v(x0, z0), v(x1, z0), v(x1, z1), v(x0, z1), v(x0, z0)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  ctx.beginPath(); const m1 = v((x0 + x1) / 2, z0), m2 = v((x0 + x1) / 2, z1); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();

  // Cuadro de la mariposa 88 (pared derecha)
  const c0 = iso(6.4, 0, 20), c1 = iso(8.6, 0, 38);
  poligono(ctx, [iso(6.4, 0, 20), iso(8.6, 0, 20), iso(8.6, 0, 38), iso(6.4, 0, 38)], "#24452a");
  const cx = (c0.x + c1.x) / 2, cy = (c0.y + c1.y) / 2;
  const aleteo = Math.round(Math.sin(t * 3) * 1);
  px(ctx, cx - 7 - aleteo, cy - 4, 6, 7, "#f5f5f0"); px(ctx, cx + 1 + aleteo, cy - 4, 6, 7, "#f5f5f0");
  px(ctx, cx - 7 - aleteo, cy - 4, 6, 2, "#c81e1e"); px(ctx, cx + 1 + aleteo, cy - 4, 6, 2, "#c81e1e");
  px(ctx, cx - 5 - aleteo, cy, 1, 2, "#111"); px(ctx, cx - 3 - aleteo, cy, 1, 2, "#111");
  px(ctx, cx + 3 + aleteo, cy, 1, 2, "#111"); px(ctx, cx + 5 + aleteo, cy, 1, 2, "#111");
  px(ctx, cx - 1, cy - 5, 2, 9, "#1a1a1a");

  // Tablero de la sala de reuniones (pared izquierda)
  poligono(ctx, [iso(0, 5.3, 16), iso(0, 8.4, 16), iso(0, 8.4, 36), iso(0, 5.3, 36)], "#f8fafc");
  poligono(ctx, [iso(0, 5.3, 16), iso(0, 8.4, 16), iso(0, 8.4, 17), iso(0, 5.3, 17)], "#94a3b8");
  for (let i = 0; i < 4; i++) {
    const a = iso(0, 5.7 + i * 0.25, 31 - i * 4), b = iso(0, 7.4 - i * 0.2, 31 - i * 4);
    ctx.strokeStyle = ["#16a34a", "#d97706", "#2563eb", "#db2777"][i]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Letrero "EARTH PARK" (pared izquierda, zona de trabajo)
  poligono(ctx, [iso(0, 1.4, 24), iso(0, 3.8, 24), iso(0, 3.8, 34), iso(0, 1.4, 34)], "#14532d");
  // Texto inclinado sobre la pared izquierda
  const l0 = iso(0, 3.55, 27.5), l1 = iso(0, 1.65, 27.5);
  ctx.save();
  ctx.translate(l0.x, l0.y);
  ctx.transform(1, (l1.y - l0.y) / (l1.x - l0.x), 0, 1, 0, 0);
  ctx.font = "800 4.2px Outfit, Inter, sans-serif";
  ctx.fillStyle = "#a3e635"; ctx.textBaseline = "alphabetic";
  ctx.fillText("EARTH PARK", 0.6, 0);
  ctx.restore();
}

/* ─── Muebles ──────────────────────────────────────────────── */

const MADERA = { arriba: "#8b5e34", izq: "#6b4423", der: "#5a381c" };
const MESA_C = { arriba: "#e7dcc6", izq: "#b9a988", der: "#a6957a" };

function escritorio(ctx, e, color, t, trabajando) {
  caja(ctx, e.x, e.y, 1.6, 0.85, 3, MADERA, 10);
  caja(ctx, e.x + 0.05, e.y + 0.7, 0.12, 0.12, 10, { arriba: "#3a2614", izq: "#3a2614", der: "#2a1a0e" });
  caja(ctx, e.x + 1.45, e.y + 0.7, 0.12, 0.12, 10, { arriba: "#3a2614", izq: "#3a2614", der: "#2a1a0e" });
  // Monitor (se ve por detrás; la luz de la pantalla ilumina al agente)
  caja(ctx, e.x + 0.45, e.y + 0.15, 0.75, 0.12, 9, { arriba: "#334155", izq: "#1e293b", der: "#0f172a" }, 13);
  const p = iso(e.x + 0.82, e.y + 0.2, 23);
  if (trabajando) {
    ctx.fillStyle = color; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6 + e.x);
    ctx.fillRect(p.x - 7, p.y - 9, 14, 6); ctx.globalAlpha = 1;
  }
  // Taza
  const taza = iso(e.x + 1.35, e.y + 0.55, 13);
  px(ctx, taza.x - 1, taza.y - 3, 3, 3, "#f8fafc");
}

function planta(ctx, x, y, t, grande = false) {
  caja(ctx, x, y, 0.5, 0.5, 6, { arriba: "#3f2a1a", izq: "#b45309", der: "#92400e" });
  const p = iso(x + 0.25, y + 0.25, 6);
  const s = grande ? 1.35 : 1;
  const viento = Math.sin(t * 1.5 + x) * 0.5;
  // Hojas alargadas que salen de la maceta, con dos tonos de verde y contorno suave
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36;
    const largo = (7 + (i % 3) * 2) * s;
    const hx = p.x + Math.cos(a) * largo * 0.55 + viento * (i / 9);
    const hy = p.y - 1 + Math.sin(a) * largo * 0.55;
    ctx.beginPath();
    ctx.ellipse(hx, hy, largo * 0.5, 1.5 * s, a, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? "#15803d" : "#22c55e"; ctx.fill();
    ctx.lineWidth = 0.35; ctx.strokeStyle = "#14532d"; ctx.stroke();
  }
}

function cafetera(ctx, t) {
  caja(ctx, 0.15, 3.0, 0.7, 0.9, 12, MADERA);
  caja(ctx, 0.3, 3.2, 0.4, 0.45, 9, { arriba: "#1f2937", izq: "#374151", der: "#111827" }, 12);
  const p = iso(0.5, 3.45, 24);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 0.5 * (1 - k);
    px(ctx, p.x + Math.sin(k * 6 + i) * 1.5, p.y - 3 - k * 9, 1, 2, "#e5e7eb");
  }
  ctx.globalAlpha = 1;
}

function sillaReunion(ctx, x, y, color = "#334155") {
  caja(ctx, x - 0.22, y - 0.22, 0.44, 0.44, 5, { arriba: color, izq: "#1e293b", der: "#0f172a" });
}

/* ─── Personajes ───────────────────────────────────────────── */

const CONTORNO = "#1a1410";
const oscurecer = (hex, f = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

function forma(ctx, dibujar, relleno, borde = CONTORNO, grosor = 0.45) {
  ctx.beginPath(); dibujar(); ctx.fillStyle = relleno; ctx.fill();
  if (borde) { ctx.lineWidth = grosor; ctx.strokeStyle = borde; ctx.stroke(); }
}
const rr = (ctx, x, y, w, h, r) => () => ctx.roundRect(x, y, w, h, r);
const circ = (ctx, x, y, r) => () => ctx.arc(x, y, r, 0, Math.PI * 2);
const elip = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

// parte: "atras" (lo que va detrás de la cabeza) · "frente" (flequillo, rizos) · "espalda" (vista de espaldas)
function pelo(ctx, look, cx, cy, r, parte) {
  const c = look.pelo;
  const p = look.peinado;
  if (p === "calvo") return;
  if (parte === "atras" || parte === "espalda") {
    if (p === "largo") forma(ctx, rr(ctx, cx - r - 0.6, cy - r * 0.2, r * 2 + 1.2, r * 1.9, 1.8), c);
    if (p === "cola") forma(ctx, elip(ctx, cx + r + 0.8, cy + 1.2, 1.4, 3, 0.3), c);
    if (p === "moño") forma(ctx, circ(ctx, cx, cy - r - 1.1, 1.9), c);
    if (parte === "espalda") forma(ctx, circ(ctx, cx, cy, r + (p === "rizado" ? 1.4 : 0.35)), c);
    return;
  }
  // Encima de la frente
  if (p === "rizado") {
    [[-3.4, -1.6], [-2.2, -3.4], [0, -4.2], [2.2, -3.4], [3.4, -1.6], [-4, 0.3], [4, 0.3]]
      .forEach(([dx, dy]) => forma(ctx, circ(ctx, cx + dx, cy + dy, 1.7), c, CONTORNO, 0.35));
    return;
  }
  if (p === "puntas") {
    ctx.beginPath();
    ctx.moveTo(cx - r - 0.3, cy - 0.5);
    for (let k = 0; k <= 5; k++) {
      const a = Math.PI + (k / 5) * Math.PI;
      ctx.lineTo(cx + Math.cos(a) * (r + 2.4), cy - 0.5 + Math.sin(a) * (r + 2.4));
      const b = Math.PI + ((k + 0.5) / 5) * Math.PI;
      if (k < 5) ctx.lineTo(cx + Math.cos(b) * (r + 0.4), cy - 0.5 + Math.sin(b) * (r + 0.4));
    }
    ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = CONTORNO; ctx.stroke();
    return;
  }
  // Casquete con flequillo (corto, largo, cola, moño)
  forma(ctx, () => { ctx.arc(cx, cy, r + 0.4, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(cx + 1, cy - r * 0.15, cx - r * 0.2, cy - r * 0.45); ctx.closePath(); }, c);
  // Brillo del pelo
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(cx - 0.6, cy - 0.4, r - 0.6, Math.PI * 1.25, Math.PI * 1.5); ctx.stroke();
}

/**
 * Agente estilo chibi, con contorno y sombras suaves.
 * modo: "sentado" | "camina" | "reunion" · mirando: "frente" | "espalda"
 */
function personaje(ctx, a, pos, t, { modo = "sentado", trabajando = false, mirando = "frente", fase = 0, look }) {
  const L = { ...a.look, ...(look || {}) };
  const acc = new Set(L.accesorios || []);
  const p = iso(pos.x, pos.y, 0);
  const sentado = modo !== "camina";
  const bob = sentado ? (trabajando ? 0 : Math.sin(t * 2 + fase) * 0.35) : Math.abs(Math.sin(t * 10 + fase)) * 0.8;
  const base = p.y - (sentado ? 6.5 : 1.5) - bob;
  const cx = p.x;
  const espalda = mirando === "espalda";
  const camisa = L.camisa, camisaSombra = oscurecer(L.camisa);

  // Sombra en el piso
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(cx, p.y - 0.3, 4.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();

  // Piernas
  if (!sentado) {
    const paso = Math.sin(t * 10 + fase);
    forma(ctx, rr(ctx, cx - 2.6, base - 2 + Math.max(0, paso) * 0.8, 2.1, 3.4, 0.8), "#2b3445");
    forma(ctx, rr(ctx, cx + 0.5, base - 2 + Math.max(0, -paso) * 0.8, 2.1, 3.4, 0.8), "#2b3445");
  } else if (modo === "reunion") {
    forma(ctx, rr(ctx, cx - 2.6, base - 0.6, 2.1, 2.2, 0.7), "#2b3445");
    forma(ctx, rr(ctx, cx + 0.5, base - 0.6, 2.1, 2.2, 0.7), "#2b3445");
  }

  // Torso (bata de laboratorio encima si la lleva)
  const bata = acc.has("bata");
  forma(ctx, rr(ctx, cx - 4, base - 9, 8, 7.4, 2.2), bata ? "#f4f4f2" : camisa);
  if (bata) forma(ctx, rr(ctx, cx - 1.4, base - 9, 2.8, 5.5, 0.8), camisa, null);
  else { ctx.fillStyle = camisaSombra; ctx.beginPath(); ctx.roundRect(cx + 1.4, base - 8.6, 2.2, 6.6, 1.4); ctx.fill(); }
  // Cuello
  forma(ctx, rr(ctx, cx - 1, base - 10.2, 2, 1.6, 0.5), L.piel, null);
  if (acc.has("collar") && !espalda) {
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.arc(cx, base - 9.4, 1.8, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  // Brazos (al teclear se mueven)
  const tecla = trabajando && sentado ? (Math.sin(t * 14 + fase) + 1) / 2 : 0;
  const brazo = bata ? "#ececea" : camisa;
  forma(ctx, rr(ctx, cx - 5.6, base - 8.4 + tecla * 0.9, 2, 5.6, 1), brazo);
  forma(ctx, rr(ctx, cx + 3.6, base - 8.4 + (1 - tecla) * 0.9, 2, 5.6, 1), brazo);
  forma(ctx, circ(ctx, cx - 4.6, base - 2.6 + tecla * 0.9, 0.95), L.piel, CONTORNO, 0.35);
  forma(ctx, circ(ctx, cx + 4.6, base - 2.6 + (1 - tecla) * 0.9, 0.95), L.piel, CONTORNO, 0.35);
  if (acc.has("telefono") && !espalda) forma(ctx, rr(ctx, cx + 3.9, base - 4.8, 1.5, 2.6, 0.3), "#111827", CONTORNO, 0.3);
  if (acc.has("lupa") && !espalda) {
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(cx - 4.6, base - 2.6); ctx.lineTo(cx - 6.2, base - 5.4); ctx.stroke();
    forma(ctx, circ(ctx, cx - 6.9, base - 6.6, 1.5), "rgba(186,230,253,0.6)", "#334155", 0.5);
  }

  // Cabeza
  const hx = cx, hy = base - 14.2, r = 4.5;
  if (espalda) pelo(ctx, L, hx, hy, r, "espalda");
  else {
    pelo(ctx, L, hx, hy, r, "atras");
    forma(ctx, circ(ctx, hx, hy, r), L.piel);
    // Sombra suave de la cara
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.beginPath(); ctx.arc(hx + 1.2, hy + 0.6, r - 0.8, -0.8, 1.6); ctx.fill();
    pelo(ctx, L, hx, hy, r, "frente");
    // Ojos (parpadean)
    const parpadeo = (t + fase) % 4 < 0.12;
    if (parpadeo) {
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(hx - 2.4, hy + 0.6); ctx.lineTo(hx - 0.9, hy + 0.6); ctx.moveTo(hx + 0.9, hy + 0.6); ctx.lineTo(hx + 2.4, hy + 0.6); ctx.stroke();
    } else {
      forma(ctx, elip(ctx, hx - 1.6, hy + 0.5, 0.75, 1), "#1f1a17", null);
      forma(ctx, elip(ctx, hx + 1.6, hy + 0.5, 0.75, 1), "#1f1a17", null);
      ctx.fillStyle = "#fff"; ctx.fillRect(hx - 1.9, hy + 0.05, 0.45, 0.45); ctx.fillRect(hx + 1.3, hy + 0.05, 0.45, 0.45);
    }
    // Mejillas y boca
    ctx.fillStyle = "rgba(244,114,182,0.35)";
    ctx.beginPath(); ctx.arc(hx - 2.8, hy + 2, 0.8, 0, Math.PI * 2); ctx.arc(hx + 2.8, hy + 2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(hx, hy + 2.1, 0.9, 0.2, Math.PI - 0.2); ctx.stroke();
    if (acc.has("gafas")) {
      ctx.strokeStyle = "#111"; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.arc(hx - 1.6, hy + 0.5, 1.35, 0, Math.PI * 2); ctx.moveTo(hx + 2.95, hy + 0.5); ctx.arc(hx + 1.6, hy + 0.5, 1.35, 0, Math.PI * 2);
      ctx.moveTo(hx - 0.25, hy + 0.4); ctx.lineTo(hx + 0.25, hy + 0.4); ctx.stroke();
    }
  }
  // Accesorios de cabeza
  if (acc.has("boina")) forma(ctx, elip(ctx, hx + 0.6, hy - r + 0.3, 4.3, 1.6, -0.15), "#be123c");
  if (acc.has("gorra")) {
    forma(ctx, () => ctx.arc(hx, hy - 0.8, r + 0.3, Math.PI, 0), L.camisa);
    if (!espalda) forma(ctx, elip(ctx, hx - 2.2, hy - 0.8, 3.2, 0.9), oscurecer(L.camisa, 0.7));
  }
  if (acc.has("audifonos")) {
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(hx, hy - 0.2, r + 0.6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    forma(ctx, rr(ctx, hx - r - 1.4, hy - 0.8, 1.8, 3, 0.7), "#111827");
    forma(ctx, rr(ctx, hx + r - 0.4, hy - 0.8, 1.8, 3, 0.7), "#111827");
  }
  if (acc.has("lapiz")) {
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(hx + r - 0.6, hy - 2.6); ctx.lineTo(hx + r + 1.4, hy + 0.6); ctx.stroke();
    ctx.fillStyle = "#f472b6"; ctx.fillRect(hx + r - 1.1, hy - 3.1, 0.9, 0.9);
  }
}

/** Retrato del avatar (para el panel y el editor): dibuja al agente de frente en un lienzo pequeño. */
export function dibujarRetrato(canvas, a, look) {
  const ctx = canvas.getContext("2d");
  const s = canvas.width / 17;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  // Coloca al personaje centrado: iso() se compensa con un origen de cuadrícula conocido
  const o = iso(0, 0, 0);
  ctx.translate(8.5 - o.x, 24 - o.y);
  personaje(ctx, a, { x: 0, y: 0 }, 0.5, { modo: "camina", trabajando: false, mirando: "frente", fase: 0, look });
}

/* ─── Escena completa ──────────────────────────────────────── */

/**
 * estados: { [id]: { trabajando, enReunion: k (0 escritorio → 1 sentado en la mesa) } }
 * reunionPendiente: resalta la silla de Oscar
 */
export function dibujarOficina(ctx, t, estados = {}, { reunionPendiente = false, looks = {} } = {}) {
  ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  ctx.imageSmoothingEnabled = true;
  dibujarHabitacion(ctx, t);

  // Objetos a ordenar por profundidad (x + y)
  const cosas = [];
  cosas.push({ z: 0.3 + 0.3, f: () => planta(ctx, 0.3, 0.3, t, true) });
  cosas.push({ z: 9.3 + 0.3, f: () => planta(ctx, 9.3, 0.3, t) });
  cosas.push({ z: 0.1 + 8.5, f: () => planta(ctx, 0.1, 8.4, t) });
  cosas.push({ z: 9.4 + 2.9, f: () => planta(ctx, 9.4, 2.9, t) });
  cosas.push({ z: 0.5 + 3.45, f: () => cafetera(ctx, t) });

  // Sala de reuniones: mesa y sillas
  const sillas = [...AGENTES.map((a) => a.asiento)];
  sillas.forEach((s) => cosas.push({ z: s.x + s.y - 0.3, f: () => sillaReunion(ctx, s.x, s.y) }));
  cosas.push({ z: SILLA_OSCAR.x + SILLA_OSCAR.y - 0.3, f: () => {
    sillaReunion(ctx, SILLA_OSCAR.x, SILLA_OSCAR.y, reunionPendiente ? "#a3e635" : "#334155");
    if (reunionPendiente) {
      const p = iso(SILLA_OSCAR.x, SILLA_OSCAR.y, 14 + Math.round(Math.sin(t * 4) * 2));
      px(ctx, p.x - 1, p.y - 6, 3, 5, "#facc15"); px(ctx, p.x - 1, p.y + 1, 3, 2, "#facc15");
    }
  } });
  cosas.push({ z: MESA.x + MESA.w / 2 + MESA.y + MESA.d / 2, f: () => {
    caja(ctx, MESA.x, MESA.y, MESA.w, MESA.d, 2, MESA_C, 9);
    caja(ctx, MESA.x + MESA.w / 2 - 0.15, MESA.y + MESA.d / 2 - 0.15, 0.3, 0.3, 9, { arriba: "#78716c", izq: "#57534e", der: "#44403c" });
    // Papeles y laptop en la mesa
    const pa = iso(MESA.x + 0.6, MESA.y + 0.6, 11); px(ctx, pa.x - 3, pa.y - 1, 6, 3, "#fff");
    const pb = iso(MESA.x + 1.8, MESA.y + 1.3, 11); px(ctx, pb.x - 4, pb.y - 1, 8, 3, "#cbd5e1"); px(ctx, pb.x - 4, pb.y - 5, 8, 4, "#334155");
    if (reunionPendiente) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); px(ctx, pb.x - 3, pb.y - 4, 6, 2, "#a3e635"); ctx.globalAlpha = 1; }
  } });

  AGENTES.forEach((a, i) => {
    const st = estados[a.id] || {};
    const e = a.escritorio;
    cosas.push({ z: e.x + 0.8 + e.y + 0.42, f: () => escritorio(ctx, e, (looks[a.id]?.camisa || a.look.camisa), t, st.trabajando && !(st.enReunion > 0)) });
    // Silla del escritorio
    cosas.push({ z: a.silla.x + a.silla.y - 0.35, f: () => caja(ctx, a.silla.x - 0.25, a.silla.y - 0.3, 0.5, 0.5, 6, { arriba: "#1f2937", izq: "#111827", der: "#030712" }) });

    const k = st.enReunion || 0;
    let pos, modo, mirando = "frente";
    if (k <= 0) { pos = a.silla; modo = "sentado"; }
    else if (k >= 1) { pos = a.asiento; modo = "reunion"; mirando = a.asiento.x > 3 ? "frente" : "frente"; }
    else { pos = puntoEnRuta(rutaReunion(a), k); modo = "camina"; mirando = pos.dy < 0 || pos.dx < 0 ? "espalda" : "frente"; }
    cosas.push({ z: pos.x + pos.y, f: () => personaje(ctx, a, pos, t, { modo, trabajando: st.trabajando, mirando, fase: i * 1.7, look: looks[a.id] }) });
  });

  cosas.sort((a, b) => a.z - b.z).forEach((c) => c.f());
}

/** Posición en el lienzo (para las etiquetas HTML) de un agente en su estado actual. */
export function posicionAgente(a, enReunion = 0) {
  const pos = enReunion <= 0 ? a.silla : enReunion >= 1 ? a.asiento : puntoEnRuta(rutaReunion(a), enReunion);
  const p = iso(pos.x, pos.y, 0);
  return { x: p.x, y: p.y - (enReunion > 0 && enReunion < 1 ? 18 : 22) };
}

export const POS_SILLA_OSCAR = () => iso(SILLA_OSCAR.x, SILLA_OSCAR.y, 22);
