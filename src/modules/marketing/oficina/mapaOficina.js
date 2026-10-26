// Oficina Earth Park: isométrica, dibujada con código (sin imágenes, salvo el logo de la marca).
// Jardín zen, ventanal de lado a lado hacia el embalse, zona de café, jardín vertical, tablero con KPI en vivo
// y naturaleza en movimiento (mariposas, pájaros, nubes, agua). Se dibuja a ESCALA× para que se vea definida.

export const W = 286;
export const H = 196;
export const ESCALA = 3;
const TW = 24, TH = 12;            // tamaño de una baldosa isométrica
const OX = 131, OY = 58;           // origen de la cuadrícula en el lienzo
const MUROS = 48;                  // alto de las paredes
const COLS = 12, FILAS = 10;
const ZEN_X = 10.1;                // desde aquí (x) empieza el jardín zen

/** Cuadrícula (x, y, altura z) → punto del lienzo lógico. */
export function iso(x, y, z = 0) {
  return { x: OX + (x - y) * (TW / 2), y: OY + (x + y) * (TH / 2) - z };
}

/* ─── Agentes y su sitio en la oficina ─────────────────────── */
// "look" es el avatar por defecto; se cambia en "Diseñar equipo" (personajes originales).

export const PEINADOS = ["corto", "largo", "cola", "rizado", "moño", "puntas", "calvo"];
export const ACCESORIOS = ["ninguno", "gafas", "boina", "audifonos", "gorra", "lapiz", "bata", "lupa", "telefono", "collar"];

export const AGENTES = [
  { id: "investigador", nombre: "Iván", rol: "Investigador", emoji: "🔬",
    look: { piel: "#c98e62", pelo: "#1f1a17", peinado: "rizado", camisa: "#0f766e", accesorios: ["bata", "gafas", "lupa"] },
    escritorio: { x: 5.2, y: 6.8 }, silla: { x: 5.95, y: 6.25 }, asiento: { x: 3.95, y: 6.85 }, cafe: { x: 2.0, y: 3.15 } },
  { id: "estratega", nombre: "Sofía", rol: "Estratega", emoji: "🧭",
    look: { piel: "#e8b48a", pelo: "#3b2414", peinado: "largo", camisa: "#2f7d4f", accesorios: ["gafas"] },
    escritorio: { x: 5.2, y: 1.6 }, silla: { x: 5.95, y: 1.05 }, asiento: { x: 0.55, y: 6.9 }, cafe: { x: 1.2, y: 2.35 } },
  { id: "guionista", nombre: "Mateo", rol: "Guionista", emoji: "✍️",
    look: { piel: "#c98e62", pelo: "#151515", peinado: "corto", camisa: "#d97706", accesorios: ["lapiz"] },
    escritorio: { x: 7.8, y: 1.6 }, silla: { x: 8.55, y: 1.05 }, asiento: { x: 0.55, y: 8.0 }, cafe: { x: 2.8, y: 2.35 } },
  { id: "disenador", nombre: "Valen", rol: "Diseñadora", emoji: "🎨",
    look: { piel: "#f1c7a1", pelo: "#b4532a", peinado: "moño", camisa: "#7c3aed", accesorios: ["boina"] },
    escritorio: { x: 5.2, y: 4.2 }, silla: { x: 5.95, y: 3.65 }, asiento: { x: 1.6, y: 8.95 }, cafe: { x: 1.2, y: 2.35 } },
  { id: "editor", nombre: "Claudia", rol: "Editora de video", emoji: "🎬",
    look: { piel: "#e2a87e", pelo: "#5b3a29", peinado: "rizado", camisa: "#c2643c", accesorios: ["audifonos"] },
    escritorio: { x: 7.8, y: 4.2 }, silla: { x: 8.55, y: 3.65 }, asiento: { x: 2.7, y: 8.95 }, cafe: { x: 2.8, y: 2.35 } },
  { id: "community", nombre: "Lu", rol: "Community manager", emoji: "📲",
    look: { piel: "#dba27c", pelo: "#6b3f1d", peinado: "cola", camisa: "#db2777", accesorios: ["telefono", "collar"] },
    escritorio: { x: 7.8, y: 6.8 }, silla: { x: 8.55, y: 6.25 }, asiento: { x: 3.95, y: 7.95 }, cafe: { x: 2.0, y: 3.15 } },
];

export const MESA = { x: 1.05, y: 6.25, w: 2.55, d: 2.0 };
export const SILLA_OSCAR = { x: 2.3, y: 5.65 };

