import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot, ArrowLeft, Loader2, AlertCircle, Sparkles, Copy, Check,
  LayoutGrid, MessageCircle, Compass, Trash2, History, Globe,
} from "lucide-react";
import { MODOS } from "./agentePrompts";
import { llamarAgente } from "./agenteApi";
import { useAgenteHistorial } from "./useAgenteHistorial";
import CarruselVisual from "./CarruselVisual";
import { obtenerCategorias } from "./fotosCarrusel";

const ICONOS = { carrusel: LayoutGrid, historias: MessageCircle, estrategia: Compass };
const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };

/* ─── Utilidades de UI ─────────────────────────────────────── */
function CopiarBtn({ texto, label = "Copiar" }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-md border border-emerald-700/40"
    >
      {ok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {ok ? "Copiado" : label}
    </button>
  );
}

// *palabra* → resaltada (mismo convenio que las plantillas de video)
function Resaltado({ texto }) {
  if (!texto) return null;
  return texto.split(/(\*[^*]+\*)/g).map((p, i) =>
    p.startsWith("*") && p.endsWith("*") && p.length > 2
      ? <span key={i} className="text-emerald-300">{p.slice(1, -1)}</span>
      : <span key={i}>{p}</span>);
}

// Markdown sencillo: ##, ###, viñetas, **negritas** y enlaces
function Markdown({ texto }) {
  const inline = (l) =>
    l.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g).map((p, i) => {
      if (p.startsWith("**")) return <strong key={i} className="text-gray-100">{p.slice(2, -2)}</strong>;
      const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) return <a key={i} href={m[2]} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{m[1]}</a>;
      if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="text-emerald-400 underline break-all">{p}</a>;
      return p;
    });
  return (
    <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
      {texto.split("\n").map((l, i) => {
        const t = l.trim();
        if (!t) return null;
        if (t.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold text-white pt-2">{inline(t.slice(4))}</h4>;
        if (t.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-emerald-300 pt-4">{inline(t.slice(3))}</h3>;
        if (t.startsWith("# ")) return <h2 key={i} className="text-lg font-bold text-white pt-2">{inline(t.slice(2))}</h2>;
        if (/^[-*] /.test(t)) return <p key={i} className="pl-4 relative"><span className="absolute left-0 text-emerald-500">•</span>{inline(t.slice(2))}</p>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

/* ─── Resultados por modo ──────────────────────────────────── */
function ResultadoCarrusel({ r, nuevo }) {
  const caption = `${r.caption || ""}\n\n${(r.hashtags || []).join(" ")}`.trim();
  return (
    <div className="space-y-5">
      {r.hooks_alternativos?.length > 0 && (
        <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Hooks alternativos</p>
          {r.hooks_alternativos.map((h, i) => <p key={i} className="text-sm text-gray-200">{i + 1}. {h}</p>)}
        </div>
      )}
      <CarruselVisual carrusel={r} autoIA={nuevo} />
      <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Caption + hashtags</p>
          <CopiarBtn texto={caption} />
        </div>
        <p className="text-sm text-gray-200 whitespace-pre-line">{r.caption}</p>
        <p className="text-xs text-emerald-300/80">{(r.hashtags || []).join(" ")}</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
          {r.palabra_comentar && <span>💬 Palabra para comentar: <b className="text-white">{r.palabra_comentar}</b></span>}
          {r.mejor_momento && <span>🕒 Publicar: <b className="text-white">{r.mejor_momento}</b></span>}
        </div>
      </div>
    </div>
  );
}

function ResultadoHistorias({ r }) {
  return (
    <div className="space-y-5">
      {r.palabraClave && (
        <p className="text-sm text-gray-300">Palabra clave para DM: <b className="text-emerald-300 text-base">{r.palabraClave}</b></p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {(r.historias || []).map((h, i) => (
          <div key={i} className="rounded-xl p-3 flex flex-col gap-2 aspect-[9/16]" style={tarjeta}>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">{i + 1} · {h.tipo}</span>
            <p className="text-sm font-semibold text-white leading-snug">{h.texto}</p>
            {h.subtexto && <p className="text-[11px] text-gray-400">{h.subtexto}</p>}
            {h.sticker && <p className="text-[10px] px-2 py-1 rounded-md bg-emerald-900/40 text-emerald-200">🏷️ {h.sticker}</p>}
            {h.foto && <p className="mt-auto text-[10px] text-gray-500 italic">📷 {h.foto}</p>}
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {r.respuesta_dm && (
          <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-400 uppercase">Respuesta automática al DM</p>
              <CopiarBtn texto={r.respuesta_dm} />
            </div>
            <p className="text-sm text-gray-200 whitespace-pre-line">{r.respuesta_dm}</p>
          </div>
        )}
        {r.seguimientos?.length > 0 && (
          <div className="rounded-xl p-4 space-y-2" style={tarjeta}>
            <p className="text-xs font-semibold text-emerald-400 uppercase">Mensajes de seguimiento</p>
            {r.seguimientos.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-200">{i + 1}. {s}</p><CopiarBtn texto={s} />
              </div>
            ))}
          </div>
        )}
      </div>
      {r.destacada && <p className="text-xs text-gray-400">⭐ Guardar en la destacada: <b className="text-white">{r.destacada}</b></p>}
    </div>
  );
}

function Resultado({ modo, resultado, nuevo }) {
  if (modo === "carrusel") return <ResultadoCarrusel r={resultado} nuevo={nuevo} />;
  if (modo === "historias") return <ResultadoHistorias r={resultado} />;
  const md = resultado?.markdown || "";
  return (
    <div className="rounded-xl p-5 space-y-3" style={tarjeta}>
      <div className="flex justify-end"><CopiarBtn texto={md} label="Copiar todo" /></div>
      <Markdown texto={md} />
    </div>
  );
}

/* ─── Página ───────────────────────────────────────────────── */
export default function AgentePage() {
  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const [modoId, setModoId] = useState("carrusel");
  const [tema, setTema] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [actual, setActual] = useState(null); // { modo, tema, resultado }
  const { items: todos, guardar, borrar } = useAgenteHistorial();
  const items = todos.filter((i) => MODOS[i.modo]); // los guiones de video se ven en su propia página

  const modo = MODOS[modoId];

  const generar = async () => {
    if (!workerUrl) { setError("VITE_WORKER_URL no está configurada."); return; }
    setCargando(true); setError(null); setActual(null);
    try {
      const ctx = {};
      if (modoId === "carrusel") ctx.categorias = (await obtenerCategorias()).map((c) => c.nombre);
      const salida = await llamarAgente(workerUrl, modo, tema, ctx);
      const resultado = modo.formato === "json" ? salida : { markdown: salida };
      setActual({ modo: modoId, tema, resultado, nuevo: true });
      await guardar(modoId, tema, resultado);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Bot className="w-6 h-6 text-emerald-400" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-white leading-tight">Agente de marketing</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Carruseles virales, historias para leads y estrategia de marca para @earthpark.co</p>
        </div>
      </div>

      {/* Selector de modo */}
      <div className="grid sm:grid-cols-3 gap-3">
        {Object.values(MODOS).map((m) => {
          const Icono = ICONOS[m.id];
          const activo = m.id === modoId;
          return (
            <button key={m.id} onClick={() => setModoId(m.id)}
              className="text-left rounded-xl p-4 transition"
              style={{
                background: activo ? "rgba(77,142,30,0.25)" : "rgba(10,22,6,0.6)",
                border: `1px solid ${activo ? "rgba(52,211,153,0.5)" : "rgba(77,142,30,0.18)"}`,
              }}>
              <div className="flex items-center gap-2">
                <Icono className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">{m.titulo}</span>
                {m.usaWeb && <Globe className="w-3.5 h-3.5 text-sky-400" title="Usa búsqueda web" />}
              </div>
              <p className="text-xs text-gray-400 mt-1">{m.descripcion}</p>
            </button>
          );
        })}
      </div>

      {/* Entrada */}
      <div className="rounded-xl p-4 space-y-3" style={tarjeta}>
        <label className="text-xs text-gray-400">Tema u objetivo (opcional)</label>
        <textarea
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          rows={2}
          placeholder={modo.placeholder}
          className="w-full rounded-lg bg-black/30 border border-emerald-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600"
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-gray-500">
            {modo.usaWeb ? "Investiga en la web: puede tardar 1–2 minutos." : "Tarda unos 20–40 segundos."}
          </p>
          <button onClick={generar} disabled={cargando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "rgba(77,142,30,0.80)", border: "1px solid rgba(77,142,30,0.40)" }}>
            {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Generar {modo.titulo.toLowerCase()}</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {actual && <Resultado modo={actual.modo} resultado={actual.resultado} nuevo={!!actual.nuevo} />}

      {/* Historial */}
      {items.length > 0 && (
        <section className="space-y-2 pt-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Generados anteriormente</h2>
          </div>
          <div className="space-y-1.5">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm" style={tarjeta}>
                <button onClick={() => { setActual({ modo: it.modo, tema: it.tema, resultado: it.resultado }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex-1 text-left min-w-0">
                  <span className="text-emerald-400 text-xs mr-2">{MODOS[it.modo]?.titulo || it.modo}</span>
                  <span className="text-gray-200 truncate">{it.tema || "(sin tema)"}</span>
                  <span className="text-gray-600 text-xs ml-2">{new Date(it.creado_at).toLocaleDateString("es-CO")}</span>
                </button>
                <button onClick={() => borrar(it.id)} className="text-gray-600 hover:text-red-400" title="Borrar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
