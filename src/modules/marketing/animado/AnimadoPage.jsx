import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Film, Sparkles, Loader2, AlertCircle, Play, Pause, RotateCcw, Download,
  Share2, Copy, Check, History, Trash2, BookOpen, Music,
} from "lucide-react";
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { useAgenteHistorial } from "../agente/useAgenteHistorial";
import { promptGuion } from "./guionPrompt";
import { normalizarGuion, dibujarFrame, cargarFuentes, ANCHO, ALTO, TEMAS } from "./motor";
import { exportarVideo } from "./exportar";
import { GUION_EJEMPLO } from "./ejemplo";

const MODEL = "claude-sonnet-4-5";
const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };

const IDEAS = [
  "Por qué la mariposa 88 es el símbolo de Earth Park",
  "Cómo una tierra dañada por agroquímicos vuelve a la vida",
  "Dos fines de semana: centro comercial vs. embalse",
  "Qué empacar para dormir en el Valle de Tenza",
  "3 errores al planear tu primer viaje a Boyacá",
];

async function pedirGuion(workerUrl, tema, estilo) {
  const res = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SISTEMA_AGENTE,
      messages: [{ role: "user", content: promptGuion(tema, estilo) }],
    }),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}: ${(await res.text()).substring(0, 300)}`);
  const data = await res.json();
  const texto = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const guion = extraerObjetoJSON(texto);
  if (!guion?.escenas?.length) throw new Error("No se pudo interpretar el guion. Intenta de nuevo.");
  return guion;
}

function CopiarBtn({ texto }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-1 rounded-md border border-emerald-700/40">
      {ok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

/* ─── Reproductor ─────────────────────────────────────────── */
function Reproductor({ guion }) {
  const canvasRef = useRef(null);
  const [tiempo, setTiempo] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const estado = useRef({ t: 0, ultimo: null });

  useEffect(() => { estado.current.t = 0; setTiempo(0); setReproduciendo(true); }, [guion]);

  useEffect(() => {
    let id;
    const ctx = canvasRef.current.getContext("2d");
    cargarFuentes();
    const loop = (ahora) => {
      const s = estado.current;
      if (reproduciendo) {
        if (s.ultimo != null) s.t += (ahora - s.ultimo) / 1000;
        if (s.t >= guion.total) s.t = 0; // en bucle, como en Instagram
      }
      s.ultimo = ahora;
      dibujarFrame(ctx, guion, s.t);
      setTiempo(s.t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); estado.current.ultimo = null; };
  }, [guion, reproduciendo]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={ANCHO} height={ALTO}
        className="w-full max-w-[340px] mx-auto block rounded-2xl border border-emerald-900/50 bg-black" />
      <div className="flex items-center gap-2 max-w-[340px] mx-auto">
        <button onClick={() => setReproduciendo((r) => !r)} className="p-2 rounded-lg text-white bg-emerald-700/70">
          {reproduciendo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={() => { estado.current.t = 0; }} className="p-2 rounded-lg text-gray-300 border border-emerald-900/50">
          <RotateCcw className="w-4 h-4" />
        </button>
        <input type="range" min={0} max={guion.total} step={0.05} value={tiempo}
          onChange={(e) => { estado.current.t = +e.target.value; }}
          className="flex-1 accent-emerald-500" />
        <span className="text-[11px] text-gray-400 w-12 text-right">{tiempo.toFixed(1)}s</span>
      </div>
    </div>
  );
}

/* ─── Página ──────────────────────────────────────────────── */
export default function AnimadoPage() {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const [tema, setTema] = useState("");
  const [estilo, setEstilo] = useState("bosque");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [crudo, setCrudo] = useState(null);           // guion tal como lo devolvió el agente (editable)
  const [exportando, setExportando] = useState(null);  // progreso 0..1
  const [video, setVideo] = useState(null);            // { url, blob, extension }
  const { items, guardar, borrar } = useAgenteHistorial();
  const videosHist = items.filter((i) => i.modo === "video");

  const guion = useMemo(() => (crudo ? normalizarGuion({ ...crudo, tema: estilo }) : null), [crudo, estilo]);

  useEffect(() => () => { if (video?.url) URL.revokeObjectURL(video.url); }, [video]);

  const cargarGuion = (g) => {
    setCrudo(g);
    if (TEMAS[g.tema]) setEstilo(g.tema);
    setVideo(null);
    setError(null);
  };

  const generar = async () => {
    if (!workerUrl) { setError("VITE_WORKER_URL no está configurada."); return; }
    setCargando(true); setError(null);
    try {
      const g = await pedirGuion(workerUrl, tema.trim(), estilo);
      cargarGuion(g);
      await guardar("video", tema.trim() || g.titulo, g);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const editarEscena = (i, campo, valor) => setCrudo((g) => ({
    ...g,
    escenas: g.escenas.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)),
  }));
  const editarCta = (campo, valor) => setCrudo((g) => ({ ...g, cta: { ...(g.cta || {}), [campo]: valor } }));

  const exportar = useCallback(async () => {
    if (!guion) return;
    setExportando(0); setError(null);
    try {
      const r = await exportarVideo(guion, setExportando);
      setVideo({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      setError("No se pudo exportar: " + e.message);
    } finally {
      setExportando(null);
    }
  }, [guion]);

  const nombre = `earthpark-${(crudo?.titulo || "reel").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}`;
  const descargar = () => {
    const a = document.createElement("a");
    a.href = video.url;
    a.download = `${nombre}.${video.extension}`;
    a.click();
  };
  const puedeCompartir = typeof navigator !== "undefined" && !!navigator.canShare;
  const compartir = async () => {
    const file = new File([video.blob], `${nombre}.${video.extension}`, { type: video.blob.type });
    try {
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: crudo?.titulo });
      else descargar();
    } catch (e) { if (e.name !== "AbortError") descargar(); }
  };

  const caption = crudo ? `${crudo.caption || ""}\n\n${(crudo.hashtags || []).join(" ")}`.trim() : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Film className="w-6 h-6 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white leading-tight">Videos animados</h1>
          <p className="text-xs text-gray-500">Reels educativos animados a partir de una idea · sin grabar nada · MP4 vertical listo para Instagram y TikTok</p>
        </div>
      </div>

      {/* Entrada */}
      <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
        <label className="text-xs text-gray-400">¿Sobre qué es el video?</label>
        <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2}
          placeholder="Ej: Por qué la mariposa 88 es el símbolo de Earth Park"
          className="w-full rounded-lg bg-black/30 border border-emerald-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600" />
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button key={idea} onClick={() => setTema(idea)}
              className="text-[11px] px-2 py-1 rounded-full text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/30">{idea}</button>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Estilo:</span>
            {Object.entries(TEMAS).map(([id, t]) => (
              <button key={id} onClick={() => setEstilo(id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                style={{ borderColor: estilo === id ? t.acento : "rgba(255,255,255,0.1)", color: estilo === id ? t.acento : "#9ca3af", background: t.fondo }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.acento }} /> {t.nombre}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => cargarGuion(GUION_EJEMPLO)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-emerald-300 border border-emerald-800/60">
              <BookOpen className="w-3.5 h-3.5" /> Ver ejemplo
            </button>
            <button onClick={generar} disabled={cargando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "rgba(77,142,30,0.80)", border: "1px solid rgba(77,142,30,0.40)" }}>
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Escribiendo guion...</> : <><Sparkles className="w-4 h-4" /> Crear video</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {guion && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Vista previa + exportar */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <Reproductor guion={guion} />
            <p className="text-center text-[11px] text-gray-500">{guion.escenas.length} escenas · {guion.total.toFixed(1)} s · 1080×1920</p>
            {exportando != null ? (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(exportando * 100)}%` }} />
                </div>
                <p className="text-center text-xs text-gray-400">Creando el MP4... {Math.round(exportando * 100)}%</p>
              </div>
            ) : video ? (
              <div className="flex gap-2 justify-center flex-wrap">
                {puedeCompartir && (
                  <button onClick={compartir} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400">
                    <Share2 className="w-3.5 h-3.5" /> Guardar / Compartir
                  </button>
                )}
                <button onClick={descargar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700">
                  <Download className="w-3.5 h-3.5" /> Descargar {video.extension.toUpperCase()}
                </button>
                <button onClick={exportar} className="px-3 py-2 rounded-lg text-xs text-gray-300 border border-emerald-900/50">Volver a exportar</button>
              </div>
            ) : (
              <button onClick={exportar} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300">
                <Download className="w-4 h-4" /> Exportar video MP4
              </button>
            )}
          </div>

          {/* Guion editable */}
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Guion · edita los textos y la duración</p>
              <p className="text-[11px] text-gray-500">Pon *asteriscos* alrededor de una palabra para pintarla del color de acento.</p>
              {crudo.escenas.map((e, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] text-emerald-500 font-bold pt-2 w-5">{i + 1}</span>
                  <textarea value={e.texto || ""} rows={2} onChange={(ev) => editarEscena(i, "texto", ev.target.value)}
                    className="flex-1 rounded-lg bg-black/30 border border-emerald-900/50 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600" />
                  <input type="number" min={1.5} max={8} step={0.5} value={e.duracion ?? 3.5}
                    onChange={(ev) => editarEscena(i, "duracion", +ev.target.value)}
                    className="w-16 rounded-lg bg-black/30 border border-emerald-900/50 px-2 py-1.5 text-sm text-white" title="Segundos" />
                </div>
              ))}
              <div className="flex gap-2 items-start pt-2 border-t border-emerald-900/40">
                <span className="text-[10px] text-emerald-500 font-bold pt-2 w-5">CTA</span>
                <input value={crudo.cta?.texto || ""} onChange={(e) => editarCta("texto", e.target.value)} placeholder="Frase final"
                  className="flex-1 rounded-lg bg-black/30 border border-emerald-900/50 px-2 py-1.5 text-sm text-white" />
                <input value={crudo.cta?.palabra || ""} onChange={(e) => editarCta("palabra", e.target.value)} placeholder="PALABRA"
                  className="w-28 rounded-lg bg-black/30 border border-emerald-900/50 px-2 py-1.5 text-sm text-white uppercase" />
              </div>
            </div>

            {caption && (
              <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Caption + hashtags</p>
                  <CopiarBtn texto={caption} />
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-line">{crudo.caption}</p>
                <p className="text-xs text-emerald-300/80">{(crudo.hashtags || []).join(" ")}</p>
                {crudo.musica && <p className="flex items-start gap-1.5 text-xs text-gray-400 pt-1"><Music className="w-3.5 h-3.5 mt-0.5" /> {crudo.musica}</p>}
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              El video sale sin música a propósito: agrégala en Instagram o TikTok con un audio en tendencia, que ayuda al alcance.
            </p>
          </div>
        </div>
      )}

      {videosHist.length > 0 && (
        <section className="space-y-2 pt-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Guiones anteriores</h2>
          </div>
          {videosHist.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm" style={tarjeta}>
              <button onClick={() => { cargarGuion(it.resultado); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex-1 text-left min-w-0">
                <span className="text-gray-200 truncate">{it.resultado?.titulo || it.tema}</span>
                <span className="text-gray-600 text-xs ml-2">{new Date(it.creado_at).toLocaleDateString("es-CO")}</span>
              </button>
              <button onClick={() => borrar(it.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