/** Ruta a la mesa de reuniones (por el pasillo, sin atravesar muebles). */
export function rutaReunion(a) {
  const s = a.silla, m = a.asiento;
  return [s, { x: 4.6, y: s.y }, { x: 4.6, y: m.y }, m];
}
/** Ruta a la zona de café. */
export function rutaCafe(a) {
  const s = a.silla, c = a.cafe;
  return [s, { x: 4.6, y: s.y }, { x: 4.6, y: c.y }, c];
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

/** Dónde está un agente: en la mesa, en el café, caminando o en su escritorio. */
function ubicacion(a, enReunion = 0, enCafe = 0) {
  if (enReunion > 0) {
    if (enReunion >= 1) return { pos: a.asiento, modo: "reunion", mirando: "frente" };
    const p = puntoEnRuta(rutaReunion(a), enReunion);
    return { pos: p, modo: "camina", mirando: p.dy < 0 || p.dx < 0 ? "espalda" : "frente" };
  }
  if (enCafe > 0) {
    if (enCafe >= 1) return { pos: a.cafe, modo: "camina", quieto: true, mirando: "frente" };
    const p = puntoEnRuta(rutaCafe(a), enCafe);
    return { pos: p, modo: "camina", mirando: p.dy < 0 || p.dx < 0 ? "espalda" : "frente" };
  }
  return { pos: a.silla, modo: "sentado", mirando: "frente" };
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

/** Dibuja sobre la pared izquierda (x = 0) como si fuera un plano: u hacia la derecha, v hacia abajo. */
function enParedIzq(ctx, y0, z0, fn) {
  const o = iso(0, y0, z0);
  ctx.save();
  ctx.transform(1, -0.5, 0, 1, o.x, o.y);
  fn();
  ctx.restore();
}
/** Igual sobre la pared derecha (y = 0). */
function enParedDer(ctx, x0, z0, fn) {
  const o = iso(x0, 0, z0);
  ctx.save();
  ctx.transform(1, 0.5, 0, 1, o.x, o.y);
  fn();
  ctx.restore();
}

/* ─── Logo de la marca ─── */
let logo = null;
function logoMarca() {
  if (!logo && typeof Image !== "undefined") {
    logo = new Image();
    logo.src = `${import.meta.env.BASE_URL}logo-earth-park.png`;
  }
  return logo?.complete && logo.naturalWidth ? logo : null;
}

/* ─── Habitación ───────────────────────────────────────────── */

function cieloSegunHora() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }));
  if (h >= 6 && h < 17) return { arriba: "#6cb8ea", abajo: "#d3effc", montaña: "#3f7d4c", montaña2: "#5f9a68", lago: "#4f9fc4", noche: false };
  if (h >= 17 && h < 19) return { arriba: "#f08a4b", abajo: "#fcd9a8", montaña: "#5b4a5e", montaña2: "#7a5f6a", lago: "#e59b6b", noche: false };
  return { arriba: "#0c1736", abajo: "#24366a", montaña: "#14261d", montaña2: "#1d3328", lago: "#1b3557", noche: true };
}

function dibujarHabitacion(ctx, t, kpis) {
  ctx.fillStyle = "#0a1a0c"; ctx.fillRect(0, 0, W, H);

  // Paredes
  poligono(ctx, [iso(0, FILAS), iso(0, 0), iso(0, 0, MUROS), iso(0, FILAS, MUROS)], "#e3d9bf");
  poligono(ctx, [iso(0, 0), iso(COLS, 0), iso(COLS, 0, MUROS), iso(0, 0, MUROS)], "#efe6cc");
  poligono(ctx, [iso(0, FILAS), iso(0, 0), iso(0, 0, 4), iso(0, FILAS, 4)], "#7a5a3a");
  poligono(ctx, [iso(0, 0), iso(COLS, 0), iso(COLS, 0, 4), iso(0, 0, 4)], "#8a6844");
  poligono(ctx, [iso(0, FILAS, MUROS), iso(0, 0, MUROS), iso(0, 0, MUROS + 3), iso(0, FILAS, MUROS + 3)], "#4e3a26");
  poligono(ctx, [iso(0, 0, MUROS), iso(COLS, 0, MUROS), iso(COLS, 0, MUROS + 3), iso(0, 0, MUROS + 3)], "#5d4630");

  // Piso: madera en trabajo, alfombra verde en reuniones, arena en el jardín zen, baldosa en el café
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < FILAS; y++) {
      let c;
      if (x >= 10) c = (x + y) % 2 ? "#e6dcc2" : "#ebe2ca";
      else if (x <= 4 && y >= 5) c = (x + y) % 2 ? "#3f7a3a" : "#468443";
      else if (x <= 3 && y <= 3) c = (x + y) % 2 ? "#d6cbb5" : "#cbbfa6";
      else c = (x + y) % 2 ? "#b88a57" : "#c4955f";
      poligono(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
    }
  }

  ventanal(ctx, t);
  jardinVertical(ctx, t);

  // Logo de Earth Park en la pared, en un marco de madera
  enParedIzq(ctx, 3.45, 44, () => {
    ctx.fillStyle = "#5d4630"; ctx.beginPath(); ctx.roundRect(-1, -1, 33, 27, 2); ctx.fill();
    ctx.fillStyle = "#f7f3e8"; ctx.beginPath(); ctx.roundRect(0.5, 0.5, 30, 24, 1.5); ctx.fill();
    const l = logoMarca();
    if (l) ctx.drawImage(l, 3.5, 1.5, 22, 22 * (l.height / l.width));
    else { ctx.fillStyle = "#14532d"; ctx.font = "800 4px Outfit, sans-serif"; ctx.fillText("EARTH PARK", 3, 13); }
  });

  tablero(ctx, t, kpis);
}

