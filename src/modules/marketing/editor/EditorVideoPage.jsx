import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Clapperboard, ArrowLeft, Loader2, AlertCircle, FolderOpen, RefreshCw, ExternalLink, Film,
  ImageOff, Sparkles, Send, CheckCircle2, Download, RotateCcw, Clock, MessageSquare,
} from "lucide-react";
import { listarSubcarpetas, listarFotosCarpeta } from "../../../services/driveService";
import { useVideoPedidos, ESTADOS_ACTIVOS } from "./useVideoPedidos";

// CONTENIDO en Drive: una subcarpeta por video (video principal + fotos que deben salir sí o sí).
const CONTENIDO_FOLDER_ID = "1XsRgtxFgGMfsA4FjyVk-gQs8CyipQGJh";
const CONTENIDO_URL = `https://drive.google.com/drive/folders/${CONTENIDO_FOLDER_ID}`;
const CARPETAS_EXCLUIDAS = ["BLOG"];

const SUGERENCIAS = [
  "Reel emotivo de unos 25 s.",
  "Que abra con un atardecer impactante.",
  "Que cada cosa que nombra tenga su imagen.",
  "Que cierre con una vista amplia del embalse.",
  "Tono alegre y familiar.",
];

const ESTADO_UI = {
  pendiente:          { texto: "En cola",               color: "text-amber-300",   fondo: "rgba(251,191,36,0.10)",  borde: "rgba(251,191,36,0.25)" },
  procesando:         { texto: "Editando",              color: "text-sky-300",     fondo: "rgba(56,189,248,0.10)",  borde: "rgba(56,189,248,0.25)" },
  revision_pedida:    { texto: "Cambio en cola",        color: "text-amber-300",   fondo: "rgba(251,191,36,0.10)",  borde: "rgba(251,191,36,0.25)" },
  borrador_listo:     { texto: "Borrador listo",        color: "text-emerald-300", fondo: "rgba(52,211,153,0.10)",  borde: "rgba(52,211,153,0.25)" },
  final_pedido:       { texto: "Final en cola",         color: "text-amber-300",   fondo: "rgba(251,191,36,0.10)",  borde: "rgba(251,191,36,0.25)" },
  renderizando_final: { texto: "Renderizando final",    color: "text-sky-300",     fondo: "rgba(56,189,248,0.10)",  borde: "rgba(56,189,248,0.25)" },
  listo:              { texto: "Listo para publicar",   color: "text-emerald-300", fondo: "rgba(52,211,153,0.15)",  borde: "rgba(52,211,153,0.35)" },
  error:              { texto: "Error",                 color: "text-red-300",     fondo: "rgba(239,68,68,0.10)",   borde: "rgba(239,68,68,0.25)" },
};

const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };

function Aviso({ children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// El resumen del editor viene en markdown sencillo: viñetas con "- " y **negritas**.
function TextoEditor({ texto }) {
  if (!texto) return null;
  const negritas = (linea) =>
    linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
      parte.startsWith("**") ? <strong key={i} className="text-gray-100">{parte.slice(2, -2)}</strong> : parte);
  return (
    <div className="space-y-1.5 text-sm text-gray-300 leading-relaxed">
      {texto.split("\n").filter((l) => l.trim()).map((linea, i) =>
        linea.trim().startsWith("- ") ? (
          <p key={i} className="pl-4 relative">
            <span className="absolute left-0 text-emerald-500">•</span>{negritas(linea.trim().slice(2))}
          </p>
        ) : (
          <p key={i}>{negritas(linea)}</p>
        ))}
    </div>
  );
}

function urlDescarga(url, titulo) {
  const nombre = `earthpark-${(titulo || "video").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.mp4`;
  return `${url.split("?")[0]}?download=${encodeURIComponent(nombre)}`;
}

function minutosDesde(fecha) {
  return (Date.now() - new Date(fecha).getTime()) / 60000;
}

// ── Formulario de pedido nuevo ─────────────────────────────────────────
function NuevoPedido({ onCrear }) {
  const [carpetas, setCarpetas] = useState([]);
  const [cargandoCarpetas, setCargandoCarpetas] = useState(true);
  const [errorCarpetas, setErrorCarpetas] = useState(null);
  const [carpeta, setCarpeta] = useState(null);
  const [contenido, setContenido] = useState([]);
  const [cargandoContenido, setCargandoContenido] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const cargarCarpetas = useCallback(() => {
    setCargandoCarpetas(true);
    setErrorCarpetas(null);
    listarSubcarpetas(CONTENIDO_FOLDER_ID)
      .then((cs) => setCarpetas(cs.filter((c) => !CARPETAS_EXCLUIDAS.includes(c.nombre)).sort((a, b) => b.nombre.localeCompare(a.nombre))))
      .catch((e) => setErrorCarpetas(e.message))
      .finally(() => setCargandoCarpetas(false));
  }, []);

  useEffect(cargarCarpetas, [cargarCarpetas]);

  useEffect(() => {
    if (!carpeta) return;
    setCargandoContenido(true);
    listarFotosCarpeta(carpeta.id)
      .then(setContenido)
      .catch(() => setContenido([]))
      .finally(() => setCargandoContenido(false));
  }, [carpeta]);

  const videos = contenido.filter((a) => a.mimeType.startsWith("video/"));
  const fotos = contenido.filter((a) => a.mimeType.startsWith("image/"));
  const listo = carpeta && videos.length > 0 && !cargandoContenido;

  function agregarSugerencia(s) {
    setDescripcion((d) => (d.trim() ? `${d.trim()} ${s}` : s));
  }

  async function enviar() {
    setEnviando(true);
    setErrorEnvio(null);
    const res = await onCrear({ titulo, carpeta, descripcion });
    setEnviando(false);
    if (res.error) setErrorEnvio(res.error);
    else {
      setCarpeta(null);
      setTitulo("");
      setDescripcion("");
      setContenido([]);
    }
  }

  return (
    <section className="rounded-2xl p-5 space-y-5" style={tarjeta}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <h2 className="text-base font-semibold text-white">Nuevo video</h2>
      </div>

      {/* Paso 1: carpeta */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-300"><span className="text-emerald-400 font-semibold">1.</span> Escoge la carpeta del video</p>
          <div className="flex gap-2">
            <button onClick={cargarCarpetas}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition px-3 py-1.5 rounded-lg border border-gray-700">
              <RefreshCw className={`w-3.5 h-3.5 ${cargandoCarpetas ? "animate-spin" : ""}`} /> Actualizar
            </button>
            <a href={CONTENIDO_URL} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition px-3 py-1.5 rounded-lg border border-emerald-700/50">
              <ExternalLink className="w-3.5 h-3.5" /> Crear carpeta en Drive
            </a>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          En Drive, dentro de CONTENIDO, crea una carpeta por video y sube ahí el video principal y las fotos que deben salir sí o sí.
          Luego dale a Actualizar.
        </p>

        {errorCarpetas && <Aviso>No se pudieron cargar las carpetas: {errorCarpetas}</Aviso>}
        {cargandoCarpetas ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Cargando carpetas...</div>
        ) : carpetas.length === 0 && !errorCarpetas ? (
          <p className="text-sm text-gray-500 py-2">Todavía no hay carpetas de video en CONTENIDO.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {carpetas.map((c) => {
              const activa = carpeta?.id === c.id;
              return (
                <button key={c.id} onClick={() => setCarpeta(c)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    activa ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-gray-400 border border-gray-700 hover:bg-gray-800/50 hover:text-gray-200"}`}>
                  <FolderOpen className="w-3.5 h-3.5" /> {c.nombre}
                </button>
              );
            })}
          </div>
        )}

        {carpeta && (
          cargandoContenido ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" /> Revisando la carpeta...</div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                {videos.length} video{videos.length === 1 ? "" : "s"} · {fotos.length} foto{fotos.length === 1 ? "" : "s"}
                {videos.length > 1 && " · el más largo será el video principal"}
              </p>
              {videos.length === 0 && <Aviso>Esta carpeta no tiene video. Sube el video principal a la carpeta en Drive y dale a Actualizar.</Aviso>}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {contenido.map((a) => (
                  <div key={a.id} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-800/60">
                    {a.urlMiniatura
                      ? <img src={a.urlMiniatura} alt={a.nombre} loading="lazy" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-600" /></div>}
                    {a.mimeType.startsWith("video/") && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/70 text-white flex items-center gap-1">
                        <Film className="w-2.5 h-2.5" /> VIDEO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Paso 2: descripción */}
      <div className="space-y-3">
        <p className="text-sm text-gray-300"><span className="text-emerald-400 font-semibold">2.</span> Describe cómo quieres que quede</p>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (opcional), ej. Reel cascada octubre"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 bg-black/30 border border-gray-700 focus:border-emerald-500/60 focus:outline-none" />
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4}
          placeholder="Ej. Reel emotivo de Oscar invitando al Valle de Tenza. Que abra con un atardecer y cierre con el embalse. Usa la foto de la cascada que subí."
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 bg-black/30 border border-gray-700 focus:border-emerald-500/60 focus:outline-none resize-y" />
        <div className="flex gap-2 flex-wrap">
          {SUGERENCIAS.map((s) => (
            <button key={s} onClick={() => agregarSugerencia(s)}
              className="text-[11px] px-2.5 py-1 rounded-full text-gray-400 border border-gray-700 hover:text-emerald-300 hover:border-emerald-700/60 transition">
              + {s}
            </button>
          ))}
        </div>
      </div>

      {errorEnvio && <Aviso>No se pudo crear el pedido: {errorEnvio}</Aviso>}
      <button onClick={enviar} disabled={!listo || enviando}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-emerald-950">
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
        Editar video
      </button>
      <p className="text-[11px] text-gray-600">El editor corre en el PC del parque: debe estar encendido con el editor abierto. Un video nuevo tarda unos 4 minutos.</p>
    </section>
  );
}

// ── Tarjeta de un pedido ───────────────────────────────────────────────
function PedidoCard({ pedido, pedirCambio, aprobar, reintentar }) {
  const [cambio, setCambio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const ui = ESTADO_UI[pedido.estado] ?? ESTADO_UI.pendiente;
  const activo = ESTADOS_ACTIVOS.includes(pedido.estado);
  const enColaHaceRato = ["pendiente", "revision_pedida", "final_pedido"].includes(pedido.estado) && minutosDesde(pedido.actualizado_en) > 2;
  const video = pedido.estado === "listo" ? pedido.final_url : pedido.borrador_url;
  const revisiones = pedido.revisiones ?? [];

  async function accion(fn) {
    setEnviando(true);
    setErrorAccion(null);
    const res = await fn();
    setEnviando(false);
    if (res.error) setErrorAccion(res.error);
    return res;
  }

  return (
    <article className="rounded-2xl p-5 space-y-4" style={tarjeta}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white truncate">{pedido.titulo || pedido.carpeta_nombre}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <FolderOpen className="w-3 h-3" /> {pedido.carpeta_nombre}
            <span>·</span>
            {new Date(pedido.creado_en).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
            {Number(pedido.costo_usd) > 0 && <><span>·</span> USD {Number(pedido.costo_usd).toFixed(2)}</>}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ui.color}`}
          style={{ background: ui.fondo, border: `1px solid ${ui.borde}` }}>
          {activo && <Loader2 className="w-3 h-3 animate-spin" />}
          {pedido.estado === "listo" && <CheckCircle2 className="w-3 h-3" />}
          {ui.texto}
        </span>
      </div>

      {activo && (
        <div className="space-y-1">
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" /> {pedido.progreso || "Esperando al editor..."}
          </p>
          {enColaHaceRato && (
            <p className="text-xs text-amber-400/80">Lleva más de 2 minutos en cola. ¿Está encendido el PC con el editor abierto (iniciar-editor.cmd)?</p>
          )}
        </div>
      )}

      {pedido.estado === "error" && (
        <div className="space-y-2">
          <Aviso>{pedido.error}</Aviso>
          <button onClick={() => accion(() => reintentar(pedido))} disabled={enviando}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-emerald-300 transition px-3 py-1.5 rounded-lg border border-gray-700">
            <RotateCcw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {video && (
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <video key={video} src={video} controls playsInline preload="metadata"
              className="w-[260px] aspect-[9/16] rounded-xl bg-black object-contain" />
            {pedido.estado === "listo" && (
              <a href={urlDescarga(pedido.final_url, pedido.titulo)}
                className="mt-3 w-[260px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition">
                <Download className="w-4 h-4" /> Descargar MP4
              </a>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {pedido.descripcion && (
              <p className="text-xs text-gray-500 italic">Pediste: “{pedido.descripcion}”</p>
            )}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-gray-500">Lo que hizo el editor</p>
              <TextoEditor texto={pedido.resumen} />
            </div>

            {revisiones.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-gray-500">Cambios</p>
                {revisiones.map((r, i) => (
                  <div key={i} className="space-y-1 text-sm">
                    <p className="text-gray-200 flex gap-2"><MessageSquare className="w-3.5 h-3.5 mt-1 text-emerald-500 flex-shrink-0" /> {r.texto}</p>
                    {r.respuesta ? <div className="pl-5"><TextoEditor texto={r.respuesta} /></div>
                      : <p className="pl-5 text-xs text-gray-500">Aplicando...</p>}
                  </div>
                ))}
              </div>
            )}

            {pedido.estado === "borrador_listo" && (
              <div className="space-y-3 pt-1">
                <textarea value={cambio} onChange={(e) => setCambio(e.target.value)} rows={2}
                  placeholder="¿Qué cambiarías? Ej. Cambia la foto del segundo 16 por una de la cascada; subtítulos más grandes."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 bg-black/30 border border-gray-700 focus:border-emerald-500/60 focus:outline-none resize-y" />
                <div className="flex gap-2 flex-wrap">
                  <button disabled={!cambio.trim() || enviando}
                    onClick={async () => { const r = await accion(() => pedirCambio(pedido, cambio)); if (!r.error) setCambio(""); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-700/60 text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send className="w-4 h-4" /> Pedir cambio
                  </button>
                  <button disabled={enviando} onClick={() => accion(() => aprobar(pedido))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition disabled:opacity-40">
                    <CheckCircle2 className="w-4 h-4" /> Me gusta, hacer versión final
                  </button>
                </div>
              </div>
            )}
            {errorAccion && <Aviso>{errorAccion}</Aviso>}
          </div>
        </div>
      )}
    </article>
  );
}

export default function EditorVideoPage() {
  const { pedidos, loading, error, crear, pedirCambio, aprobar, reintentar } = useVideoPedidos();

  return (
    <div className="pt-16 pb-24 lg:pt-8 lg:pb-8 min-h-screen px-4 lg:px-8"
      style={{ background: "linear-gradient(135deg, #050d03 0%, #091806 50%, #060f04 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(77,142,30,0.15)", border: "1px solid rgba(77,142,30,0.25)" }}>
            <Clapperboard className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">Editor de video</h1>
            <p className="text-xs text-gray-500">Reels listos para publicar: voz mejorada, fotos del parque y subtítulos</p>
          </div>
          <Link to="/marketing"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition px-3 py-1.5 rounded-lg border border-gray-700">
            <ArrowLeft className="w-3.5 h-3.5" /> Marketing
          </Link>
        </div>

        <NuevoPedido onCrear={crear} />

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-emerald-400" /> Mis videos
          </h2>
          {error && <Aviso>No se pudieron cargar los videos: {error}</Aviso>}
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Todavía no has pedido ningún video.</p>
          ) : (
            pedidos.map((p) => (
              <PedidoCard key={p.id} pedido={p} pedirCambio={pedirCambio} aprobar={aprobar} reintentar={reintentar} />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
