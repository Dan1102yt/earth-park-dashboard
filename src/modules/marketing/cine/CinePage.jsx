import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Clapperboard, Sparkles, Loader2, AlertCircle, Play, Pause, RotateCcw, Download, Share2,
  Copy, Check, History, Trash2, Music, Mic, Volume2, VolumeX, RefreshCw, Wand2, Image as ImageIcon, Images, Film, DollarSign,
} from "lucide-react";
import { SISTEMA_AGENTE } from "../agente/agentePrompts";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { useAgenteHistorial } from "../agente/useAgenteHistorial";
import { obtenerCategorias } from "../agente/fotosCarrusel";
import { TEMAS, ANCHO, ALTO, cargarRecursos } from "../animado/motor";
import { exportarVideo } from "../animado/exportar";
import { listarVoces, generarVoz, construirPista, contextoAudio } from "../animado/voz";
import { promptCine } from "./cinePrompt";
import { normalizarCine, dibujarFrameCine, tiempoClip, sinAsteriscos } from "./motorCine";
import SelectorImagen from "./SelectorImagen";
import {
  generarFotograma, animarFotograma, fotoDeDrive, guardarArchivo, cargarImagenRecurso, cargarVideoRecurso,
  descargarBlob, blobABase64, posicionar, aJpegReferencia, verificarFotograma, fotoDriveElegida, PRECIO_VERIFICACION, PRECIO_IMAGEN, PRECIO_SEG_VIDEO, SEG_VIDEO_ESTIMADOS,
} from "./visuales";

const MODEL = "claude-sonnet-4-5";
const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const campo = "block w-full min-w-0 rounded-lg bg-black/30 border border-emerald-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600";
const usd = (v) => `US$${(v || 0).toFixed(2)}`;
const leer = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

const IDEAS = [
  "¿Por qué el agua del embalse cambia de color?",
  "¿Cómo sabe una mariposa hacia dónde volar?",
  "¿Por qué en el campo se duerme mejor que en la ciudad?",
  "¿Cómo se recupera una tierra dañada por agroquímicos?",
  "¿Qué pasa en tu cerebro cuando ves un paisaje abierto?",
];

