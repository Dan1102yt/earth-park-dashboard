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

  // Cada foto de una escena es un "plano": la escena se reparte en partes iguales entre sus fotos.
  const planos = [];
  for (const e of escenas) {
    const fotos = (e.fotos || []).filter(Boolean);
    const n = Math.max(1, fotos.length);
    for (let j = 0; j < n; j++) {
      planos.push({ escena: e.indice, foto: fotos[j] || null, inicio: e.inicio + (e.duracion * j) / n, duracion: e.duracion / n, variante: (e.indice * 3 + j) % 4, cierre: !!e.cierre });
    }
  }
  return { escenas, planos, total: Math.max(1, t) };
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
