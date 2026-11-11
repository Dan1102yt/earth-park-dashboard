// Línea de tiempo de un video con guion propio. Funciones puras (se prueban en tests/guionPropio.test.js).
//
// Cada escena trae los tiempos del guion (desde / hasta). Si la voz dura más que el espacio de la escena,
// la escena se alarga lo justo para que la locución no se corte; las siguientes se corren.

export const RETRASO_VOZ = 0.25; // la voz entra un poco después del corte
export const COLA_VOZ = 0.45;    // aire después de la última palabra
export const FUNDIDO = 0.45;     // fundido entre tomas

/** "00:06" | "0:06" | "6" | 6 → segundos */
export function aSegundos(v) {
  if (typeof v === "number") return Math.max(0, v);
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const partes = s.split(":").map((x) => Number(x.replace(",", ".")) || 0);
  return Math.max(0, partes.reduce((acc, n) => acc * 60 + n, 0));
}

export const aReloj = (seg) => {
  const s = Math.round(seg);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** La voz vigente de una escena (si el texto o la voz cambiaron, hay que generarla de nuevo). */
export const vozVigente = (escena, voz, vozId) =>
  voz && voz.texto === (escena.locucion || "").trim() && voz.voiceId === vozId ? voz : null;

/**
 * proyecto: { escenas: [{ desde, hasta, locucion, texto, fotos, cierre }] }
 * voces:    [{ dur, palabras, audio } | null] por escena (ya filtradas con vozVigente)
 * → { escenas: [...con inicio, duracion, voz, planos], planos: [...], total }
 */
export function armarLinea(proyecto, voces = []) {
  let t = 0;
  const escenas = (proyecto?.escenas || []).map((e, i) => {
    const desde = aSegundos(e.desde);
    const hasta = Math.max(desde + 1, aSegundos(e.hasta));
    const espacio = hasta - desde;
    const voz = voces[i] || null;
    const duracion = Math.max(espacio, voz?.dur ? voz.dur + RETRASO_VOZ + COLA_VOZ : 0, e.cierre ? 4 : 2);
    const inicio = t;
    t += duracion;
    return { ...e, indice: i, inicio, duracion, voz };
  });

  // Cada foto o video de una escena es un "plano": la escena se reparte en partes iguales entre ellos.
  const planos = [];
  for (const e of escenas) {
    const medios = (e.fotos || []).filter(Boolean).map(normalizarMedio);
    const n = Math.max(1, medios.length);
    for (let j = 0; j < n; j++) {
      const m = medios[j] || null;
      planos.push({
        escena: e.indice, medio: m, foto: m?.tipo === "foto" ? m.ref : null, video: m?.tipo === "video" ? m : null,
        inicio: e.inicio + (e.duracion * j) / n, duracion: e.duracion / n, variante: (e.indice * 3 + j) % 4, cierre: !!e.cierre,
      });
    }
  }
  return { escenas, planos, total: Math.max(1, t) };
}

/** Una escena guarda fotos como texto ("cotizacion/lancha.jpg", "drive:…") y videos como objeto. */
export function normalizarMedio(m) {
  if (typeof m === "string") return { tipo: "foto", ref: m };
  if (m?.tipo === "video") return { tipo: "video", ref: m.ref, inicio: Math.max(0, Number(m.inicio) || 0), dur: Number(m.dur) || 0, nombre: m.nombre || "" };
  return { tipo: "foto", ref: m?.ref || "" };
}

/** Cuánto le toca a cada foto o video de una escena (la escena se reparte en partes iguales). */
export const tiempoPorMedio = (duracionEscena, cantidad) => duracionEscena / Math.max(1, cantidad);

export const VELOCIDAD_MIN = 0.7; // si el clip no alcanza, se pone hasta 30 % más lento y luego se congela

/**
 * Segundo del clip que se ve en el instante t.
 * Se usa el tramo que eligió el usuario: desde `inicio` y durante lo que dure el plano.
 */
export function tiempoEnClip(plano, t) {
  const v = plano.video;
  if (!v) return 0;
  const lt = Math.max(0, t - plano.inicio);
  const dur = v.dur || 0;
  const disponible = Math.max(0.1, dur - v.inicio);
  const vel = Math.min(1, Math.max(VELOCIDAD_MIN, disponible / plano.duracion));
  return Math.min(v.inicio + lt * vel, Math.max(0, dur - 0.05));
}

/** ¿Alcanza el clip para el tiempo que necesita? → { alcanza, falta } */
export function revisarTramo(dur, inicio, necesita) {
  const disponible = Math.max(0, dur - inicio);
  return { alcanza: disponible >= necesita - 0.05, falta: Math.max(0, necesita - disponible) };
}

/** Índice del elemento (escena o plano) que está en pantalla en el segundo t. */
export function indiceEn(lista, t) {
  for (let i = lista.length - 1; i >= 0; i--) if (t >= lista[i].inicio) return i;
  return 0;
}

/** Subtítulos: grupos de hasta `max` palabras con sus tiempos (relativos a la escena). */
export function gruposDePalabras(palabras = [], max = 6) {
  const grupos = [];
  let actual = [];
  for (const p of palabras) {
    actual.push(p);
    const fin = /[.,;:!?…]$/.test(p.w);
    if (actual.length >= max || fin) { grupos.push(actual); actual = []; }
  }
  if (actual.length) grupos.push(actual);
  return grupos.map((g) => ({ texto: g.map((p) => p.w).join(" "), ini: g[0].ini, fin: g[g.length - 1].fin }));
}