async function pedirGuion(workerUrl, tema, opciones) {
  const res = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000, system: SISTEMA_AGENTE,
      messages: [{ role: "user", content: promptCine(tema, opciones) }],
    }),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}: ${(await res.text()).substring(0, 300)}`);
  const data = await res.json();
  const texto = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const g = extraerObjetoJSON(texto);
  if (!g?.escenas?.length) throw new Error("No se pudo interpretar el guion. Intenta de nuevo.");
  return g;
}

const narracionesDe = (g) => [
  ...(g?.escenas || []).map((e) => sinAsteriscos(e.narracion)),
  ...(g?.cta?.palabra ? [sinAsteriscos(g.cta.narracion || g.cta.texto)] : []),
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

/* ─── Reproductor ─────────────────────────────────────────── */
function Reproductor({ guion, pista }) {
  const canvasRef = useRef(null);
  const [tiempo, setTiempo] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [sonido, setSonido] = useState(false);
  const s = useRef({ t: 0, ultimo: null, fuente: null, base: 0 });

  const pararAudio = () => { try { s.current.fuente?.stop(); } catch { /* */ } s.current.fuente = null; };
  const arrancarAudio = useCallback((desde) => {
    pararAudio();
    if (!pista || !sonido || !reproduciendo) return;
    const ac = contextoAudio();
    ac.resume();
    const f = ac.createBufferSource();
    f.buffer = pista; f.connect(ac.destination); f.start(0, Math.max(0, desde));
    s.current.fuente = f; s.current.base = ac.currentTime - desde;
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
        if (st.fuente) st.t = contextoAudio().currentTime - st.base;
        else if (st.ultimo != null) st.t += (ahora - st.ultimo) / 1000;
        if (st.t >= guion.total) { st.t = 0; if (st.fuente) arrancarAudio(0); }
      }
      st.ultimo = ahora;
      // Mantener los clips de video al ritmo de la línea de tiempo
      guion.escenas.forEach((e) => {
        const el = e.recurso?.tipo === "video" ? e.recurso.el : null;
        if (!el) return;
        const activa = st.t >= e.inicio && st.t < e.inicio + e.duracion;
        if (!activa || !reproduciendo) { if (!el.paused) el.pause(); if (activa) el.currentTime = tiempoClip(e, st.t - e.inicio); return; }
        const objetivo = tiempoClip(e, st.t - e.inicio);
        el.playbackRate = Math.max(0.6, Math.min(1, (e.recurso.dur || 6) / e.duracion));
        if (Math.abs(el.currentTime - objetivo) > 0.3) el.currentTime = objetivo;
        if (el.paused && objetivo < (e.recurso.dur || 6) - 0.1) el.play().catch(() => {});
      });
      dibujarFrameCine(ctx, guion, st.t);
      setTiempo(st.t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); s.current.ultimo = null; guion.escenas.forEach((e) => e.recurso?.el?.pause?.()); };
  }, [guion, reproduciendo, arrancarAudio]);

  const buscar = (v) => { s.current.t = v; if (s.current.fuente) arrancarAudio(v); };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} width={ANCHO} height={ALTO} className="w-full max-w-[340px] mx-auto block rounded-2xl border border-emerald-900/50 bg-black" />
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
        <input type="range" min={0} max={guion.total} step={0.05} value={tiempo} onChange={(e) => buscar(+e.target.value)} className="flex-1 accent-emerald-500" />
        <span className="text-[11px] text-gray-400 w-12 text-right">{tiempo.toFixed(1)}s</span>
      </div>
    </div>
  );
}

/* ─── Página ──────────────────────────────────────────────── */
export default function CinePage() {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const [tema, setTema] = useState("");
  const [color, setColor] = useState("bosque");
  const [maxVideo, setMaxVideo] = useState(+leer("ep_cine_maxvideo", "3"));
  const [dimension, setDimension] = useState(leer("ep_cine_dim", "doc"));
  const [refsNuevas, setRefsNuevas] = useState([]); // fotos del protagonista subidas antes de crear el video
  const [crudo, setCrudoState] = useState(null);
  const crudoRef = useRef(null);
  const [, setFilaIdState] = useState(null);
  const filaIdRef = useRef(null);
  const setFilaId = (id) => { filaIdRef.current = id; setFilaIdState(id); };
  const [fase, setFase] = useState(null);           // texto de lo que está haciendo
  const [error, setError] = useState(null);
  const [elegir, setElegir] = useState(null);       // escena con el selector de imagen abierto
  const [estado, setEstado] = useState({});         // por escena: {foto, video, error}
  const [recursos, setRecursos] = useState([]);

  const [conVoz, setConVoz] = useState(leer("ep_con_voz", "1") === "1");
  const [voces, setVoces] = useState([]);
  const [vozId, setVozId] = useState(leer("ep_voz", ""));
  const [audios, setAudios] = useState([]);
  const audiosRef = useRef([]);
  const [pista, setPista] = useState(null);

  const [exportando, setExportando] = useState(null);
  const [video, setVideo] = useState(null);
  const { items, guardar, borrar, actualizar } = useAgenteHistorial();
  const hist = items.filter((i) => i.modo === "cine");

  useEffect(() => { escribir("ep_con_voz", conVoz ? "1" : "0"); }, [conVoz]);
  useEffect(() => { if (vozId) escribir("ep_voz", vozId); }, [vozId]);
  useEffect(() => { escribir("ep_cine_maxvideo", String(maxVideo)); }, [maxVideo]);
  useEffect(() => { escribir("ep_cine_dim", dimension); }, [dimension]);
  useEffect(() => {
    listarVoces().then(({ voces: vs, porDefecto }) => {
      setVoces(vs);
      setVozId((a) => (vs.some((v) => v.id === a) ? a : porDefecto || vs[0]?.id || ""));
    }).catch(() => {});
  }, []);

  // Guardar cambios (estado + historial en Supabase)
  const persistir = useCallback((g, id = filaIdRef.current) => {
    if (id) actualizar(id, { ...g, voces: audiosRef.current.map((a) => a && { texto: a.texto, voiceId: a.voiceId, audio: a.audio, palabras: a.palabras, dur: a.dur }) });
  }, [actualizar]);
  const aplicar = (fn, guardarYa = true, id) => {
    const n = fn(crudoRef.current);
    crudoRef.current = n;
    setCrudoState(n);
    if (guardarYa) persistir(n, id);
    return n;
  };
  const setVisual = (i, cambios) => aplicar((g) => ({
    ...g, escenas: g.escenas.map((e, j) => (j === i ? { ...e, visual: { ...(e.visual || {}), ...cambios } } : e)),
  }));
  const sumarCosto = (v) => aplicar((g) => ({ ...g, costo: (g.costo || 0) + v }));
  const marcar = (i, cambios) => setEstado((s) => ({ ...s, [i]: { ...(s[i] || {}), ...cambios } }));

  /* ─── Recursos (fotogramas / clips) ─── */
  useEffect(() => {
    let vivo = true;
    if (!crudo) { setRecursos([]); return; }
    Promise.all(crudo.escenas.map(async (e) => {
      const v = e.visual || {};
      try {
        if (v.modo === "video" && v.video_url) return await cargarVideoRecurso(v.video_url);
        if (v.fotograma_url) return await cargarImagenRecurso(v.fotograma_url);
      } catch { /* sin recurso */ }
      return null;
    })).then((rs) => vivo && setRecursos(rs));
    return () => { vivo = false; };
  }, [crudo]);

  /* ─── Voz ─── */
  const narraciones = useMemo(() => narracionesDe(crudo), [crudo]);
  const vigentes = narraciones.map((n, i) => (audios[i] && audios[i].texto === n && audios[i].voiceId === vozId ? audios[i] : null));
  const vozPendiente = narraciones.filter((n, i) => n.trim() && !vigentes[i]).length;

  const guion = useMemo(
    () => (crudo ? normalizarCine({ ...crudo, tema: color }, conVoz ? vigentes : [], recursos) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crudo, color, conVoz, audios, vozId, recursos],
  );
  useEffect(() => {
    let vivo = true;
    if (!guion || !conVoz || !vigentes.some(Boolean)) { setPista(null); return; }
    construirPista(guion).then((p) => vivo && setPista(p)).catch(() => vivo && setPista(null));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guion]);
  useEffect(() => { setVideo(null); }, [guion]);

  const narrar = async (soloIndice = null) => {
    if (!vozId) { setError("Elige una voz primero."); return; }
    const ns = narracionesDe(crudoRef.current);
    const nuevos = [...audiosRef.current];
    const idx = ns.map((_, i) => i).filter((i) => (soloIndice == null || i === soloIndice) && ns[i].trim()
      && !(nuevos[i]?.texto === ns[i] && nuevos[i]?.voiceId === vozId));
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k];
      setFase(`Narrando escena ${k + 1} de ${idx.length}...`);
      nuevos[i] = await generarVoz(ns[i], vozId, { anterior: ns[i - 1], siguiente: ns[i + 1] });
      audiosRef.current = [...nuevos];
      setAudios([...nuevos]);
    }
    persistir(crudoRef.current);
  };

  /* ─── Visuales ─── */
  // Referencia de estilo = primer fotograma IA (salvo para generar ese mismo); solo paleta y render, no composición
  const referenciaEstilo = async (i) => {
    const idx = crudoRef.current.escenas.findIndex((e) => e.visual?.modo !== "foto" && e.visual?.fotograma_url);
    if (idx < 0 || idx === i) return null;
    return blobABase64(await descargarBlob(crudoRef.current.escenas[idx].visual.fotograma_url));
  };
  // Fotos reales del protagonista (ej. la mariposa 88) que subió el usuario
  const referenciasSujeto = async () => {
    const urls = crudoRef.current.referencias_sujeto || [];
    return Promise.all(urls.slice(0, 2).map(async (u) => blobABase64(await descargarBlob(u))));
  };

  // Genera el fotograma, lo revisa con IA (¿coincide con la narración?) y ubica los puntos que señalan las etiquetas.
  // Si no coincide, lo corrige y lo vuelve a generar una vez, automáticamente.
  const hacerFotograma = async (i, saltarFoto = 0) => {
    const e = crudoRef.current.escenas[i];
    const v = e.visual || {};
    marcar(i, { foto: true, error: null });
    try {
      const narracion = sinAsteriscos(e.narracion);
      const promptBase = v.prompt || narracion;
      const senalamientos = (e.datos || []).map((d, k) => ({ i: k, senala: d.senala })).filter((x) => x.senala);
      const usarSujeto = v.modo !== "foto" && v.protagonista === true && (crudoRef.current.referencias_sujeto || []).length > 0;

      const generar = async (correccion = "") => {
        const p = correccion ? `${promptBase}. IMPORTANT FIX: ${correccion}` : promptBase;
        const b = await generarFotograma(crudoRef.current.estilo_visual, p, {
          estilo: await referenciaEstilo(i),
          sujeto: usarSujeto ? await referenciasSujeto() : [],
          plano: v.plano,
          formato: crudoRef.current.dimension,
        });
        sumarCosto(PRECIO_IMAGEN);
        return b;
      };

      let blob = v.modo === "foto" ? await fotoDeDrive(v.categoria_foto, saltarFoto) : await generar();
      let revision = { coincide: true, problema: "", puntos: {} };
      try {
        revision = await verificarFotograma(blob, { narracion, prompt: promptBase, senalamientos });
        sumarCosto(PRECIO_VERIFICACION);
        if (!revision.coincide && v.modo !== "foto") {
          marcar(i, { aviso: `Corrigiendo: ${revision.problema}` });
          blob = await generar(revision.correccion || revision.problema);
          revision = await verificarFotograma(blob, { narracion, prompt: promptBase, senalamientos });
          sumarCosto(PRECIO_VERIFICACION);
        }
      } catch (err) {
        console.warn("[cine] verificación:", err.message);
      }

      const url = await guardarArchivo(blob, "jpg");
      aplicar((g) => ({
        ...g,
        escenas: g.escenas.map((x, j) => (j !== i ? x : {
          ...x,
          visual: { ...x.visual, fotograma_url: url, video_url: null,
            revision: { ok: revision.coincide, problema: revision.problema || "" } },
          // Etiquetas que señalan algo: se anclan al punto real; si no está en la imagen, no se muestran
          datos: (x.datos || []).map((d, k) => (d.senala ? { ...d, ancla: revision.puntos?.[k] || null } : d)),
        })),
      }));
      marcar(i, { aviso: revision.coincide ? null : `Revisar: ${revision.problema}` });
    } catch (err) {
      marcar(i, { error: err.message });
    } finally {
      marcar(i, { foto: false });
    }
  };

  // Subir fotos reales del protagonista
  // paraNuevo = true: fotos del formulario, para el próximo video que se cree
  const subirReferencias = async (archivos, paraNuevo = false) => {
    const nuevos = [];
    for (const f of Array.from(archivos || []).slice(0, 2)) {
      nuevos.push(await guardarArchivo(await aJpegReferencia(f), "jpg"));
    }
    if (paraNuevo || !crudoRef.current) { setRefsNuevas((r) => [...r, ...nuevos].slice(-2)); return; }
    aplicar((g) => ({ ...g, referencias_sujeto: [...(g.referencias_sujeto || []), ...nuevos].slice(-2) }));
  };
  const quitarReferencia = (u) => aplicar((g) => ({ ...g, referencias_sujeto: (g.referencias_sujeto || []).filter((x) => x !== u) }));

  // Rehacer todos los fotogramas IA (ej. después de subir fotos de referencia)
  const rehacerStoryboard = async () => {
    aplicar((g) => ({ ...g, escenas: g.escenas.map((e) => (e.visual?.modo === "foto" ? e : { ...e, visual: { ...e.visual, fotograma_url: null, video_url: null } })) }));
    await storyboard();
    setFase(null);
  };

  const animar = async (i) => {
    const e = crudoRef.current.escenas[i];
    const v = e.visual || {};
    if (!v.fotograma_url) return;
    marcar(i, { video: true, error: null });
    try {
      const clip = await animarFotograma(await descargarBlob(v.fotograma_url), crudoRef.current.estilo_visual, v.prompt || sinAsteriscos(e.narracion), v.movimiento);
      const url = await guardarArchivo(clip, "mp4");
      const rec = await cargarVideoRecurso(url);
      sumarCosto((rec.dur || SEG_VIDEO_ESTIMADOS) * PRECIO_SEG_VIDEO);
      setVisual(i, { video_url: url, modo: "video" });
    } catch (err) {
      marcar(i, { error: err.message });
    } finally {
      marcar(i, { video: false });
    }
  };

  const storyboard = async () => {
    const escenas = crudoRef.current.escenas;
    // Primero la primera escena IA (sirve de referencia de estilo para las demás)
    const orden = escenas.map((_, i) => i).filter((i) => !escenas[i].visual?.fotograma_url);
    const primeraIA = orden.find((i) => escenas[i].visual?.modo !== "foto");
    const resto = orden.filter((i) => i !== primeraIA);
    if (primeraIA != null) { setFase(`Storyboard: escena ${primeraIA + 1}...`); await hacerFotograma(primeraIA); }
    // Las demás, de a 3 en paralelo
    for (let k = 0; k < resto.length; k += 3) {
      setFase(`Storyboard: escenas ${resto.slice(k, k + 3).map((i) => i + 1).join(", ")}...`);
      await Promise.all(resto.slice(k, k + 3).map((i) => hacerFotograma(i)));
    }
  };

  const porAnimar = crudo ? crudo.escenas.map((e, i) => i).filter((i) => crudo.escenas[i].visual?.modo === "video" && crudo.escenas[i].visual?.fotograma_url && !crudo.escenas[i].visual?.video_url) : [];
  const animarTodo = async () => {
    setError(null);
    for (let k = 0; k < porAnimar.length; k += 2) {
      setFase(`Animando escenas ${porAnimar.slice(k, k + 2).map((i) => i + 1).join(", ")} (puede tardar unos minutos)...`);
      await Promise.all(porAnimar.slice(k, k + 2).map((i) => animar(i)));
    }
    setFase(null);
  };

  /* ─── Crear ─── */
  const crear = async () => {
    if (!workerUrl) { setError("VITE_WORKER_URL no está configurada."); return; }
    setError(null); setVideo(null);
    try {
      setFase("Escribiendo el guion...");
      const categorias = (await obtenerCategorias()).map((c) => c.nombre);
      const g = { ...(await pedirGuion(workerUrl, tema.trim(), { categorias, maxVideo, dimension })), tema: color, dimension, costo: 0, referencias_sujeto: refsNuevas };
      const fila = await guardar("cine", tema.trim() || g.titulo, g);
      setFilaId(fila?.id || null);
      crudoRef.current = g; setCrudoState(g);
      audiosRef.current = []; setAudios([]); setEstado({});
      await storyboard();
      if (conVoz && vozId) await narrar();
      persistir(crudoRef.current, fila?.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setFase(null);
    }
  };

  const abrir = (it) => {
    const { voces: vs, ...g } = it.resultado;
    crudoRef.current = g; setCrudoState(g);
    audiosRef.current = Array.isArray(vs) ? vs : []; setAudios(audiosRef.current);
    setFilaId(it.id); setEstado({}); setError(null);
    if (TEMAS[g.tema]) setColor(g.tema);
    if (g.dimension) setDimension(g.dimension);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Exportar ─── */
  const exportar = async () => {
    if (!guion) return;
    setExportando(0); setError(null);
    try {
      const r = await exportarVideo(guion, conVoz ? pista : null, setExportando, {
        dibujar: dibujarFrameCine,
        preparar: async (t) => {
          const e = guion.escenas.find((x) => t >= x.inicio && t < x.inicio + x.duracion);
          if (e?.recurso?.tipo === "video") { e.recurso.el.pause(); await posicionar(e.recurso.el, tiempoClip(e, t - e.inicio)); }
        },
      });
      setVideo({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      setError("No se pudo exportar: " + e.message);
    } finally {
      setExportando(null);
    }
  };
  const nombre = `earthpark-${(crudo?.titulo || "reel").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}`;
  const descargar = () => { const a = document.createElement("a"); a.href = video.url; a.download = `${nombre}.${video.extension}`; a.click(); };
  const compartir = async () => {
    const f = new File([video.blob], `${nombre}.${video.extension}`, { type: video.blob.type });
    try { if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: crudo?.titulo }); else descargar(); }
    catch (e) { if (e.name !== "AbortError") descargar(); }
  };

  const editarNarracion = (i, valor) => aplicar((g) => ({ ...g, escenas: g.escenas.map((e, j) => (j === i ? { ...e, narracion: valor } : e)) }), false);
  const editarCta = (campoN, valor) => aplicar((g) => ({ ...g, cta: { ...(g.cta || {}), [campoN]: valor } }), false);
  // Reutilizar la imagen (y el clip, si aplica) de otra escena — sin costo
  const usarDeEscena = (i, j) => {
    const fuente = crudoRef.current.escenas[j].visual || {};
    const actual = crudoRef.current.escenas[i].visual || {};
    const modo = fuente.modo === "foto" ? "foto" : actual.modo === "foto" ? "imagen" : actual.modo;
    setVisual(i, {
      modo, fotograma_url: fuente.fotograma_url,
      video_url: modo === "video" && fuente.video_url ? fuente.video_url : null,
      revision: { ok: true, problema: "", elegida: `Misma imagen de la escena ${j + 1}` },
    });
    marcar(i, { aviso: null, error: null });
    setElegir(null);
  };

  // Foto real de Drive escogida a mano
  const usarFotoDrive = async (i, foto) => {
    setElegir(null);
    marcar(i, { foto: true, error: null, aviso: null });
    try {
      const url = await guardarArchivo(await fotoDriveElegida(foto), "jpg");
      setVisual(i, { modo: "foto", fotograma_url: url, video_url: null, revision: { ok: true, problema: "", elegida: "Foto elegida por ti" } });
    } catch (err) {
      marcar(i, { error: err.message });
    } finally {
      marcar(i, { foto: false });
    }
  };

  const cambiarModo = (i, modo) => setVisual(i, { modo, ...(modo === "foto" ? { fotograma_url: null, video_url: null } : {}) });

  const ocupado = !!fase || exportando != null || Object.values(estado).some((s) => s.foto || s.video);
  const estimadoAnimar = porAnimar.length * SEG_VIDEO_ESTIMADOS * PRECIO_SEG_VIDEO;
  const caption = crudo ? `${crudo.caption || ""}\n\n${(crudo.hashtags || []).join(" ")}`.trim() : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Clapperboard className="w-6 h-6 text-emerald-400" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-white leading-tight">Videos cinematográficos</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Explicativos con mundo 2D o 3D generado por IA, narrador, subtítulos al ritmo de la voz y datos animados</p>
        </div>
        <Link to="/marketing/animado" className="text-xs text-emerald-400 border border-emerald-800/60 px-3 py-1.5 rounded-lg">Modo ilustrado (gratis)</Link>
      </div>

      {/* Entrada */}
      <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
        <label className="text-xs text-gray-400">¿Qué quieres explicar?</label>
        <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2} className={campo} placeholder="Ej: ¿Por qué el agua del embalse cambia de color?" />
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button key={idea} onClick={() => setTema(idea)} className="text-[11px] px-2 py-1 rounded-full text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/30">{idea}</button>
          ))}
        </div>
        <div className="space-y-1.5 pt-1">
          <span className="text-xs text-gray-400">Estilo del mundo</span>
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              ["doc", "Documental cine", "Pintura cinematográfica, cortes rápidos, una palabra en pantalla (estilo wil_lab)"],
              ["2d", "2D ilustrado", "Motion graphics: ilustración plana con capas, más dibujos y efectos encima"],
              ["3d", "3D cinematográfico", "Mundo 3D estilizado con luz, profundidad y cámara tipo dron"],
            ].map(([id, titulo, desc]) => (
              <button key={id} onClick={() => setDimension(id)} className="text-left rounded-xl p-3 transition"
                style={{ background: dimension === id ? "rgba(77,142,30,0.25)" : "rgba(0,0,0,0.25)", border: `1px solid ${dimension === id ? "rgba(52,211,153,0.5)" : "rgba(77,142,30,0.18)"}` }}>
                <p className="text-sm font-semibold text-white">{titulo}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Color de acento</span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TEMAS).map(([id, t]) => (
                <button key={id} onClick={() => setColor(id)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                  style={{ borderColor: color === id ? t.acento : "rgba(255,255,255,0.1)", color: color === id ? t.acento : "#9ca3af", background: t.fondo }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.acento }} /> {t.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Escenas animadas con IA (las demás: imagen con movimiento)</span>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={8} value={maxVideo} onChange={(e) => setMaxVideo(+e.target.value)} className="flex-1 accent-emerald-500" />
              <span className="text-sm text-white w-6 text-center">{maxVideo}</span>
            </div>
            <p className="text-[11px] text-gray-500">≈ {usd(maxVideo * SEG_VIDEO_ESTIMADOS * PRECIO_SEG_VIDEO + (dimension === "doc" ? 14 : 9) * (PRECIO_IMAGEN + PRECIO_VERIFICACION))} por video en Gemini</p>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={conVoz} onChange={(e) => setConVoz(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              <Mic className="w-3.5 h-3.5 text-emerald-400" /> Narrador
            </label>
            {conVoz && (
              <select value={vozId} onChange={(e) => setVozId(e.target.value)} className={campo} style={{ paddingTop: 6, paddingBottom: 6 }}>
                {!voces.length && <option value="">Cargando voces...</option>}
                {voces.map((v) => <option key={v.id} value={v.id}>{v.nombre}{v.etiquetas?.accent ? ` · ${v.etiquetas.accent}` : ""}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="space-y-1.5 pt-1">
          <span className="text-xs text-gray-400">Fotos reales del protagonista <span className="text-gray-600">(opcional, hasta 2 — ej. la mariposa 88 por debajo y por encima)</span></span>
          <div className="flex items-center gap-2 flex-wrap">
            {refsNuevas.map((u) => (
              <div key={u} className="relative w-12 h-16 rounded-md overflow-hidden">
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setRefsNuevas((r) => r.filter((x) => x !== u))} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><Trash2 className="w-3 h-3 text-red-300" /></button>
              </div>
            ))}
            {refsNuevas.length < 2 && (
              <label className="flex items-center gap-1 text-[11px] text-emerald-300 px-3 py-2 rounded-md border border-emerald-800/60 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> Subir foto
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => subirReferencias(e.target.files, true)} />
              </label>
            )}
            <span className="text-[11px] text-gray-500">La IA las usa para que el protagonista salga fiel a la realidad.</span>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={crear} disabled={ocupado} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "rgba(77,142,30,0.80)", border: "1px solid rgba(77,142,30,0.40)" }}>
            {fase && !crudo ? <><Loader2 className="w-4 h-4 animate-spin" /> {fase}</> : <><Sparkles className="w-4 h-4" /> Crear guion y storyboard</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {fase && crudo && <p className="text-sm text-amber-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {fase}</p>}

      {crudo && guion && (
        <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
          {/* Vista previa y pasos */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <Reproductor guion={guion} pista={conVoz ? pista : null} />
            <p className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1">
              {guion.escenas.length} escenas · {guion.total.toFixed(1)} s · <DollarSign className="w-3 h-3" /> gastado {usd(crudo.costo)}
            </p>
            {porAnimar.length > 0 && (
              <button onClick={animarTodo} disabled={ocupado} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-fuchsia-950 bg-fuchsia-300 hover:bg-fuchsia-200 disabled:opacity-50">
                <Film className="w-4 h-4" /> Animar {porAnimar.length} {porAnimar.length === 1 ? "escena" : "escenas"} (≈ {usd(estimadoAnimar)})
              </button>
            )}
            {conVoz && vozPendiente > 0 && (
              <button onClick={async () => { try { await narrar(); } catch (e) { setError(e.message); } finally { setFase(null); } }} disabled={ocupado}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-amber-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-50">
                <Mic className="w-4 h-4" /> Generar narración ({vozPendiente})
              </button>
            )}
            {exportando != null ? (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.round(exportando * 100)}%` }} /></div>
                <p className="text-center text-xs text-gray-400">Creando el MP4... {Math.round(exportando * 100)}%</p>
              </div>
            ) : video ? (
              <div className="flex gap-2 justify-center flex-wrap">
                {navigator.canShare && <button onClick={compartir} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400"><Share2 className="w-3.5 h-3.5" /> Guardar / Compartir</button>}
                <button onClick={descargar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700"><Download className="w-3.5 h-3.5" /> Descargar {video.extension.toUpperCase()}</button>
                <button onClick={exportar} className="px-3 py-2 rounded-lg text-xs text-gray-300 border border-emerald-900/50">Volver a exportar</button>
              </div>
            ) : (
              <button onClick={exportar} disabled={ocupado} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50">
                <Download className="w-4 h-4" /> Exportar video MP4
              </button>
            )}
            <p className="text-[11px] text-gray-500 text-center">Revisa el storyboard antes de animar: así solo pagas video por escenas que te gustan.</p>
          </div>

          {/* Storyboard */}
          <div className="space-y-3 min-w-0">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Storyboard</p>
            {crudo.estilo_visual && <p className="text-[11px] text-gray-500">Estilo: {crudo.estilo_visual}</p>}
            <div className="rounded-xl p-3 space-y-2" style={tarjeta}>
              <p className="text-xs font-semibold text-white">Fotos reales del protagonista <span className="text-gray-500 font-normal">(opcional, hasta 2)</span></p>
              <p className="text-[11px] text-gray-400">Sube fotos reales del sujeto (ej. la mariposa 88 por debajo y por encima). La IA las usa para que salga fiel a la realidad en las escenas donde aparece.</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(crudo.referencias_sujeto || []).map((u) => (
                  <div key={u} className="relative w-14 aspect-[9/16] rounded-md overflow-hidden">
                    <img src={u} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => quitarReferencia(u)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><Trash2 className="w-3 h-3 text-red-300" /></button>
                  </div>
                ))}
                <label className="flex items-center gap-1 text-[11px] text-emerald-300 px-2 py-1.5 rounded-md border border-emerald-800/60 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5" /> Subir foto
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => subirReferencias(e.target.files)} />
                </label>
                <button onClick={rehacerStoryboard} disabled={ocupado}
                  className="ml-auto flex items-center gap-1 text-[11px] text-amber-300 px-2 py-1.5 rounded-md border border-amber-500/40 disabled:opacity-40">
                  <RefreshCw className="w-3 h-3" /> Rehacer storyboard (≈ {usd(crudo.escenas.filter((e) => e.visual?.modo !== "foto").length * PRECIO_IMAGEN)})
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {crudo.escenas.map((e, i) => {
                const v = e.visual || {};
                const st = estado[i] || {};
                const voz = vigentes[i];
                return (
                  <div key={i} className="rounded-xl p-3 space-y-2" style={tarjeta}>
                    <div className="flex gap-3">
                      <div className="relative w-24 flex-shrink-0 aspect-[9/16] rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                        {v.video_url && v.modo === "video" ? <video src={v.video_url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                          : v.fotograma_url ? <img src={v.fotograma_url} alt="" className="w-full h-full object-cover" />
                          : <ImageIcon className="w-5 h-5 text-gray-600" />}
                        {(st.foto || st.video) && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-emerald-400">Escena {i + 1}</span>
                          <select value={v.modo || "imagen"} onChange={(ev) => cambiarModo(i, ev.target.value)} disabled={ocupado}
                            className="rounded-md bg-black/40 border border-emerald-900/50 text-[11px] text-white" style={{ width: 96, padding: "2px 6px" }}>
                            <option value="video">🎬 Video IA</option>
                            <option value="imagen">🖼️ Imagen IA</option>
                            <option value="foto">📷 Foto real</option>
                          </select>
                        </div>
                        <textarea value={e.narracion || ""} rows={3} onChange={(ev) => editarNarracion(i, ev.target.value)} className={`${campo} text-xs`} style={{ padding: "6px 8px" }} />
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <button onClick={() => hacerFotograma(i, Math.floor(Math.random() * 7) + 1)} disabled={ocupado} className="flex items-center gap-1 text-emerald-300 px-2 py-1 rounded-md border border-emerald-800/60 disabled:opacity-40">
                            {v.modo === "foto" ? <><Images className="w-3 h-3" /> Otra foto</> : <><RefreshCw className="w-3 h-3" /> Otro fotograma</>}
                          </button>
                          <button onClick={() => setElegir(i)} disabled={ocupado} className="flex items-center gap-1 text-sky-300 px-2 py-1 rounded-md border border-sky-500/40 disabled:opacity-40">
                            <Images className="w-3 h-3" /> Elegir
                          </button>
                          {v.modo === "video" && v.fotograma_url && (
                            <button onClick={() => animar(i)} disabled={ocupado} className="flex items-center gap-1 text-fuchsia-300 px-2 py-1 rounded-md border border-fuchsia-500/40 disabled:opacity-40">
                              <Wand2 className="w-3 h-3" /> {v.video_url ? "Re-animar" : "Animar"}
                            </button>
                          )}
                          {conVoz && !voz && narraciones[i]?.trim() && (
                            <button onClick={async () => { try { await narrar(i); } catch (er) { setError(er.message); } finally { setFase(null); } }} disabled={ocupado}
                              className="flex items-center gap-1 text-amber-300 px-2 py-1 rounded-md border border-amber-500/40 disabled:opacity-40"><Mic className="w-3 h-3" /> Voz</button>
                          )}
                        </div>
                        {st.error && <p className="text-[10px] text-red-300">{st.error}</p>}
                        {st.aviso && <p className="text-[10px] text-amber-300">⚠ {st.aviso}</p>}
                        {!st.aviso && v.revision && (v.revision.ok
                          ? <p className="text-[10px] text-emerald-400">✓ {v.revision.elegida || "Revisado: coincide con la narración"}</p>
                          : <p className="text-[10px] text-amber-300">⚠ {v.revision.problema || "Revisar esta escena"}</p>)}
                      </div>
                    </div>
                    {v.modo !== "foto" && (
                      <details className="text-[11px] text-gray-400">
                        <summary className="cursor-pointer">Prompt visual</summary>
                        <textarea value={v.prompt || ""} rows={3} onChange={(ev) => aplicar((g) => ({ ...g, escenas: g.escenas.map((x, j) => (j === i ? { ...x, visual: { ...x.visual, prompt: ev.target.value } } : x)) }), false)}
                          className={`${campo} text-xs mt-1`} />
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
            {crudo.cta && (
              <div className="rounded-xl p-3 space-y-2" style={{ ...tarjeta, borderColor: "rgba(163,230,53,0.3)" }}>
                <span className="text-xs font-bold text-lime-300">Cierre</span>
                <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                  <input type="text" value={crudo.cta.texto || ""} onChange={(e) => editarCta("texto", e.target.value)} className={campo} />
                  <input type="text" value={crudo.cta.palabra || ""} onChange={(e) => editarCta("palabra", e.target.value)} className={`${campo} uppercase`} />
                </div>
                <textarea value={crudo.cta.narracion || ""} rows={2} onChange={(e) => editarCta("narracion", e.target.value)} className={`${campo} text-xs`} />
              </div>
            )}
            {caption && (
              <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Caption + hashtags</p><CopiarBtn texto={caption} /></div>
                <p className="text-sm text-gray-200 whitespace-pre-line">{crudo.caption}</p>
                <p className="text-xs text-emerald-300/80">{(crudo.hashtags || []).join(" ")}</p>
                {crudo.musica && <p className="flex items-start gap-1.5 text-xs text-gray-400 pt-1"><Music className="w-3.5 h-3.5 mt-0.5" /> {crudo.musica}</p>}
              </div>
            )}
            <p className="text-[11px] text-gray-500">Al publicar, Instagram puede pedirte marcarlo como "Contenido generado con IA": márcalo, es lo correcto y no afecta el alcance.</p>
          </div>
        </div>
      )}

      {hist.length > 0 && (
        <section className="space-y-2 pt-4">
          <div className="flex items-center gap-2"><History className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold text-white">Videos anteriores</h2></div>
          {hist.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm" style={tarjeta}>
              <button onClick={() => abrir(it)} className="flex-1 text-left min-w-0">
                <span className="text-gray-200 truncate">{it.resultado?.titulo || it.tema}</span>
                <span className="text-gray-600 text-xs ml-2">{({ doc: "DOC" }[it.resultado?.dimension] || (it.resultado?.dimension || "3d").toUpperCase())} · {new Date(it.creado_at).toLocaleDateString("es-CO")} · {usd(it.resultado?.costo)}</span>
              </button>
              <button onClick={() => borrar(it.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </section>
      )}
      {elegir !== null && crudo && (
        <SelectorImagen escenas={crudo.escenas} indice={elegir} categoriaSugerida={crudo.escenas[elegir]?.visual?.categoria_foto}
          onElegirEscena={(j) => usarDeEscena(elegir, j)} onElegirFoto={(f) => usarFotoDrive(elegir, f)} onCerrar={() => setElegir(null)} />
      )}
    </div>
  );
}
