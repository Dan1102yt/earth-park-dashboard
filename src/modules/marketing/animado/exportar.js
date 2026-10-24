// Exporta la animación a MP4 (H.264 + audio AAC) directamente en el navegador, fotograma a fotograma.
// Usa WebCodecs (Chrome, Edge, Safari 16.4+). Si no hay WebCodecs, graba en tiempo real con MediaRecorder.
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { ANCHO, ALTO, FPS, dibujarFrame, cargarRecursos } from "./motor";
import { contextoAudio } from "./voz";

const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42003e", "avc1.42001f"];

async function videoSoportado() {
  if (typeof VideoEncoder === "undefined") return null;
  for (const codec of CODECS) {
    const cfg = { codec, width: ANCHO, height: ALTO, bitrate: 8_000_000, framerate: FPS };
    try {
      if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg;
    } catch { /* siguiente */ }
  }
  return null;
}

// AAC es lo ideal para Instagram/TikTok. Si el navegador no tiene codificador AAC, se usa Opus.
async function audioSoportado(pista) {
  if (!pista || typeof AudioEncoder === "undefined") return null;
  for (const [codec, muxCodec] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
    const cfg = { codec, sampleRate: pista.sampleRate, numberOfChannels: pista.numberOfChannels, bitrate: 160_000 };
    try {
      if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { ...cfg, muxCodec };
    } catch { /* siguiente */ }
  }
  return null;
}

/**
 * pista: AudioBuffer con la narración (opcional).
 * Devuelve { blob, extension, conAudio }.
 */
export async function exportarVideo(guion, pista = null, onProgreso = () => {}, opciones = {}) {
  // opciones.dibujar(ctx, guion, t): dibuja un fotograma (por defecto el motor ilustrado)
  // opciones.preparar(t): async, se llama antes de cada fotograma (ej. posicionar los clips de video)
  const dibujar = opciones.dibujar || dibujarFrame;
  const preparar = opciones.preparar || null;
  await cargarRecursos();
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");

  const vcfg = await videoSoportado();
  const acfg = await audioSoportado(pista);
  // Si hay narración pero el navegador no puede codificar AAC, mejor grabar en vivo (con audio)
  if (vcfg && (!pista || acfg)) return exportarMp4(guion, canvas, ctx, vcfg, pista, acfg, onProgreso, dibujar, preparar);
  return grabarEnVivo(guion, canvas, ctx, pista, onProgreso, dibujar);
}

async function codificarAudio(muxer, pista, cfg) {
  let error = null;
  const enc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { error = e; } });
  const { muxCodec, ...config } = cfg;
  enc.configure(config);
  const canales = pista.numberOfChannels, total = pista.length, bloque = 4096;
  const datos = Array.from({ length: canales }, (_, c) => pista.getChannelData(c));
  for (let i = 0; i < total; i += bloque) {
    const n = Math.min(bloque, total - i);
    const plano = new Float32Array(n * canales);
    for (let c = 0; c < canales; c++) plano.set(datos[c].subarray(i, i + n), c * n);
    const ad = new AudioData({
      format: "f32-planar", sampleRate: pista.sampleRate, numberOfFrames: n, numberOfChannels: canales,
      timestamp: Math.round((i / pista.sampleRate) * 1e6), data: plano,
    });
    enc.encode(ad);
    ad.close();
    if (error) throw error;
  }
  await enc.flush();
  if (error) throw error;
}

async function exportarMp4(guion, canvas, ctx, vcfg, pista, acfg, onProgreso, dibujar, preparar) {
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: ANCHO, height: ALTO, frameRate: FPS },
    ...(acfg ? { audio: { codec: acfg.muxCodec, sampleRate: acfg.sampleRate, numberOfChannels: acfg.numberOfChannels } } : {}),
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  if (acfg) await codificarAudio(muxer, pista, acfg);

  let error = null;
  const encoder = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { error = e; } });
  encoder.configure(vcfg);
  const totalFrames = Math.ceil(guion.total * FPS);
  for (let i = 0; i < totalFrames; i++) {
    if (error) throw error;
    if (preparar) await preparar(i / FPS);
    dibujar(ctx, guion, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    if (i % 10 === 0) { onProgreso(i / totalFrames); await new Promise((r) => setTimeout(r, 0)); }
  }
  await encoder.flush();
  if (error) throw error;
  muxer.finalize();
  onProgreso(1);
  return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), extension: "mp4", conAudio: !!acfg, audioCodec: acfg?.muxCodec || null };
}

// Respaldo: graba en tiempo real (tarda lo que dura el video).
async function grabarEnVivo(guion, canvas, ctx, pista, onProgreso, dibujar) {
  if (typeof MediaRecorder === "undefined") throw new Error("Este navegador no puede exportar video. Prueba con Chrome.");
  const tipos = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  const mimeType = tipos.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const stream = canvas.captureStream(FPS);
  let fuente = null;
  if (pista) {
    const ac = contextoAudio();
    await ac.resume();
    const destino = ac.createMediaStreamDestination();
    fuente = ac.createBufferSource();
    fuente.buffer = pista;
    fuente.connect(destino);
    destino.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  }
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10_000_000 });
  const partes = [];
  rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
  const fin = new Promise((r) => { rec.onstop = r; });
  rec.start(250);
  fuente?.start();
  const t0 = performance.now();
  await new Promise((resolve) => {
    const paso = () => {
      const t = (performance.now() - t0) / 1000;
      dibujar(ctx, guion, Math.min(t, guion.total));
      onProgreso(Math.min(1, t / guion.total));
      if (t < guion.total) requestAnimationFrame(paso); else resolve();
    };
    paso();
  });
  rec.stop();
  await fin;
  const tipo = rec.mimeType || mimeType || "video/webm";
  return { blob: new Blob(partes, { type: tipo }), extension: tipo.includes("mp4") ? "mp4" : "webm", conAudio: !!pista };
}
