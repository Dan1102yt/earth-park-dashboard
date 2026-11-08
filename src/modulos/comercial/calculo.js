// Cálculos de una cotización. Funciones puras (sin React ni Supabase) para poder probarlas.

export const UNIDADES = {
  persona: "por persona",
  persona_noche: "por persona, por noche",
  persona_dia: "por persona, por día",
  grupo_dia: "por grupo, por día",
};

export const ESTADOS = {
  borrador: { nombre: "Borrador", color: "#9ca3af" },
  aprobada: { nombre: "Aprobada", color: "#a3e635" },
  enviada: { nombre: "Enviada", color: "#38bdf8" },
  reservada: { nombre: "Reservada", color: "#34d399" },
  descartada: { nombre: "Descartada", color: "#f87171" },
};

export const CODIGO_GUIA = "GUI";

const n = (v) => Math.max(0, Math.round(Number(v) || 0));

export const pesos = (v) => "$" + Math.round(Number(v) || 0).toLocaleString("es-CO").replace(/,/g, ".");

export const plural = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`;

/** Personas que pagan: adultos + niños de 5 años o más. Los menores de 5 no pagan. */
export const personasQuePagan = ({ adultos, ninos5 }) => n(adultos) + n(ninos5);

export function quienesVienen({ adultos, ninos5, menores5 }) {
  return [
    n(adultos) ? plural(n(adultos), "adulto", "adultos") : "",
    n(ninos5) ? plural(n(ninos5), "niño de 5+ años", "niños de 5+ años") : "",
    n(menores5) ? plural(n(menores5), "menor de 5 (no paga)", "menores de 5 (no pagan)") : "",
  ].filter(Boolean).join(" · ");
}

/** Arma los ítems de una cotización a partir del itinerario del plan y el catálogo (copia precio y costo). */
export function itemsDesdePlan(plan, catalogo) {
  const porCodigo = Object.fromEntries((catalogo || []).map((c) => [c.codigo, c]));
  const items = [];
  (plan?.itinerario || []).forEach((codigos, i) => {
    for (const codigo of codigos) {
      const c = porCodigo[codigo];
      if (c && codigo !== CODIGO_GUIA) items.push(itemDeCatalogo(c, i + 1));
    }
  });
  return items;
}

export const itemDeCatalogo = (c, dia) => ({
  dia, codigo: c.codigo, actividad: c.actividad, unidad: c.unidad, precio: n(c.precio), costo: c.costo == null ? null : n(c.costo),
});

/** Valor de una línea según su unidad. */
export const valorLinea = (item, pagan) => (item.unidad === "grupo_dia" ? n(item.precio) : n(item.precio) * pagan);

/**
 * Totales de la cotización.
 * - Las actividades "por persona, por día" (asistencia al viajero) se juntan en una sola línea.
 * - El descuento se aplica a las actividades; el guía es un valor aparte y opcional.
 */
export function calcularCotizacion({ items = [], adultos = 0, ninos5 = 0, menores5 = 0, descuento = 0, incluirGuia = true, diasGuia = 1, guia = null }) {
  const pagan = personasQuePagan({ adultos, ninos5 });
  const dias = Math.max(1, ...items.map((i) => i.dia || 1));

  const porDia = Array.from({ length: dias }, (_, k) => ({ dia: k + 1, lineas: [] }));
  const agrupadas = {};
  let subtotal = 0;
  let costo = 0;
  let faltanCostos = false;

  for (const it of items) {
    const valor = valorLinea(it, pagan);
    subtotal += valor;
    if (it.costo == null) faltanCostos = true;
    else costo += it.unidad === "grupo_dia" ? n(it.costo) : n(it.costo) * pagan;

    if (it.unidad === "persona_dia") {
      const g = (agrupadas[it.codigo] ||= { codigo: it.codigo, actividad: it.actividad, dias: 0, precioDia: n(it.precio), total: 0 });
      g.dias += 1;
      g.total += valor;
    } else {
      porDia[(it.dia || 1) - 1].lineas.push({ ...it, personas: it.unidad === "grupo_dia" ? 1 : pagan, total: valor });
    }
  }

  const extras = Object.values(agrupadas).map((g) => ({
    codigo: g.codigo,
    actividad: `${g.actividad} (${plural(g.dias, "día", "días")})`,
    personas: pagan,
    precio: g.precioDia * g.dias,
    total: g.total,
  }));

  const pct = Math.min(1, Math.max(0, Number(descuento) || 0));
  const descuentoValor = Math.round(subtotal * pct);
  const actividades = subtotal - descuentoValor;

  const diasG = n(diasGuia);
  const guiaValor = incluirGuia && guia ? n(guia.precio) * diasG : 0;
  const guiaCosto = incluirGuia && guia ? n(guia.costo ?? guia.precio) * diasG : 0;
  const total = actividades + guiaValor;
  const costoTotal = costo + guiaCosto;
  const div = (v) => (pagan ? Math.round(v / pagan) : 0);

  return {
    pagan,
    dias,
    porDia,
    extras,
    subtotal,
    descuento: pct,
    descuentoValor,
    guia: guiaValor,
    diasGuia: diasG,
    guiaPorDia: guia ? n(guia.precio) : 0,
    total,
    porPersona: div(total),
    anticipo: Math.round(total / 2),
    totalSinGuia: actividades,
    porPersonaSinGuia: div(actividades),
    costo: costoTotal,
    margen: total - costoTotal,
    margenPct: total ? (total - costoTotal) / total : 0,
    faltanCostos,
  };
}

// ── Fechas ──
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fechaDe = (iso, mas = 0) => {
  const [a, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + mas));
};

/** "Día 1 · Viernes 15 de enero" (o "Día 1" si no hay fecha). */
export function tituloDia(llegada, i) {
  if (!llegada) return `Día ${i + 1}`;
  const f = fechaDe(llegada, i);
  const dia = DIAS[f.getUTCDay()];
  return `Día ${i + 1} · ${dia[0].toUpperCase()}${dia.slice(1)} ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
}

/** "15 de enero" · "15 y 16 de enero" · "15, 16 y 17 de enero" · "31 de enero y 1 de febrero" */
export function fechasTexto(llegada, dias) {
  if (!llegada) return "Por definir";
  const fs = Array.from({ length: Math.max(1, dias) }, (_, k) => fechaDe(llegada, k));
  const mismoMes = fs.every((f) => f.getUTCMonth() === fs[0].getUTCMonth());
  const unir = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
  if (mismoMes) return `${unir(fs.map((f) => String(f.getUTCDate())))} de ${MESES[fs[0].getUTCMonth()]}`;
  return unir(fs.map((f) => `${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`));
}

export function duracionTexto(plan) {
  if (!plan) return "";
  const d = plural(plan.dias || 1, "día", "días");
  return plan.noches ? `${d} · ${plural(plan.noches, "noche", "noches")}` : d;
}

/** Texto del saludo con el nombre del cliente. */
export const saludo = (plantilla, cliente) => String(plantilla || "").replace(/\{cliente\}/g, cliente?.trim() || "familia");
