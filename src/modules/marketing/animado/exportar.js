// Exporta la animación a MP4 (H.264) directamente en el navegador, fotograma a fotograma.
// Usa WebCodecs (Chrome, Edge, Safari 16.4+). Si no hay WebCodecs, graba en tiempo real con MediaRecorder.
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { ANCHO, ALTO, FPS, dibujarFrame, cargarFuentes } from "./motor";

const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42003e", "avc1.42001f"];

async function codecSoportado() {
  if (typeof VideoEncoder === "undefined") return null;
  for (const codec of CODECS) {
    const cfg = { codec, width: ANCHO, height: ALTO, bitrate: 8_000_000, framerate: FPS };
    try {
      const { supported } = await VideoEncoder.isConfigSupported(cfg);
      if (supported) return cfg;
    } catch { /* probar el siguiente */ }
  }
  return null;
}

/**
 * Devuelve { blob, extension }.
 * onProgreso(0..1) se llama mientras exporta.
 */
export async function exportarVideo(guion, onProgreso = () => {}) {
  await cargarFuentes();
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");

  const cfg = await codecSoportado();
  if (cfg) return exportarMp4(guion, canvas, ctx, cfg, onProgreso);
  return grabarEnVivo(guion, canvas, ctx, onProgreso);
}

async function exportarMp4(guion, canvas, ctx, cfg, onProgreso) {
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: ANCHO, height: ALTO, frameRate: FPS },
    fastStart: "in-memory",
  });
  let error = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { error = e; },
  });
  encoder.configure(cfg);

  const totalFrames = Math.ceil(guion.total * FPS);
  for (let i = 0; i < totalFrames; i++) {
    if (error) throw error;
    dibujarFrame(ctx, guion, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    // No saturar la cola del codificador (y dejar respirar la interfaz)
    if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    if (i % 10 === 0) { onProgreso(i / totalFrames); await new Promise((r) => setTimeout(r, 0)); }
  }
  await encoder.flush();
  if (error) throw error;
  muxer.finalize();
  onProgreso(1);
  return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), extension: "mp4" };
}

// Respaldo: graba el canvas en tiempo real (tarda lo que dura el video).
async function grabarEnVivo(guion, canvas, ctx, onProgreso) {
  if (typeof MediaRecorder === "undefined") throw new Error("Este navegador no puede exportar video. Prueba con Chrome.");
  const tipos = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const mimeType = tipos.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const stream = canvas.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const partes = [];
  rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
  const fin = new Promise((r) => { rec.onstop = r; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const paso = () => {
      const t = (performance.now() - t0) / 1000;
      dibujarFrame(ctx, guion, Math.min(t, guion.total));
      onProgreso(Math.min(1, t / guion.total));
      if (t < guion.total) requestAnimationFrame(paso);
      else resolve();
    };
    paso();
  });
  rec.stop();
  await fin;
  const tipo = rec.mimeType || mimeType || "video/webm";
  return { blob: new Blob(partes, { type: tipo }), extension: tipo.includes("mp4") ? "mp4" : "webm" };
}
