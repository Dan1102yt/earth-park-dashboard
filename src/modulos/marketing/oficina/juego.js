// La Oficina como videojuego: nivel y XP del equipo, monedas, racha, ruta de la semana, misión del día
// y recompensas que decoran la oficina. Todo sale del plan de contenido real (tabla contenido_plan):
// no hay puntos "inventados" ni que se puedan editar a mano.
import { lunesDe } from "./usePlan";

/* ─── Reglas (cámbialas aquí) ─── */
export const XP = { aprobada: 5, producida: 15, publicada: 30, semanaCompleta: 50 };
export const MONEDAS = { publicada: 10, semanaCompleta: 40 };
export const XP_AGENTE = 20; // por cada pieza en la que trabajó

export const RECOMPENSAS = [
  { id: "orquidea", nombre: "Orquídea", emoji: "🌸", costo: 50, nivel: 1 },
  { id: "koi", nombre: "Estanque koi", emoji: "🐟", costo: 150, nivel: 2 },
  { id: "totem", nombre: "Tótem mariposa 88", emoji: "🦋", costo: 250, nivel: 4 },
  { id: "guacamaya", nombre: "Guacamaya", emoji: "🦜", costo: 400, nivel: 6 },
];

const APROBADAS = ["aprobada", "en_produccion", "lista", "programada", "publicada"];
const PRODUCIDAS = ["lista", "programada", "publicada"];

/** Nivel según XP: subir del nivel n al n+1 cuesta paso·n (150, 300, 450…). */
export function nivelDe(xp, paso = 150) {
  let nivel = 1, base = 0;
  while (xp >= base + paso * nivel) { base += paso * nivel; nivel += 1; }
  const siguiente = paso * nivel;
  return { nivel, xpNivel: xp - base, xpSiguiente: siguiente, progreso: (xp - base) / siguiente };
}

/** Fecha (YYYY-MM-DD) en hora de Colombia. */
export function diaColombia(fecha) {
  return new Date(fecha).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

const sumarDias = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
};

/** Semanas (lunes) con plan, y si se completó: todo lo que no se descartó quedó publicado. */
function semanas(filas) {
  const por = {};
  filas.forEach((f) => {
    if (f.estado === "descartada" || f.estado === "propuesta" || !f.semana) return;
    (por[f.semana] ||= []).push(f);
  });
  return Object.entries(por).map(([semana, fs]) => ({
    semana, total: fs.length, publicadas: fs.filter((f) => f.estado === "publicada").length,
    completa: fs.length > 0 && fs.every((f) => f.estado === "publicada"),
  })).sort((a, b) => a.semana.localeCompare(b.semana));
}

/** Semanas seguidas cumpliendo el plan (la semana en curso suma si ya está completa, pero no rompe la racha). */
export function racha(filas, hoy = new Date()) {
  const actual = lunesDe(hoy);
  const ss = semanas(filas).filter((s) => s.semana <= actual);
  const porSemana = Object.fromEntries(ss.map((s) => [s.semana, s]));
  let n = 0;
  let lunes = porSemana[actual]?.completa ? actual : sumarDias(actual, -7);
  while (porSemana[lunes]?.completa) { n += 1; lunes = sumarDias(lunes, -7); }
  return n;
}

/**
 * Todo el estado del juego a partir de las filas del plan.
 * compradas: ids de recompensas ya compradas.
 */