function ventanal(ctx, t) {
  const cielo = cieloSegunHora();
  const x0 = 0.3, x1 = COLS - 0.3, z0 = 14, z1 = 43;
  const marco = [iso(x0, 0, z0), iso(x1, 0, z0), iso(x1, 0, z1), iso(x0, 0, z1)];
  ctx.save();
  ctx.beginPath(); marco.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
  enParedDer(ctx, x0, z1, () => {
    const ancho = (x1 - x0) * 12, alto = z1 - z0;
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, cielo.arriba); g.addColorStop(1, cielo.abajo);
    ctx.fillStyle = g; ctx.fillRect(0, 0, ancho, alto);
    if (cielo.noche) {
      for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect((i * 37) % ancho, (i * 13) % 12, 0.6, 0.6); }
      ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(ancho * 0.8, 6, 2.4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,240,200,0.9)"; ctx.beginPath(); ctx.arc(ancho * 0.78, 7, 3, 0, Math.PI * 2); ctx.fill();
      // Nubes que pasan
      for (let i = 0; i < 4; i++) {
        const cx = ((t * 1.5 + i * 37) % (ancho + 30)) - 15, cy = 4 + (i % 2) * 4;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.ellipse(cx, cy, 6, 1.8, 0, 0, Math.PI * 2); ctx.ellipse(cx + 3, cy - 1, 3.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Montañas del Valle de Tenza y el embalse
    const sierra = (base, amp, frec, color, fase) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, alto);
      for (let x = 0; x <= ancho; x += 2) ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(x * frec + fase)) - Math.sin(x * frec * 2.7) * amp * 0.25);
      ctx.lineTo(ancho, alto); ctx.closePath(); ctx.fill();
    };
    sierra(alto * 0.55, 7, 0.05, cielo.montaña2, 1);
    sierra(alto * 0.7, 6, 0.07, cielo.montaña, 2.4);
    ctx.fillStyle = cielo.lago; ctx.fillRect(0, alto * 0.74, ancho, alto * 0.26);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 10; i++) ctx.fillRect(((i * 23 + t * 3) % ancho), alto * 0.8 + (i % 3) * 1.6, 4, 0.4);
    // Pájaros
    if (!cielo.noche) {
      ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 0.4;
      for (let i = 0; i < 3; i++) {
        const bx = ((t * 6 + i * 50) % (ancho + 20)) - 10, by = 8 + i * 2 + Math.sin(t * 2 + i) * 1.2, al = Math.sin(t * 9 + i) * 0.8;
        ctx.beginPath(); ctx.moveTo(bx - 1.6, by - al); ctx.lineTo(bx, by); ctx.lineTo(bx + 1.6, by - al); ctx.stroke();
      }
    }
  });
  ctx.restore();
  // Marco y parteluces del ventanal
  ctx.strokeStyle = "#4e3a26"; ctx.lineWidth = 1.4;
  ctx.beginPath(); marco.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 0.8;
  for (let x = x0 + 2.85; x < x1 - 0.5; x += 2.85) { const a = iso(x, 0, z0), b = iso(x, 0, z1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // Enredadera que cuelga del borde superior
  for (let i = 0; i < 18; i++) {
    const xx = x0 + 0.3 + i * 0.64;
    const largo = 3 + (i * 7 % 5) * 1.6;
    const p = iso(xx, 0, z1 + 1);
    ctx.strokeStyle = "#166534"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + Math.sin(t + i) * 0.8, p.y + largo / 2, p.x + Math.sin(t * 1.2 + i) * 0.6, p.y + largo); ctx.stroke();
    for (let k = 1; k <= 3; k++) {
      ctx.fillStyle = k % 2 ? "#22c55e" : "#16a34a";
      ctx.beginPath(); ctx.ellipse(p.x + Math.sin(t * 1.2 + i) * 0.6 * (k / 3) + (k % 2 ? 0.7 : -0.7), p.y + (largo * k) / 3.2, 0.9, 0.5, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function jardinVertical(ctx, t) {
  enParedIzq(ctx, 5.3, 44, () => {
    ctx.fillStyle = "#2b4a2b"; ctx.beginPath(); ctx.roundRect(0, 0, 17, 36, 1.5); ctx.fill();
    for (let i = 0; i < 46; i++) {
      const x = 1.5 + (i * 7.3) % 14.5, y = 1.5 + (i * 5.1) % 33;
      const s = Math.sin(t * 1.3 + i) * 0.25;
      ctx.fillStyle = ["#22c55e", "#15803d", "#4ade80", "#166534"][i % 4];
      ctx.beginPath(); ctx.ellipse(x, y, 1.9, 1, (i % 3) - 1 + s, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 5; i++) { ctx.fillStyle = ["#f472b6", "#facc15", "#fb923c"][i % 3]; ctx.beginPath(); ctx.arc(3 + i * 2.7, 6 + (i * 11) % 26, 0.7, 0, Math.PI * 2); ctx.fill(); }
  });
}

/** Tablero con KPI de la semana: cambia solo cuando cambia el plan. */
function tablero(ctx, t, k = {}) {
  enParedIzq(ctx, 9.6, 44, () => {
    const Wt = 46, Ht = 33;
    ctx.fillStyle = "#4e3a26"; ctx.beginPath(); ctx.roundRect(-1, -1, Wt + 2, Ht + 2, 2); ctx.fill();
    ctx.fillStyle = "#10261a"; ctx.beginPath(); ctx.roundRect(0, 0, Wt, Ht, 1.5); ctx.fill();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#a3e635"; ctx.font = "800 3.4px Outfit, Inter, sans-serif";
    ctx.fillText("TABLERO DE LA SEMANA", 2.5, 5);
    if (k.enReunion) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.fillStyle = "#facc15"; ctx.fillText("● EN REUNIÓN", Wt - 21, 5);
      ctx.globalAlpha = 1;
    }
    const total = Math.max(1, k.total || 0);
    const filas = [
      ["Aprobado", k.aprobadas || 0, "#34d399"],
      ["Producido", k.producidas || 0, "#60a5fa"],
      ["Publicado", k.publicadas || 0, "#f472b6"],
    ];
    filas.forEach(([nombre, v, color], i) => {
      const y = 9 + i * 6.4;
      ctx.fillStyle = "#e5e7eb"; ctx.font = "600 2.6px Inter, sans-serif"; ctx.fillText(nombre, 2.5, y + 2.2);
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.roundRect(15, y, 22, 2.6, 1.3); ctx.fill();
      const f = k.total ? Math.min(1, v / total) : 0;
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(15, y, Math.max(0.01, 22 * f), 2.6, 1.3); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 2.6px Inter, sans-serif"; ctx.fillText(`${v}/${k.total || 0}`, 38.5, y + 2.2);
    });
    ctx.fillStyle = "#cbd5e1"; ctx.font = "500 2.4px Inter, sans-serif";
    ctx.fillText(k.proxima ? `Próxima: ${k.proxima}` : "Sin publicaciones programadas", 2.5, 29.5);
  });
}

/* ─── Muebles ──────────────────────────────────────────────── */

const MADERA = { arriba: "#8b5e34", izq: "#6b4423", der: "#5a381c" };
const MADERA_CLARA = { arriba: "#c08a52", izq: "#9a6a3a", der: "#87592f" };
const MESA_C = { arriba: "#e7dcc6", izq: "#b9a988", der: "#a6957a" };

function escritorio(ctx, e, color, t, trabajando) {
  caja(ctx, e.x, e.y, 1.6, 0.85, 3, MADERA, 10);
  caja(ctx, e.x + 0.05, e.y + 0.7, 0.12, 0.12, 10, { arriba: "#3a2614", izq: "#3a2614", der: "#2a1a0e" });
  caja(ctx, e.x + 1.45, e.y + 0.7, 0.12, 0.12, 10, { arriba: "#3a2614", izq: "#3a2614", der: "#2a1a0e" });
  caja(ctx, e.x + 0.45, e.y + 0.15, 0.75, 0.12, 9, { arriba: "#334155", izq: "#1e293b", der: "#0f172a" }, 13);
  const p = iso(e.x + 0.82, e.y + 0.2, 23);
  if (trabajando) {
    ctx.fillStyle = color; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6 + e.x);
    ctx.fillRect(p.x - 7, p.y - 9, 14, 6); ctx.globalAlpha = 1;
  }
  const taza = iso(e.x + 1.35, e.y + 0.55, 13);
  px(ctx, taza.x - 1, taza.y - 3, 2.4, 2.6, "#f8fafc");
  // Suculenta pequeña en el escritorio
  const s = iso(e.x + 0.2, e.y + 0.5, 13);
  px(ctx, s.x - 1, s.y - 2, 2.2, 2, "#b45309");
  ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.ellipse(s.x + 0.1, s.y - 2.6, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill();
}

function maceta(ctx, x, y, h = 6, color = { arriba: "#3f2a1a", izq: "#b45309", der: "#92400e" }) {
  caja(ctx, x, y, 0.5, 0.5, h, color);
  return iso(x + 0.25, y + 0.25, h);
}

function planta(ctx, x, y, t, grande = false) {
  const p = maceta(ctx, x, y);
  const s = grande ? 1.35 : 1;
  const viento = Math.sin(t * 1.5 + x) * 0.5;
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

/** Monstera: hojas grandes y redondas. */
function monstera(ctx, x, y, t) {
  const p = maceta(ctx, x, y, 7, { arriba: "#3f2a1a", izq: "#e7e5e4", der: "#d6d3d1" });
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5 + Math.sin(t + i) * 0.05;
    const hx = p.x + Math.cos(a) * 7, hy = p.y - 4 + Math.sin(a) * 9;
    ctx.strokeStyle = "#166534"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 1); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = i % 2 ? "#15803d" : "#16a34a";
    ctx.beginPath(); ctx.ellipse(hx, hy, 3.6, 2.6, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#0f3d22"; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.moveTo(hx - Math.cos(a) * 2.6, hy - Math.sin(a) * 2.6); ctx.lineTo(hx + Math.cos(a) * 2.6, hy + Math.sin(a) * 2.6); ctx.stroke();
  }
}

/** Cactus columnar con brazos (y una flor). */
function cactus(ctx, x, y, t, alto = 12, flor = "#f472b6") {
  const p = maceta(ctx, x, y, 4, { arriba: "#3f2a1a", izq: "#c2410c", der: "#9a3412" });
  const verde = "#3f8f4a", sombra = "#2f6b37";
  const brazo = (dx, h, alto2) => {
    ctx.fillStyle = verde; ctx.beginPath(); ctx.roundRect(p.x + dx, p.y - h - alto2, 1.8, alto2 + 1.5, 0.9); ctx.fill();
    ctx.fillRect(p.x + Math.min(dx, 0) + (dx < 0 ? 1 : 0), p.y - h, Math.abs(dx) + 0.5, 1.6);
  };
  brazo(-3.2, alto * 0.45, alto * 0.3);
  brazo(2.6, alto * 0.6, alto * 0.25);
  ctx.fillStyle = verde; ctx.beginPath(); ctx.roundRect(p.x - 1.3, p.y - alto, 2.8, alto, 1.4); ctx.fill();
  ctx.fillStyle = sombra; ctx.fillRect(p.x + 0.5, p.y - alto + 1, 0.9, alto - 1);
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 0.25;
  for (let i = 1; i < alto; i += 2) { ctx.beginPath(); ctx.moveTo(p.x - 1, p.y - i); ctx.lineTo(p.x - 0.6, p.y - i - 0.4); ctx.stroke(); }
  ctx.fillStyle = flor; ctx.beginPath(); ctx.arc(p.x + 0.1, p.y - alto - 0.4, 0.9 + 0.1 * Math.sin(t * 2), 0, Math.PI * 2); ctx.fill();
}

/** Suculenta redonda (tipo echeveria) en maceta baja. */
function suculenta(ctx, x, y) {
  const p = maceta(ctx, x, y, 3, { arriba: "#3f2a1a", izq: "#a8a29e", der: "#78716c" });
  for (let r = 3; r > 0; r--) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r;
      ctx.fillStyle = r === 1 ? "#a7f3d0" : r === 2 ? "#6ee7b7" : "#34d399";
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * r * 0.9, p.y - 1.5 + Math.sin(a) * r * 0.45, 1.1, 0.7, a, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* ─── Zona de café ─── */
function zonaCafe(ctx, t, cosas) {
  // Barra bajo el ventanal con cafetera, molino y tazas
  cosas.push({ z: 0.6 + 0.5, f: () => {
    caja(ctx, 0.35, 0.15, 3.5, 0.75, 12, MADERA_CLARA);
    caja(ctx, 0.6, 0.25, 0.55, 0.45, 8, { arriba: "#1f2937", izq: "#374151", der: "#111827" }, 12);
    const vapor = iso(0.88, 0.48, 21);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.fillStyle = `rgba(229,231,235,${(0.5 * (1 - k)).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(vapor.x + Math.sin(k * 6 + i) * 1.4, vapor.y - 2 - k * 8, 0.7 + k, 0, Math.PI * 2); ctx.fill();
    }
    caja(ctx, 1.5, 0.3, 0.3, 0.3, 5, { arriba: "#78350f", izq: "#92400e", der: "#7c2d12" }, 12);
    for (let i = 0; i < 4; i++) { const c = iso(2.2 + i * 0.35, 0.5, 12); px(ctx, c.x - 0.9, c.y - 2.2, 1.8, 2.2, i % 2 ? "#fef3c7" : "#f8fafc"); }
    // Pizarra del café
    enParedDer(ctx, 3.2, 12 + 8.5, () => { ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, 7, 5); ctx.fillStyle = "#fde68a"; ctx.font = "700 1.6px Inter, sans-serif"; ctx.fillText("CAFÉ", 1.4, 2.4); ctx.fillStyle = "#e5e7eb"; ctx.fillText("de Macanal", 0.6, 4.2); });
  } });
  // Mesa redonda alta con banquitos
  cosas.push({ z: 2.0 + 2.4, f: () => {
    const c = iso(2.0, 2.4, 0);
    ctx.fillStyle = "#3a2614"; ctx.fillRect(c.x - 0.4, c.y - 11, 0.8, 11);
    ctx.fillStyle = "#c08a52"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 11, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#87592f"; ctx.lineWidth = 0.4; ctx.stroke();
    const taza = iso(1.8, 2.3, 11); px(ctx, taza.x - 0.9, taza.y - 2.4, 1.8, 2.2, "#f8fafc");
  } });
  [[1.2, 2.35], [2.8, 2.35], [2.0, 3.15]].forEach(([x, y]) => cosas.push({ z: x + y - 0.4, f: () => {
    const c = iso(x, y, 0);
    ctx.fillStyle = "#3a2614"; ctx.fillRect(c.x - 0.3, c.y - 6, 0.6, 6);
    ctx.fillStyle = "#166534"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 6, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  } }));
}

/* ─── Jardín zen ─── */
function jardinZen(ctx, t, cosas) {
  // Arena rastrillada: líneas paralelas y círculos alrededor de las piedras
  cosas.push({ z: -1, f: () => {
    ctx.save();
    const borde = [iso(ZEN_X, 0), iso(COLS, 0), iso(COLS, FILAS), iso(ZEN_X, FILAS)];
    ctx.beginPath(); borde.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
    ctx.fillStyle = "#ece3cb"; ctx.fill();
    ctx.strokeStyle = "rgba(160,140,100,0.55)"; ctx.lineWidth = 0.35;
    for (let k = 0.25; k < COLS - ZEN_X; k += 0.28) {
      const a = iso(ZEN_X + k, 0), b = iso(ZEN_X + k, FILAS);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
    // Borde de madera
    caja(ctx, ZEN_X - 0.12, 0, 0.12, FILAS, 2, MADERA);
    // Ondas alrededor de las piedras
    [[11.0, 4.0], [11.3, 7.6]].forEach(([x, y]) => {
      const c = iso(x, y);
      ctx.strokeStyle = "rgba(150,130,90,0.6)"; ctx.lineWidth = 0.4;
      for (let r = 4; r <= 10; r += 2.2) { ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    });
  } });
  // Piedras
  [[11.0, 4.0, 5], [11.3, 7.6, 3.8], [10.6, 7.9, 2.4]].forEach(([x, y, r]) => cosas.push({ z: x + y, f: () => {
    const c = iso(x, y);
    ctx.fillStyle = "#6b7280"; ctx.beginPath(); ctx.ellipse(c.x, c.y - r * 0.5, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(c.x - r * 0.3, c.y - r * 0.8, r * 0.45, r * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4d7c0f"; ctx.beginPath(); ctx.ellipse(c.x + r * 0.2, c.y - r * 0.1, r * 0.5, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  } }));
  // Bonsái
  cosas.push({ z: 11.0 + 1.6, f: () => {
    caja(ctx, 10.75, 1.35, 0.55, 0.5, 2.5, { arriba: "#3f2a1a", izq: "#334155", der: "#1e293b" });
    const p = iso(11.0, 1.6, 2.5);
    ctx.strokeStyle = "#5b3a1e"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - 3, p.y - 4, p.x + 1, p.y - 8); ctx.stroke();
    [[-3, -8, 4], [2, -9.5, 3.4], [-0.5, -11.5, 3]].forEach(([dx, dy, r], i) => {
      ctx.fillStyle = i % 2 ? "#15803d" : "#16a34a";
      ctx.beginPath(); ctx.ellipse(p.x + dx + Math.sin(t + i) * 0.2, p.y + dy, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    });
  } });
  // Fuente de bambú con agua (tsukubai) y ondas
  cosas.push({ z: 11.2 + 5.6, f: () => {
    const c = iso(11.2, 5.6);
    ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 2, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b82b6"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 2.6, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    const k = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - k)).toFixed(2)})`; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 2.6, 3 * k, 1.5 * k, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#a3a33a"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(c.x + 5, c.y - 9); ctx.lineTo(c.x + 5, c.y - 1); ctx.moveTo(c.x + 5, c.y - 8); ctx.lineTo(c.x + 1.5, c.y - 6.5); ctx.stroke();
    ctx.strokeStyle = "rgba(147,197,253,0.8)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(c.x + 1.5, c.y - 6.4); ctx.lineTo(c.x + 1.2, c.y - 3); ctx.stroke();
  } });
  // Bambú
  cosas.push({ z: 11.6 + 9.4, f: () => {
    for (let i = 0; i < 5; i++) {
      const c = iso(11.3 + (i % 3) * 0.25, 9.2 + (i % 2) * 0.3);
      const al = 26 + i * 3, sway = Math.sin(t * 1.1 + i) * 1.2;
      ctx.strokeStyle = i % 2 ? "#65a30d" : "#4d7c0f"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo(c.x, c.y - al / 2, c.x + sway, c.y - al); ctx.stroke();
      ctx.fillStyle = "#3f6212";
      for (let k = 0.45; k < 1; k += 0.18) { ctx.beginPath(); ctx.ellipse(c.x + sway * k + 2, c.y - al * k, 2.4, 0.6, -0.4, 0, Math.PI * 2); ctx.fill(); }
    }
  } });
  // Linterna de piedra
  cosas.push({ z: 10.6 + 2.8, f: () => {
    const c = iso(10.6, 2.8);
    ctx.fillStyle = "#78716c"; ctx.fillRect(c.x - 0.8, c.y - 6, 1.6, 6);
    ctx.fillStyle = "#a8a29e"; ctx.fillRect(c.x - 2, c.y - 9, 4, 3);
    ctx.fillStyle = `rgba(253,224,71,${(0.55 + 0.2 * Math.sin(t * 3)).toFixed(2)})`; ctx.fillRect(c.x - 0.9, c.y - 8.4, 1.8, 1.8);
    ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.moveTo(c.x - 3, c.y - 9); ctx.lineTo(c.x + 3, c.y - 9); ctx.lineTo(c.x, c.y - 11.5); ctx.closePath(); ctx.fill();
  } });
}

/* ─── Mariposas que vuelan por la oficina (la 88 es nuestra insignia) ─── */
function mariposas(ctx, t) {
  [[0, "#f5f5f0", "#c81e1e"], [2.1, "#38bdf8", "#0f172a"], [4.2, "#facc15", "#78350f"]].forEach(([f, ala, borde], i) => {
    const gx = 5 + Math.sin(t * 0.23 + f) * 4.2, gy = 4.5 + Math.cos(t * 0.31 + f * 1.3) * 3.6;
    const z = 26 + Math.sin(t * 0.9 + f) * 6;
    const c = iso(gx, gy, z);
    const aleteo = Math.abs(Math.sin(t * 14 + i * 2));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = ala; ctx.strokeStyle = borde; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.ellipse(-1.2 * aleteo, 0, 1.4 * aleteo + 0.2, 1, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1.2 * aleteo, 0, 1.4 * aleteo + 0.2, 1, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.fillRect(-0.2, -0.9, 0.4, 1.8);
    ctx.restore();
  });
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
 * estados: { [id]: { trabajando, enReunion: 0–1, enCafe: 0–1 } }
 * opciones: reunionPendiente (resalta tu silla), looks (avatares), kpis (tablero)
 */
export function dibujarOficina(ctx, t, estados = {}, { reunionPendiente = false, looks = {}, kpis = {} } = {}) {
  ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  ctx.imageSmoothingEnabled = true;
  dibujarHabitacion(ctx, t, { ...kpis, enReunion: reunionPendiente });

  const cosas = [];
  zonaCafe(ctx, t, cosas);
  jardinZen(ctx, t, cosas);

  // Plantas por toda la oficina
  cosas.push({ z: 4.4 + 0.5, f: () => monstera(ctx, 4.2, 0.3, t) });
  cosas.push({ z: 9.5 + 0.5, f: () => monstera(ctx, 9.3, 0.3, t) });
  cosas.push({ z: 0.3 + 4.2, f: () => planta(ctx, 0.2, 4.0, t, true) });
  cosas.push({ z: 0.2 + 9.6, f: () => cactus(ctx, 0.15, 9.4, t, 13, "#f472b6") });
  cosas.push({ z: 4.5 + 9.6, f: () => cactus(ctx, 4.4, 9.45, t, 10, "#facc15") });
  cosas.push({ z: 9.6 + 9.6, f: () => cactus(ctx, 9.45, 9.4, t, 14, "#fb923c") });
  cosas.push({ z: 7.0 + 9.6, f: () => suculenta(ctx, 6.9, 9.45) });
  cosas.push({ z: 9.6 + 3.2, f: () => planta(ctx, 9.5, 3.0, t) });
  cosas.push({ z: 9.6 + 5.8, f: () => suculenta(ctx, 9.5, 5.6) });
  cosas.push({ z: 4.5 + 4.8, f: () => cactus(ctx, 4.45, 4.75, t, 9, "#f472b6") });

  // Sala de reuniones
  AGENTES.forEach((a) => cosas.push({ z: a.asiento.x + a.asiento.y - 0.3, f: () => sillaReunion(ctx, a.asiento.x, a.asiento.y) }));
  cosas.push({ z: SILLA_OSCAR.x + SILLA_OSCAR.y - 0.3, f: () => {
    sillaReunion(ctx, SILLA_OSCAR.x, SILLA_OSCAR.y, reunionPendiente ? "#a3e635" : "#334155");
    if (reunionPendiente) {
      const p = iso(SILLA_OSCAR.x, SILLA_OSCAR.y, 14 + Math.sin(t * 4) * 2);
      px(ctx, p.x - 1, p.y - 6, 2.4, 5, "#facc15"); px(ctx, p.x - 1, p.y + 0.6, 2.4, 2.2, "#facc15");
    }
  } });
  cosas.push({ z: MESA.x + MESA.w / 2 + MESA.y + MESA.d / 2, f: () => {
    caja(ctx, MESA.x, MESA.y, MESA.w, MESA.d, 2, MESA_C, 9);
    caja(ctx, MESA.x + MESA.w / 2 - 0.15, MESA.y + MESA.d / 2 - 0.15, 0.3, 0.3, 9, { arriba: "#78716c", izq: "#57534e", der: "#44403c" });
    const pa = iso(MESA.x + 0.6, MESA.y + 0.6, 11); px(ctx, pa.x - 3, pa.y - 1, 6, 2.4, "#fff");
    const pb = iso(MESA.x + 1.8, MESA.y + 1.3, 11); px(ctx, pb.x - 4, pb.y - 1, 8, 2.4, "#cbd5e1"); px(ctx, pb.x - 4, pb.y - 5, 8, 4, "#334155");
    if (reunionPendiente) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); px(ctx, pb.x - 3, pb.y - 4, 6, 2, "#a3e635"); ctx.globalAlpha = 1; }
    // Centro de mesa: suculenta
    const cm = iso(MESA.x + MESA.w / 2, MESA.y + MESA.d / 2, 11);
    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.ellipse(cm.x, cm.y - 1, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
  } });

  // Escritorios y agentes
  AGENTES.forEach((a, i) => {
    const st = estados[a.id] || {};
    const e = a.escritorio;
    const fuera = (st.enReunion || 0) > 0 || (st.enCafe || 0) > 0;
    cosas.push({ z: e.x + 0.8 + e.y + 0.42, f: () => escritorio(ctx, e, (looks[a.id]?.camisa || a.look.camisa), t, st.trabajando && !fuera) });
    cosas.push({ z: a.silla.x + a.silla.y - 0.35, f: () => caja(ctx, a.silla.x - 0.25, a.silla.y - 0.3, 0.5, 0.5, 6, { arriba: "#1f2937", izq: "#111827", der: "#030712" }) });
    const u = ubicacion(a, st.enReunion || 0, st.enCafe || 0);
    const modo = u.quieto ? "reunion" : u.modo;
    cosas.push({ z: u.pos.x + u.pos.y, f: () => personaje(ctx, a, u.pos, t, { modo, trabajando: st.trabajando && !fuera, mirando: u.mirando, fase: i * 1.7, look: looks[a.id] }) });
  });

  cosas.sort((a, b) => a.z - b.z).forEach((c) => c.f());
  mariposas(ctx, t);
}

/** Posición en el lienzo (para las etiquetas HTML) de un agente en su estado actual. */
export function posicionAgente(a, enReunion = 0, enCafe = 0) {
  const u = ubicacion(a, enReunion, enCafe);
  const p = iso(u.pos.x, u.pos.y, 0);
  return { x: p.x, y: p.y - (u.modo === "camina" && !u.quieto ? 18 : 22) };
}

export const POS_SILLA_OSCAR = () => iso(SILLA_OSCAR.x, SILLA_OSCAR.y, 22);
