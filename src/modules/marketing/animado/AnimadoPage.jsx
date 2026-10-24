import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Film, Sparkles, Loader2, AlertCircle, Play, Pause, RotateCcw, Download,
  Share2, Copy, Check, History, Trash2, BookOpen, Music, Mic, Volume2, VolumeX, RefreshCw, CheckCircle2,
} from "lucide-react";
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { useAgenteHistorial } from "../agente/useAgenteHistorial";
import { promptGuion } from "./guionPrompt";
import { normalizarGuion, dibujarFrame, cargarRecursos, ANCHO, ALTO, TEMAS } from "./motor";
import { exportarVideo } from "./exportar";
import { listarVoces, generarVoz, construirPista, contextoAudio } from "./voz";
import { GUION_EJEMPLO } from "./ejemplo";

const MODEL = "claude-sonnet-4-5";
const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const campo = "block w-full min-w-0 rounded-lg bg-black/30 border border-emerald-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600";

const IDEAS = [
  "Por qué la mariposa 88 es el símbolo de Earth Park",
  "Cómo una tierra dañada por agroquímicos vuelve a la vida",
  "Dos fines de semana: centro comercial vs. embalse",
  "Qué empacar para dormir en el Valle de Tenza",
  "3 errores al planear tu primer viaje a Boyacá",
];

const leer = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