export function calcularJuego(filas, { compradas = [], hoy = new Date() } = {}) {
  const vivas = filas.filter((f) => f.estado !== "descartada");
  const cuenta = (estados, tipo) => vivas.filter((f) => estados.includes(f.estado) && (!tipo || f.tipo === tipo)).length;
  const aprobadas = cuenta(APROBADAS), producidas = cuenta(PRODUCIDAS), publicadas = cuenta(["publicada"]);
  const ss = semanas(filas);
  const completas = ss.filter((s) => s.completa).length;

  const xp = aprobadas * XP.aprobada + producidas * XP.producida + publicadas * XP.publicada + completas * XP.semanaCompleta;
  const ganadas = publicadas * MONEDAS.publicada + completas * MONEDAS.semanaCompleta;
  const gastadas = RECOMPENSAS.filter((r) => compradas.includes(r.id)).reduce((s, r) => s + r.costo, 0);

  // Semana en curso
  const lunes = lunesDe(hoy);
  const estaSemana = vivas.filter((f) => f.semana === lunes && f.estado !== "propuesta");
  const pubSemana = estaSemana.filter((f) => f.estado === "publicada").length;

  // Cada agente sube de nivel con las piezas en las que trabajó
  const xpAgentes = {
    investigador: ss.length * XP_AGENTE,
    estratega: aprobadas * XP_AGENTE,
    guionista: producidas * XP_AGENTE,
    disenador: cuenta(PRODUCIDAS, "carrusel") * XP_AGENTE,
    editor: cuenta(PRODUCIDAS, "reel") * XP_AGENTE,
    community: publicadas * XP_AGENTE,
  };
  const agentes = Object.fromEntries(Object.entries(xpAgentes).map(([id, x]) => [id, nivelDe(x, 60)]));

  return {
    xp, ...nivelDe(xp),
    monedas: Math.max(0, ganadas - gastadas),
    racha: racha(filas, hoy),
    semana: { total: estaSemana.length, publicadas: pubSemana, porcentaje: estaSemana.length ? Math.round((pubSemana / estaSemana.length) * 100) : 0 },
    agentes,
    ruta: rutaSemana(estaSemana, hoy),
  };
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TIPO = { reel: "Reel", carrusel: "Carrusel", historia: "Historia" };

/** Los 7 días de la semana con lo que toca publicar cada uno. */
export function rutaSemana(filas, hoy = new Date()) {
  const lunes = lunesDe(hoy);
  const hoyYmd = diaColombia(hoy);
  return DIAS.map((dia, i) => {
    const fecha = sumarDias(lunes, i);
    const piezas = filas.filter((f) => f.fecha_publicacion && diaColombia(f.fecha_publicacion) === fecha);
    let estado;
    if (!piezas.length) estado = "libre";
    else if (piezas.every((f) => f.estado === "publicada")) estado = "hecho";
    else if (fecha === hoyYmd) estado = "hoy";
    else if (fecha < hoyYmd) estado = "atrasado";
    else estado = "pendiente";
    const tipos = [...new Set(piezas.map((f) => TIPO[f.tipo] || "Pieza"))];
    return {
      dia, fecha, estado, esHoy: fecha === hoyYmd, piezas,
      etiqueta: !piezas.length ? "Libre" : piezas.length > 1 ? `${piezas.length} piezas` : tipos[0],
    };
  });
}

/**
 * La misión más importante de hoy (una sola, para que sea claro qué hacer).
 * → { tipo, texto, detalle, xp, fila? }
 */
export function misionDeHoy(filas, { hoy = new Date(), hayPlanProxima = true, estratega = "Sofía", lu = "Lu" } = {}) {
  const vivas = filas.filter((f) => f.estado !== "descartada");
  const propuestas = vivas.filter((f) => f.estado === "propuesta");
  if (propuestas.length) {
    return { tipo: "reunion", texto: `Aprueba ${propuestas.length === 1 ? "la propuesta" : `las ${propuestas.length} propuestas`} del plan`, detalle: "Te esperan en la sala de reuniones", xp: propuestas.length * XP.aprobada };
  }
  const porFecha = (a, b) => String(a.fecha_publicacion || "9").localeCompare(String(b.fecha_publicacion || "9"));
  const lista = vivas.filter((f) => f.estado === "lista").sort(porFecha)[0];
  if (lista) return { tipo: "programar", texto: `Programa "${lista.tema}"`, detalle: `Ya está producida: ponle fecha y ${lu} la publica`, xp: XP.publicada, fila: lista };
  const producir = vivas.filter((f) => ["aprobada", "en_produccion"].includes(f.estado)).sort(porFecha)[0];
  if (producir) {
    const tarde = producir.fecha_publicacion && new Date(producir.fecha_publicacion) < hoy;
    return { tipo: "producir", texto: `Produce "${producir.tema}"`, detalle: tarde ? "Va atrasada: su fecha ya pasó" : `${producir.tipo === "reel" ? "Video" : "Carrusel"} del plan`, xp: XP.producida, fila: producir };
  }
  if (!hayPlanProxima) return { tipo: "plan", texto: `Pídele el plan de la próxima semana a ${estratega}`, detalle: "Así el equipo no se queda sin trabajo", xp: 0 };
  return { tipo: "listo", texto: "Todo al día", detalle: "El equipo tiene todo bajo control", xp: 0 };
}
