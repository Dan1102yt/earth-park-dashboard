// Narrador: pide la voz a ElevenLabs (vía el Worker), la decodifica y arma la pista de audio del video.
import { whoosh, impacto, riser, tic, ambiente, sonidoTransicion } from "./sfx";
import { RETRASO_VOZ } from "./motor";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

let ctxAudio = null;
export function contextoAudio() {
  if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
  return ctxAudio;
}

export async function listarVoces() {
  const res = await fetch(`${WORKER_URL}/tts/voices`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Tiempos por carácter → tiempos por palabra
function palabrasDesdeAlineacion(al) {
  if (!al?.characters) return [];
  const out = [];
  let w = "", ini = null, fin = 0;
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (w) out.push({ w, ini, fin });
      w = ""; ini = null;
      return;
    }
    if (ini == null) ini = al.character_start_times_seconds[i];
    w += c;
    fin = al.character_end_times_seconds[i];
  });
  if (w) out.push({ w, ini, fin });
  return out;
}

function base64ABuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Genera la voz de un texto. Devuelve { texto, voiceId, audio (base64), palabras, dur }. */
export async function generarVoz(texto, voiceId, contexto = {}) {
  const res = await fetch(`${WORKER_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: texto, voiceId, previousText: contexto.anterior, nextText: contexto.siguiente }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Error ${res.status}`);
  const palabras = palabrasDesdeAlineacion(data.alineacion);
  const buffer = await decodificar(data.audio);
  return { texto, voiceId, audio: data.audio, palabras, dur: buffer.duration };
}

const decodificados = new Map(); // base64 → AudioBuffer
export async function decodificar(b64) {
  if (!decodificados.has(b64)) {
    decodificados.set(b64, contextoAudio().decodeAudioData(base64ABuffer(b64)));
  }
  return decodificados.get(b64);
}

/**
 * Une las voces de todas las escenas en una sola pista, cada una en el momento en que empieza su escena.
 * Agrega un "whoosh" suave en cada cambio de escena.
 */
export async function construirPista(guion) {
  const sr = 48000;
  const largo = Math.ceil((guion.total + 0.2) * sr);
  const off = new OfflineAudioContext(2, largo, sr);

  for (const e of guion.escenas) {
    if (!e.voz?.audio) continue;
    const buf = await decodificar(e.voz.audio);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start(e.inicio + RETRASO_VOZ);
  }

  // Efectos de sonido: bus propio con compresor para que nunca tapen la voz
  const bus = off.createGain();
  bus.gain.value = 1;
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 4;
  bus.connect(comp).connect(off.destination);

  if (!guion.formato) {
    // Videos animados: whoosh suave en cada cambio de escena (como antes)
    guion.escenas.slice(1).forEach((e) => whoosh(off, bus, e.inicio - 0.25, { dur: 0.5, vol: 0.1 }));
  } else {
    const escenas = guion.escenas;
    // Gancho: golpe grave al arrancar
    if (escenas[0]) impacto(off, bus, 0.05, { vol: 0.35 });
    escenas.forEach((e, i) => {
      if (i > 0) {
        // Antes del cierre: tensión que sube y golpe
        if (e.cta) { riser(off, bus, e.inicio - 1.3, { dur: 1.3 }); impacto(off, bus, e.inicio, { vol: 0.45 }); }
        else sonidoTransicion(off, bus, e.transicion, e.inicio, e.durTrans || 0.4);
      }
      ambiente(off, bus, e.clima, e.inicio, e.duracion);
      // Tic suave en las palabras clave (formato documental, una palabra en pantalla)
      if (guion.formato === "doc" && e.claves?.size && e.voz?.palabras) {
        const limpiar = (w) => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
        e.voz.palabras.forEach((p) => { if (e.claves.has(limpiar(p.w))) tic(off, bus, e.inicio + RETRASO_VOZ + p.ini, 0.04); });
      }
    });
  }

  return off.startRendering();
}
