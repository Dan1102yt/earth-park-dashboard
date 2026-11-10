// Pista de audio del video: la locución de cada escena + la música de fondo (si se cargó),
// que baja sola mientras habla el narrador y se desvanece al final.
import { decodificar, contextoAudio } from "../animado/voz";
import { RETRASO_VOZ } from "./linea";

export async function mezclar(linea, musica = null, volumen = 0.35) {
  const sr = 48000;
  const total = linea.total + 0.3;
  const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);

  const voces = off.createGain();
  voces.gain.value = 1;
  voces.connect(off.destination);
  const tramos = [];
  for (const e of linea.escenas) {
    if (!e.voz?.audio) continue;
    const buf = await decodificar(e.voz.audio);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(voces);
    const ini = e.inicio + RETRASO_VOZ;
    src.start(ini);
    tramos.push([ini, ini + buf.duration]);
  }

  if (musica) {
    const src = off.createBufferSource();
    src.buffer = musica;
    src.loop = musica.duration < total;
    const g = off.createGain();
    const v = Math.max(0, Math.min(1, volumen));
    const bajo = v * 0.35; // mientras habla el narrador
    const p = g.gain;
    p.setValueAtTime(0, 0);
    p.linearRampToValueAtTime(tramos.length && tramos[0][0] < 1.2 ? bajo : v, 1.0);
    for (const [a, b] of tramos) {
      p.setTargetAtTime(bajo, Math.max(0, a - 0.25), 0.12);
      p.setTargetAtTime(v, b + 0.15, 0.25);
    }
    p.setTargetAtTime(0, Math.max(0, linea.total - 1.6), 0.45);
    src.connect(g).connect(off.destination);
    src.start(0);
  }

  return off.startRendering();
}

/** Lee un archivo de música (MP3, M4A, WAV) del equipo. */
export async function leerMusica(archivo) {
  const datos = await archivo.arrayBuffer();
  return contextoAudio().decodeAudioData(datos);
}