async function pedirGuion(workerUrl, tema, estilo) {
  const res = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000, system: SISTEMA_AGENTE,
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

// Narraciones en orden: una por escena + la del cierre
const narracionesDe = (g) => [
  ...(g?.escenas || []).map((e) => e.narracion || e.texto?.replace(/\*/g, "") || ""),
  ...(g?.cta?.palabra ? [g.cta.narracion || g.cta.texto || ""] : []),
];

function CopiarBtn({ texto }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-1 rounded-md border border-emerald-700/40">
      {ok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

/* ─── Reproductor (video + narración sincronizados) ───────── */
function Reproductor({ guion, pista }) {
  const canvasRef = useRef(null);
  const [tiempo, setTiempo] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [sonido, setSonido] = useState(false);
  const s = useRef({ t: 0, ultimo: null, fuente: null, base: 0 });

  const pararAudio = () => { try { s.current.fuente?.stop(); } catch { /* ya parado */ } s.current.fuente = null; };
  const arrancarAudio = useCallback((desde) => {
    pararAudio();
    if (!pista || !sonido || !reproduciendo) return;
    const ac = contextoAudio();
    ac.resume();
    const f = ac.createBufferSource();
    f.buffer = pista;
    f.connect(ac.destination);
    f.start(0, Math.max(0, desde));
    s.current.fuente = f;
    s.current.base = ac.currentTime - desde;
  }, [pista, sonido, reproduciendo]);

  useEffect(() => { s.current.t = 0; setTiempo(0); }, [guion]);
  useEffect(() => { arrancarAudio(s.current.t); return pararAudio; }, [arrancarAudio]);

  useEffect(() => {
    let id;
    const ctx = canvasRef.current.getContext("2d");
    cargarRecursos();
    const loop = (ahora) => {
      const st = s.current;
      if (reproduciendo) {
        if (st.fuente) st.t = contextoAudio().currentTime - st.base;      // el audio manda el ritmo
        else if (st.ultimo != null) st.t += (ahora - st.ultimo) / 1000;
        if (st.t >= guion.total) { st.t = 0; if (st.fuente) arrancarAudio(0); }
      }
      st.ultimo = ahora;
      dibujarFrame(ctx, guion, st.t);
      setTiempo(st.t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); s.current.ultimo = null; };
  }, [guion, reproduciendo, arrancarAudio]);

  const buscar = (v) => { s.current.t = v; if (s.current.fuente) arrancarAudio(v); };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={ANCHO} height={ALTO}
        className="w-full max-w-[340px] mx-auto block rounded-2xl border border-emerald-900/50 bg-black" />
      <div className="flex items-center gap-2 max-w-[340px] mx-auto">
        <button onClick={() => setReproduciendo((r) => !r)} className="p-2 rounded-lg text-white bg-emerald-700/70">
          {reproduciendo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={() => buscar(0)} className="p-2 rounded-lg text-gray-300 border border-emerald-900/50"><RotateCcw className="w-4 h-4" /></button>
        {pista && (
          <button onClick={() => setSonido((v) => !v)} title={sonido ? "Silenciar" : "Escuchar narración"}
            className={`p-2 rounded-lg border ${sonido ? "text-emerald-300 border-emerald-600" : "text-amber-300 border-amber-500/60 animate-pulse"}`}>
            {sonido ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
        <input type="range" min={0} max={guion.total} step={0.05} value={tiempo}
          onChange={(e) => buscar(+e.target.value)} className="flex-1 accent-emerald-500" />
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
  const [crudo, setCrudo] = useState(null);
  const [filaId, setFilaId] = useState(null);

  // Narrador
  const [conVoz, setConVoz] = useState(leer("ep_con_voz", "1") === "1");
  const [voces, setVoces] = useState([]);
  const [errorVoces, setErrorVoces] = useState(null);
  const [vozId, setVozId] = useState(leer("ep_voz", ""));
  const [audios, setAudios] = useState([]);        // por escena: {texto, voiceId, audio, palabras, dur}
  const [narrando, setNarrando] = useState(null);   // {actual, total}
  const [errorVoz, setErrorVoz] = useState(null);
  const [pista, setPista] = useState(null);

  const [exportando, setExportando] = useState(null);
  const [video, setVideo] = useState(null);
  const { items, guardar, borrar, actualizar } = useAgenteHistorial();
  const videosHist = items.filter((i) => i.modo === "video");

  useEffect(() => { escribir("ep_con_voz", conVoz ? "1" : "0"); }, [conVoz]);
  useEffect(() => { if (vozId) escribir("ep_voz", vozId); }, [vozId]);
  useEffect(() => {
    listarVoces()
      .then(({ voces: vs, porDefecto }) => {
        setVoces(vs);
        setVozId((actual) => (vs.some((v) => v.id === actual) ? actual : porDefecto || vs[0]?.id || ""));
      })
      .catch((e) => setErrorVoces(e.message));
  }, []);

  const narraciones = useMemo(() => narracionesDe(crudo), [crudo]);
  const audioVigente = (i) => {
    const a = audios[i];
    return a && a.texto === narraciones[i] && a.voiceId === vozId ? a : null;
  };
  const vigentes = narraciones.map((_, i) => audioVigente(i));
  const pendientes = narraciones.filter((n, i) => n.trim() && !vigentes[i]).length;

  const guion = useMemo(
    () => (crudo ? normalizarGuion({ ...crudo, tema: estilo }, conVoz ? vigentes : []) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crudo, estilo, conVoz, audios, vozId],
  );

  // Pista de audio completa (se rehace cuando cambian voces o tiempos)
  useEffect(() => {
    let vivo = true;
    if (!guion || !conVoz || !vigentes.some(Boolean)) { setPista(null); return; }
    construirPista(guion).then((p) => vivo && setPista(p)).catch(() => vivo && setPista(null));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guion]);

  useEffect(() => () => { if (video?.url) URL.revokeObjectURL(video.url); }, [video]);
  useEffect(() => { setVideo(null); }, [guion]);

  const narrar = useCallback(async (g, soloIndice = null, id = filaId) => {
    if (!vozId) { setErrorVoz("Elige una voz primero."); return; }
    const ns = narracionesDe(g);
    setErrorVoz(null);
    const nuevos = [...audios];
    const indices = ns.map((_, i) => i).filter((i) => (soloIndice == null ? true : i === soloIndice))
      .filter((i) => ns[i].trim() && !(nuevos[i]?.texto === ns[i] && nuevos[i]?.voiceId === vozId));
    try {
      for (let k = 0; k < indices.length; k++) {
        const i = indices[k];
        setNarrando({ actual: k + 1, total: indices.length });
        nuevos[i] = await generarVoz(ns[i], vozId, { anterior: ns[i - 1], siguiente: ns[i + 1] });
        setAudios([...nuevos]);
      }
      // Guardar las voces con el guion para no volver a pagarlas al abrirlo después
      if (id) actualizar(id, { ...g, voces: nuevos.map((a) => a && { texto: a.texto, voiceId: a.voiceId, audio: a.audio, palabras: a.palabras, dur: a.dur }) });
    } catch (e) {
      setErrorVoz(e.message);
    } finally {
      setNarrando(null);
    }
  }, [vozId, audios, filaId, actualizar]);

  const cargarGuion = (g, id = null) => {
    const { voces: guardadas, ...resto } = g;
    setCrudo(resto);
    setFilaId(id);
    setAudios(Array.isArray(guardadas) ? guardadas : []);
    if (TEMAS[g.tema]) setEstilo(g.tema);
    setError(null);
    setErrorVoz(null);
  };

  const generar = async () => {
    if (!workerUrl) { setError("VITE_WORKER_URL no está configurada."); return; }
    setCargando(true); setError(null);
    try {
      const g = await pedirGuion(workerUrl, tema.trim(), estilo);
      const fila = await guardar("video", tema.trim() || g.titulo, g);
      cargarGuion(g, fila?.id);
      setAudios([]);
      if (conVoz && vozId) await narrarConEstado(g, fila?.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };
  // Narrar recién creado (audios vacíos)
  const narrarConEstado = async (g, id) => {
    const ns = narracionesDe(g);
    const nuevos = [];
    try {
      for (let i = 0; i < ns.length; i++) {
        if (!ns[i].trim()) continue;
        setNarrando({ actual: i + 1, total: ns.length });
        nuevos[i] = await generarVoz(ns[i], vozId, { anterior: ns[i - 1], siguiente: ns[i + 1] });
        setAudios([...nuevos]);
      }
      if (id) actualizar(id, { ...g, voces: nuevos.map((a) => a && { texto: a.texto, voiceId: a.voiceId, audio: a.audio, palabras: a.palabras, dur: a.dur }) });
    } catch (e) {
      setErrorVoz(e.message);
    } finally {
      setNarrando(null);
    }
  };

  const editarEscena = (i, campoNombre, valor) => setCrudo((g) => ({
    ...g, escenas: g.escenas.map((e, j) => (j === i ? { ...e, [campoNombre]: valor } : e)),
  }));
  const editarCta = (campoNombre, valor) => setCrudo((g) => ({ ...g, cta: { ...(g.cta || {}), [campoNombre]: valor } }));

  const exportar = useCallback(async () => {
    if (!guion) return;
    setExportando(0); setError(null);
    try {
      const r = await exportarVideo(guion, conVoz ? pista : null, setExportando);
      setVideo({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      setError("No se pudo exportar: " + e.message);
    } finally {
      setExportando(null);
    }
  }, [guion, pista, conVoz]);

  const nombre = `earthpark-${(crudo?.titulo || "reel").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}`;
  const descargar = () => { const a = document.createElement("a"); a.href = video.url; a.download = `${nombre}.${video.extension}`; a.click(); };
  const puedeCompartir = typeof navigator !== "undefined" && !!navigator.canShare;
  const compartir = async () => {
    const file = new File([video.blob], `${nombre}.${video.extension}`, { type: video.blob.type });
    try {
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: crudo?.titulo });
      else descargar();
    } catch (e) { if (e.name !== "AbortError") descargar(); }
  };

  const caption = crudo ? `${crudo.caption || ""}\n\n${(crudo.hashtags || []).join(" ")}`.trim() : "";
  const vozSel = voces.find((v) => v.id === vozId);
  const ocupado = cargando || !!narrando || exportando != null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Film className="w-6 h-6 text-emerald-400" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-white leading-tight">Videos animados</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Reels educativos animados con narrador, a partir de una idea · MP4 vertical listo para Instagram y TikTok</p>
        </div>
        <Link to="/marketing/cine" className="text-xs text-fuchsia-300 border border-fuchsia-500/40 px-3 py-1.5 rounded-lg">Modo cinematográfico (IA)</Link>
      </div>

      {/* Entrada */}
      <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
        <label className="text-xs text-gray-400">¿Sobre qué es el video?</label>
        <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2} className={campo}
          placeholder="Ej: Por qué la mariposa 88 es el símbolo de Earth Park" />
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button key={idea} onClick={() => setTema(idea)}
              className="text-[11px] px-2 py-1 rounded-full text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/30">{idea}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {/* Estilo */}
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Estilo</span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TEMAS).map(([id, t]) => (
                <button key={id} onClick={() => setEstilo(id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                  style={{ borderColor: estilo === id ? t.acento : "rgba(255,255,255,0.1)", color: estilo === id ? t.acento : "#9ca3af", background: t.fondo }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.acento }} /> {t.nombre}
                </button>
              ))}
            </div>
          </div>
          {/* Narrador */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={conVoz} onChange={(e) => setConVoz(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              <Mic className="w-3.5 h-3.5 text-emerald-400" /> Narrador (ElevenLabs)
            </label>
            {conVoz && (errorVoces ? (
              <p className="text-[11px] text-amber-300">No se pudieron cargar las voces: {errorVoces}</p>
            ) : (
              <div className="flex gap-2 items-center">
                <select value={vozId} onChange={(e) => setVozId(e.target.value)} className={campo} style={{ paddingTop: 6, paddingBottom: 6 }}>
                  {!voces.length && <option value="">Cargando voces...</option>}
                  {voces.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}{v.etiquetas?.gender ? ` · ${v.etiquetas.gender}` : ""}{v.etiquetas?.accent ? ` · ${v.etiquetas.accent}` : ""}
                    </option>
                  ))}
                </select>
                {vozSel?.muestra && (
                  <button onClick={() => new Audio(vozSel.muestra).play()} title="Escuchar muestra"
                    className="p-2 rounded-lg text-emerald-300 border border-emerald-800/60 flex-shrink-0"><Volume2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 flex-wrap pt-1">
          <button onClick={() => cargarGuion(GUION_EJEMPLO)} disabled={ocupado}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-emerald-300 border border-emerald-800/60 disabled:opacity-50">
            <BookOpen className="w-3.5 h-3.5" /> Ver ejemplo
          </button>
          <button onClick={generar} disabled={ocupado}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "rgba(77,142,30,0.80)", border: "1px solid rgba(77,142,30,0.40)" }}>
            {cargando && !narrando ? <><Loader2 className="w-4 h-4 animate-spin" /> Escribiendo guion...</>
              : narrando ? <><Loader2 className="w-4 h-4 animate-spin" /> Narrando {narrando.actual}/{narrando.total}...</>
              : <><Sparkles className="w-4 h-4" /> Crear video</>}
          </button>
        </div>
      </div>

      {(error || errorVoz) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error || `Narrador: ${errorVoz}`}</span>
        </div>
      )}

      {guion && (
        <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
          {/* Vista previa + exportar */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <Reproductor guion={guion} pista={conVoz ? pista : null} />
            <p className="text-center text-[11px] text-gray-500">
              {guion.escenas.length} escenas · {guion.total.toFixed(1)} s · 1080×1920{conVoz && pista ? " · con narración" : ""}
            </p>
            {conVoz && pendientes > 0 && !narrando && (
              <button onClick={() => narrar(crudo)} disabled={ocupado}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-amber-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-50">
                <Mic className="w-4 h-4" /> Generar narración ({pendientes} {pendientes === 1 ? "escena" : "escenas"})
              </button>
            )}
            {narrando && <p className="text-center text-xs text-amber-300 flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Narrando escena {narrando.actual} de {narrando.total}...</p>}
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
              <button onClick={exportar} disabled={!!narrando}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50">
                <Download className="w-4 h-4" /> Exportar video MP4{conVoz && pista ? " con narración" : ""}
              </button>
            )}
          </div>

          {/* Guion editable */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Guion</p>
                <p className="text-[11px] text-gray-500">Pon *asteriscos* alrededor de una palabra para pintarla del color de acento. Si cambias una narración, vuelve a generar su voz.</p>
              </div>
              {crudo.escenas.map((e, i) => {
                const voz = vigentes[i];
                return (
                  <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(77,142,30,0.15)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-400">Escena {i + 1}</span>
                      <span className="text-[11px] text-gray-400">
                        {conVoz && voz ? `${guion.escenas[i]?.duracion.toFixed(1)} s (según la voz)` : (
                          <>Duración{" "}
                            <input type="number" min={1.5} max={10} step={0.5} value={e.duracion ?? 3.5}
                              onChange={(ev) => editarEscena(i, "duracion", +ev.target.value)}
                              className="inline-block rounded-md bg-black/30 border border-emerald-900/50 text-white text-xs text-center"
                              style={{ width: 64, padding: "4px 6px" }} /> s
                          </>
                        )}
                      </span>
                    </div>
                    <label className="block text-[11px] text-gray-400">Texto en pantalla</label>
                    <input type="text" value={e.texto || ""} onChange={(ev) => editarEscena(i, "texto", ev.target.value)} className={campo} />
                    {conVoz && (
                      <>
                        <label className="block text-[11px] text-gray-400">Narración</label>
                        <textarea value={e.narracion || ""} rows={2} onChange={(ev) => editarEscena(i, "narracion", ev.target.value)} className={campo} />
                        <div className="flex items-center justify-between text-[11px]">
                          {voz ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Voz lista</span>
                            : <span className="text-amber-300">{audios[i] ? "La narración cambió" : "Sin voz todavía"}</span>}
                          {!voz && narraciones[i]?.trim() && (
                            <button onClick={() => narrar(crudo, i)} disabled={ocupado}
                              className="flex items-center gap-1 text-amber-300 px-2 py-1 rounded-md border border-amber-500/40 disabled:opacity-40">
                              <RefreshCw className="w-3 h-3" /> Generar voz
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {crudo.cta && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(163,230,53,0.25)" }}>
                  <span className="text-xs font-bold text-lime-300">Cierre</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Texto en pantalla</label>
                      <input type="text" value={crudo.cta.texto || ""} onChange={(e) => editarCta("texto", e.target.value)} className={campo} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Palabra</label>
                      <input type="text" value={crudo.cta.palabra || ""} onChange={(e) => editarCta("palabra", e.target.value)} className={`${campo} uppercase`} />
                    </div>
                  </div>
                  {conVoz && (
                    <>
                      <label className="block text-[11px] text-gray-400">Narración</label>
                      <textarea value={crudo.cta.narracion || ""} rows={2} onChange={(e) => editarCta("narracion", e.target.value)} className={campo} />
                      {!vigentes[crudo.escenas.length] && narraciones[crudo.escenas.length]?.trim() && (
                        <button onClick={() => narrar(crudo, crudo.escenas.length)} disabled={ocupado}
                          className="flex items-center gap-1 text-[11px] text-amber-300 px-2 py-1 rounded-md border border-amber-500/40 disabled:opacity-40">
                          <RefreshCw className="w-3 h-3" /> Generar voz
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
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
              Agrega la música de fondo en Instagram o TikTok, bajita, debajo de la narración: los audios en tendencia ayudan al alcance.
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
              <button onClick={() => { cargarGuion(it.resultado, it.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex-1 text-left min-w-0">
                <span className="text-gray-200 truncate">{it.resultado?.titulo || it.tema}</span>
                {it.resultado?.voces?.some(Boolean) && <Mic className="inline w-3 h-3 ml-2 text-emerald-500" />}
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
