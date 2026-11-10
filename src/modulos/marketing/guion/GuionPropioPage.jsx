// Video con guion propio: pegas un guion (tiempos, locución, texto en pantalla), eliges fotos reales
// para cada escena, se genera la voz, se agrega música y se descarga en 9:16 y 16:9.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Mic, Music, Download, Plus, Trash2, Wand2, Save, FileText, X, ImagePlus, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { listarVoces, generarVoz, contextoAudio } from "../animado/voz";
import { exportarVideo } from "../animado/exportar";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { useAgenteHistorial } from "../agente/useAgenteHistorial";
import ElegirFoto from "../../comercial/ElegirFoto";
import { urlFoto, cargarEmpresa } from "../../comercial/datos";
import { completarEmpresa } from "../../comercial/empresa";
import { armarLinea, vozVigente, aReloj, aSegundos } from "./linea";
import { dibujarFrameGuion, FORMATOS } from "./motorGuion";
import { mezclar, leerMusica } from "./audio";
import { promptOrdenarGuion } from "./guionPrompt";
import { PROMO_HOLLYWOOD, PROYECTO_VACIO } from "./plantillas";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const MODEL = "claude-sonnet-4-5";
const BASE = import.meta.env.BASE_URL || "/";
const MODO = "guion_propio";
const campo = "w-full bg-black/30 border border-emerald-900/60 rounded-lg px-2.5 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-lime-400/60";
const leer = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

async function cargarImagen(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Imagen ${r.status}`);
  return createImageBitmap(await r.blob());
}

export default function GuionPropioPage() {
  const [proyecto, setProyecto] = useState(() => structuredClone(PROMO_HOLLYWOOD));
  const [formato, setFormato] = useState(leer("ep_guion_formato", "vertical"));
  const [voces, setVoces] = useState([]);
  const [vozId, setVozId] = useState(leer("ep_voz", ""));
  const [musica, setMusica] = useState(null); // { buffer, nombre }
  const [volumen, setVolumen] = useState(Number(leer("ep_guion_vol", "0.35")));
  const [subtitulos, setSubtitulos] = useState(leer("ep_guion_subs", "0") === "1");
  const [imagenes] = useState(() => new Map());
  const [versionImg, setVersionImg] = useState(0);
  const [base, setBase] = useState({ logo: null, mariposa: null, contacto: [] });
  const [t, setT] = useState(1.5);
  const [sonando, setSonando] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [eligiendo, setEligiendo] = useState(null); // índice de escena
  const [pegando, setPegando] = useState(false);
  const [filaId, setFilaId] = useState(null);
  const canvasRef = useRef(null);
  const reproRef = useRef(null);
  const { items, guardar, actualizar, borrar } = useAgenteHistorial();
  const guardados = items.filter((i) => i.modo === MODO);

  useEffect(() => { escribir("ep_guion_formato", formato); }, [formato]);
  useEffect(() => { if (vozId) escribir("ep_voz", vozId); }, [vozId]);
  useEffect(() => { escribir("ep_guion_vol", String(volumen)); }, [volumen]);
  useEffect(() => { escribir("ep_guion_subs", subtitulos ? "1" : "0"); }, [subtitulos]);

  // Voces, logo, mariposa, contacto y fuentes
  useEffect(() => {
    listarVoces().then(({ voces: vs, porDefecto }) => {
      setVoces(vs || []);
      setVozId((a) => ((vs || []).some((v) => v.id === a) ? a : porDefecto || vs?.[0]?.id || ""));
    }).catch(() => {});
    (async () => {
      const [logo, mariposa, empresa] = await Promise.all([
        cargarImagen(`${BASE}logo-earth-park.png`).catch(() => null),
        cargarImagen(`${BASE}cotizacion/animal-5.png`).catch(() => null),
        cargarEmpresa().catch(() => null),
      ]);
      const c = completarEmpresa(empresa || {}).contacto;
      setBase({ logo, mariposa, contacto: [c.whatsapp && `WhatsApp ${c.whatsapp}`, c.instagram && `Instagram ${c.instagram}`, c.web].filter(Boolean) });
      await Promise.all(['76px "Bree Serif"', "600 46px Outfit", "40px Outfit"].map((f) => document.fonts?.load(f).catch(() => null)));
      setVersionImg((v) => v + 1);
    })();
  }, []);

  // Cargar las fotos que falten
  useEffect(() => {
    const refs = [...new Set(proyecto.escenas.flatMap((e) => e.fotos || []).filter(Boolean))].filter((r) => !imagenes.has(r));
    if (!refs.length) return;
    refs.forEach((r) => imagenes.set(r, null));
    Promise.all(refs.map(async (r) => { try { imagenes.set(r, await cargarImagen(urlFoto(r))); } catch { imagenes.delete(r); } }))
      .then(() => setVersionImg((v) => v + 1));
  }, [proyecto, imagenes]);

  const vigentes = proyecto.escenas.map((e) => vozVigente(e, e.voz, vozId));
  const linea = useMemo(() => armarLinea(proyecto, vigentes), [proyecto, vozId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dims = FORMATOS[formato];
  const rec = useMemo(() => ({ W: dims.ancho, H: dims.alto, imagenes, logo: base.logo, mariposa: base.mariposa, contacto: base.contacto, cta: proyecto.cta, subtitulos }),
    [dims, imagenes, base, proyecto.cta, subtitulos, versionImg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dibujar la vista previa cuando no está sonando
  useEffect(() => {
    if (sonando) return;
    const c = canvasRef.current;
    if (!c) return;
    c.width = dims.ancho;
    c.height = dims.alto;
    dibujarFrameGuion(c.getContext("2d"), linea, Math.min(t, linea.total - 0.01), rec);
  }, [linea, rec, t, sonando, dims]);

  const detener = useCallback(() => {
    const r = reproRef.current;
    if (r) { try { r.fuente.stop(); } catch { /* ya paró */ } cancelAnimationFrame(r.raf); }
    reproRef.current = null;
    setSonando(false);
  }, []);
  useEffect(() => detener, [detener]);

  const reproducir = async () => {
    if (sonando) { detener(); return; }
    setError("");
    try {
      const ac = contextoAudio();
      await ac.resume();
      const pista = await mezclar(linea, musica?.buffer, volumen);
      const fuente = ac.createBufferSource();
      fuente.buffer = pista;
      fuente.connect(ac.destination);
      const desde = t >= linea.total - 0.1 ? 0 : t;
      const t0 = ac.currentTime + 0.05;
      fuente.start(t0, desde);
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      const paso = () => {
        const ahora = desde + Math.max(0, ac.currentTime - t0);
        if (ahora >= linea.total) { setT(linea.total); detener(); return; }
        dibujarFrameGuion(ctx, linea, ahora, rec);
        setT(ahora);
        reproRef.current.raf = requestAnimationFrame(paso);
      };
      reproRef.current = { fuente, raf: 0 };
      setSonando(true);
      paso();
    } catch (e) { setError(e.message); }
  };

  // ── Edición ──
  const cambiarEscena = (i, parche) => setProyecto((p) => ({ ...p, escenas: p.escenas.map((e, j) => (j === i ? { ...e, ...parche } : e)) }));
  const quitarFoto = (i, k) => cambiarEscena(i, { fotos: proyecto.escenas[i].fotos.filter((_, z) => z !== k) });
  const agregarEscena = () => setProyecto((p) => {
    const escenas = [...p.escenas];
    const ultima = escenas[escenas.length - 1];
    const pos = ultima?.cierre ? escenas.length - 1 : escenas.length;
    const antes = escenas[pos - 1];
    const desde = antes ? antes.hasta : "00:00";
    escenas.splice(pos, 0, { desde, hasta: aReloj(aSegundos(desde) + 6), toma: "", locucion: "", texto: "", fotos: [] });
    return { ...p, escenas };
  });
  const borrarEscena = (i) => setProyecto((p) => ({ ...p, escenas: p.escenas.filter((_, j) => j !== i) }));

  const generarVoces = async () => {
    if (!vozId) { setError("Elige una voz"); return; }
    setError("");
    setOcupado("voz");
    try {
      const escenas = [...proyecto.escenas];
      for (let i = 0; i < escenas.length; i++) {
        const texto = (escenas[i].locucion || "").trim();
        if (!texto || vozVigente(escenas[i], escenas[i].voz, vozId)) continue;
        setAviso(`Generando la voz de la escena ${i + 1} de ${escenas.length}…`);
        const v = await generarVoz(texto, vozId, { anterior: escenas[i - 1]?.locucion, siguiente: escenas[i + 1]?.locucion });
        escenas[i] = { ...escenas[i], voz: { texto, voiceId: vozId, audio: v.audio, palabras: v.palabras, dur: v.dur } };
        setProyecto((p) => ({ ...p, escenas: p.escenas.map((e, j) => (j === i ? escenas[i] : e)) }));
      }
      setAviso("Voces listas");
      await guardarProyecto({ ...proyecto, escenas }, true);
    } catch (e) { setError(`Voz: ${e.message}`); setAviso(""); }
    setOcupado("");
  };

  const guardarProyecto = async (p = proyecto, silencioso = false) => {
    if (filaId) await actualizar(filaId, p);
    else { const fila = await guardar(MODO, p.titulo, p); if (fila) setFilaId(fila.id); }
    if (!silencioso) { setAviso("Guardado"); setTimeout(() => setAviso(""), 2000); }
  };

  const abrir = (fila) => { detener(); setProyecto(structuredClone(fila.resultado)); setFilaId(fila.id); setT(0); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const nuevoDesde = (plantilla) => { detener(); setProyecto(structuredClone(plantilla)); setFilaId(null); setT(0); };

  const ordenarConIA = async (texto) => {
    setOcupado("ia");
    setError("");
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: "user", content: promptOrdenarGuion(texto) }] }),
      });
      if (!res.ok) throw new Error(`Servidor ${res.status}`);
      const data = await res.json();
      const g = extraerObjetoJSON((data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
      if (!g?.escenas?.length) throw new Error("No se pudo leer el guion. Revisa que tenga locución por escena.");
      nuevoDesde({ titulo: g.titulo || "Video", cta: g.cta || "Reserva tu cupo", musica_sugerida: g.musica_sugerida || "", escenas: g.escenas.map((e) => ({ ...e, fotos: [] })) });
      setPegando(false);
      setAviso("Guion listo. Ahora elige las fotos de cada escena.");
    } catch (e) { setError(e.message); }
    setOcupado("");
  };

  const exportar = async (clave) => {
    detener();
    setError("");
    setOcupado(`exp-${clave}`);
    setProgreso(0);
    try {
      const f = FORMATOS[clave];
      const pista = await mezclar(linea, musica?.buffer, volumen);
      const recExp = { ...rec, W: f.ancho, H: f.alto };
      const r = await exportarVideo(linea, pista, setProgreso, { dibujar: (ctx, g, tt) => dibujarFrameGuion(ctx, g, tt, recExp), ancho: f.ancho, alto: f.alto });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.blob);
      a.download = `${proyecto.titulo || "video"} - ${clave === "vertical" ? "9x16" : "16x9"}.${r.extension}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { setError(`Exportar: ${e.message}`); }
    setOcupado("");
  };

  const sinVoz = proyecto.escenas.filter((e, i) => e.locucion?.trim() && !vigentes[i]).length;
  const sinFoto = proyecto.escenas.filter((e) => !(e.fotos || []).length).length;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-2 mb-1">
        <Link to="/marketing" className="btn-ghost !px-2"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Video con guion propio</h1>
      </div>
      <p className="text-sm text-gray-400 mb-4">Pega el guion, elige fotos reales para cada escena y descárgalo vertical y horizontal.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => nuevoDesde(PROMO_HOLLYWOOD)} className="btn-secondary !py-2 !px-3 text-sm">Ejemplo: Promo Hollywood Boyacense</button>
        <button onClick={() => setPegando(true)} className="btn-secondary !py-2 !px-3 text-sm flex items-center gap-1.5"><FileText className="w-4 h-4" /> Pegar otro guion</button>
        <button onClick={() => nuevoDesde(PROYECTO_VACIO)} className="btn-ghost text-sm">En blanco</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Escenas */}
        <div className="space-y-3 order-2 lg:order-1 min-w-0">
          <div className="glass-card p-4">
            <label className="block"><span className="text-xs text-gray-400">Título</span>
              <input className={campo} value={proyecto.titulo || ""} onChange={(e) => setProyecto({ ...proyecto, titulo: e.target.value })} /></label>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <label className="block"><span className="text-xs text-gray-400">Botón final</span>
                <input className={campo} value={proyecto.cta || ""} onChange={(e) => setProyecto({ ...proyecto, cta: e.target.value })} /></label>
              {proyecto.musica_sugerida && <p className="text-xs text-gray-400 self-end"><Music className="w-3.5 h-3.5 inline mr-1" />Música sugerida: {proyecto.musica_sugerida}</p>}
            </div>
          </div>

          {proyecto.escenas.map((e, i) => {
            const lin = linea.escenas[i];
            const alargada = lin && lin.duracion > aSegundos(e.hasta) - aSegundos(e.desde) + 0.05;
            return (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-bold text-lime-300">{e.cierre ? "Cierre" : `Escena ${i + 1}`}</span>
                  <input className={`${campo} !w-20 !py-1 text-center`} value={e.desde} onChange={(x) => cambiarEscena(i, { desde: x.target.value })} aria-label="Desde" />
                  <span className="text-gray-500">→</span>
                  <input className={`${campo} !w-20 !py-1 text-center`} value={e.hasta} onChange={(x) => cambiarEscena(i, { hasta: x.target.value })} aria-label="Hasta" />
                  {lin && <span className="text-xs text-gray-500">en el video: {aReloj(lin.inicio)}–{aReloj(lin.inicio + lin.duracion)}{alargada ? " (se alargó para que quepa la voz)" : ""}</span>}
                  <span className="flex-1" />
                  <label className="flex items-center gap-1 text-xs text-gray-400"><input type="checkbox" className="accent-lime-400" checked={!!e.cierre} onChange={(x) => cambiarEscena(i, { cierre: x.target.checked })} /> Cierre con logo</label>
                  <button onClick={() => borrarEscena(i)} className="p-1.5 text-gray-500 hover:text-red-400" aria-label="Borrar escena"><Trash2 className="w-4 h-4" /></button>
                </div>
                {e.toma && <p className="text-xs text-gray-400 mb-2 italic">Toma: {e.toma}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block"><span className="text-xs text-gray-400">Locución {vigentes[i] ? <span className="text-lime-400">· voz lista</span> : e.locucion?.trim() ? <span className="text-amber-300">· falta voz</span> : null}</span>
                    <textarea rows={3} className={campo} value={e.locucion || ""} onChange={(x) => cambiarEscena(i, { locucion: x.target.value })} /></label>
                  <label className="block"><span className="text-xs text-gray-400">Texto en pantalla</span>
                    <textarea rows={3} className={campo} value={e.texto || ""} onChange={(x) => cambiarEscena(i, { texto: x.target.value })} /></label>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(e.fotos || []).map((ref, k) => (
                    <div key={`${ref}${k}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-emerald-900/60">
                      <img src={urlFoto(ref)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => quitarFoto(i, k)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5" aria-label="Quitar foto"><X className="w-3.5 h-3.5 text-white" /></button>
                    </div>
                  ))}
                  {(e.fotos || []).length < 3 && (
                    <button onClick={() => setEligiendo(i)} className="w-20 h-20 rounded-lg border border-dashed border-emerald-700 text-emerald-300 flex flex-col items-center justify-center text-[11px] gap-1">
                      <ImagePlus className="w-5 h-5" /> Foto
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={agregarEscena} className="btn-secondary !py-2 text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar escena</button>

          {guardados.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-sm font-semibold text-white mb-2">Guardados</p>
              <div className="space-y-1">
                {guardados.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => abrir(g)} className="flex-1 text-left text-gray-200 hover:text-lime-300 truncate">{g.tema || g.resultado?.titulo}</button>
                    <span className="text-xs text-gray-500">{new Date(g.creado_at).toLocaleDateString("es-CO")}</span>
                    <button onClick={() => borrar(g.id)} className="p-1 text-gray-500 hover:text-red-400" aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vista previa y controles */}
        <aside className="glass-card p-4 space-y-3 order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="flex gap-2">
            {Object.entries(FORMATOS).map(([k, f]) => (
              <button key={k} onClick={() => setFormato(k)} className={`flex-1 text-sm py-1.5 rounded-lg border ${formato === k ? "border-lime-400 text-lime-300 bg-lime-400/10" : "border-white/10 text-gray-400"}`}>{f.nombre}</button>
            ))}
          </div>
          <div className="flex justify-center bg-black rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className={formato === "vertical" ? "h-[58vh] max-h-[560px] w-auto" : "w-full h-auto"} style={{ aspectRatio: `${dims.ancho}/${dims.alto}` }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reproducir} className="p-2 rounded-full bg-lime-400 text-emerald-950" aria-label={sonando ? "Pausar" : "Reproducir"}>{sonando ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
            <input type="range" min={0} max={linea.total} step={0.05} value={Math.min(t, linea.total)} onChange={(e) => { detener(); setT(Number(e.target.value)); }} className="flex-1 accent-lime-400" />
            <span className="text-xs text-gray-400 w-20 text-right">{aReloj(t)} / {aReloj(linea.total)}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <label className="block"><span className="text-xs text-gray-400">Voz del narrador</span>
              <select className={campo} value={vozId} onChange={(e) => setVozId(e.target.value)}>
                {voces.map((v) => <option key={v.id} value={v.id}>{v.nombre || v.name}</option>)}
              </select></label>
            <button onClick={generarVoces} disabled={!!ocupado || !sinVoz} className="btn-secondary !py-2 !px-3 text-sm flex items-center gap-1.5 disabled:opacity-40">
              {ocupado === "voz" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} {sinVoz ? `Voz (${sinVoz})` : "Voz lista"}
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-400">Música de fondo (MP3 o M4A que tengas permiso de usar)</span>
            <div className="flex items-center gap-2 mt-1">
              <label className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0">
                <Music className="w-3.5 h-3.5" /> {musica ? "Cambiar" : "Cargar"}
                <input type="file" accept="audio/*" className="hidden" onChange={async (e) => {
                  const a = e.target.files?.[0];
                  if (!a) return;
                  try { setMusica({ buffer: await leerMusica(a), nombre: a.name }); } catch { setError("No se pudo leer ese audio"); }
                }} />
              </label>
              <span className="text-xs text-gray-300 truncate flex-1">{musica?.nombre || "Sin música"}</span>
              {musica && <button onClick={() => setMusica(null)} className="p-1 text-gray-500" aria-label="Quitar música"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {musica && <input type="range" min={0} max={1} step={0.05} value={volumen} onChange={(e) => setVolumen(Number(e.target.value))} className="w-full accent-lime-400 mt-1" aria-label="Volumen de la música" />}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" className="accent-lime-400" checked={subtitulos} onChange={(e) => setSubtitulos(e.target.checked)} /> Subtítulos de la locución
          </label>

          {(sinFoto > 0 || sinVoz > 0) && (
            <p className="text-xs text-amber-300">{[sinFoto && `${sinFoto} escena(s) sin foto`, sinVoz && `${sinVoz} sin voz`].filter(Boolean).join(" · ")}</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {aviso && !error && <p className="text-xs text-lime-300">{aviso}</p>}

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FORMATOS).map(([k, f]) => (
              <button key={k} onClick={() => exportar(k)} disabled={!!ocupado} className="bg-lime-400 text-emerald-950 font-semibold text-sm rounded-xl py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-40">
                {ocupado === `exp-${k}` ? `${Math.round(progreso * 100)} %` : <><Download className="w-4 h-4" /> {k === "vertical" ? "9:16" : "16:9"}</>}
              </button>
            ))}
          </div>
          <button onClick={() => guardarProyecto()} className="btn-ghost w-full text-sm flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Guardar proyecto</button>
          <p className="text-[11px] text-gray-500">La música no se guarda con el proyecto: vuelve a cargarla antes de descargar.</p>
        </aside>
      </div>

      {eligiendo !== null && (
        <ElegirFoto titulo={`Foto para la escena ${eligiendo + 1}`}
          onElegir={(ref) => { cambiarEscena(eligiendo, { fotos: [...(proyecto.escenas[eligiendo].fotos || []), ref] }); setEligiendo(null); }}
          onCerrar={() => setEligiendo(null)} />
      )}
      {pegando && <PegarGuion ocupado={ocupado === "ia"} onListo={ordenarConIA} onCerrar={() => setPegando(false)} />}
    </div>
  );
}

function PegarGuion({ ocupado, onListo, onCerrar }) {
  const [texto, setTexto] = useState("");
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-2xl h-[100dvh] sm:h-auto flex flex-col sm:rounded-2xl p-4 gap-3 safe-area-top safe-area-bottom"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-base font-bold text-white">Pegar un guion</p>
            <p className="text-xs text-gray-400">Como venga: tabla, Word o texto. La IA solo lo ordena en escenas, no cambia lo que dice.</p>
          </div>
          <button onClick={onCerrar} className="text-gray-300 p-2 -m-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
        </div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={14} className={`${campo} flex-1 sm:flex-none`} placeholder="00:00 - 00:06 · Toma… · Locución… · Texto en pantalla…" />
        <button onClick={() => onListo(texto)} disabled={!texto.trim() || ocupado} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40">
          {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Ordenar en escenas
        </button>
      </div>
    </div>,
    document.body,
  );
}
