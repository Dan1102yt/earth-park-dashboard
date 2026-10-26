// Sala de reuniones: el Estratega presenta las propuestas y Oscar aprueba, pide cambios o descarta.
// Nada pasa a producción ni se publica sin pasar por aquí.
import { useState } from "react";
import { X, Check, Trash2, Send, Loader2, Film, LayoutGrid, CheckCheck, Calendar } from "lucide-react";
import { AGENTES } from "./mapaOficina";
import { ajustarPropuesta, fechaBonita, aInputLocal, desdeInputLocal, fechaColombia } from "./planPrompt";

const tarjeta = { background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.25)" };

function Avatar({ a, tam = 28 }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: tam, height: tam, background: a.look.camisa, fontSize: tam * 0.5 }}>{a.emoji}</span>
  );
}

function Propuesta({ fila, onActualizar, sofia }) {
  const [texto, setTexto] = useState("");
  const [ajustando, setAjustando] = useState(false);
  const [error, setError] = useState(null);
  const p = fila.propuesta || {};
  const Icono = fila.tipo === "reel" ? Film : LayoutGrid;

  const enviar = async () => {
    const comentario = texto.trim();
    if (!comentario) return;
    setAjustando(true); setError(null);
    const conversacion = [...(fila.comentarios || []), { de: "oscar", texto: comentario, at: new Date().toISOString() }];
    try {
      const r = await ajustarPropuesta(fila, comentario);
      await onActualizar(fila.id, {
        tipo: r.tipo === "carrusel" ? "carrusel" : r.tipo === "reel" ? "reel" : fila.tipo,
        tema: r.tema || fila.tema,
        propuesta: { ...p, gancho: r.gancho || p.gancho, por_que: r.por_que || p.por_que, pilar: r.pilar || p.pilar, objetivo: r.objetivo || p.objetivo },
        fecha_publicacion: fechaColombia(r.dia, r.hora) || fila.fecha_publicacion,
        comentarios: [...conversacion, { de: "estratega", texto: r.respuesta || "Listo, lo ajusté.", at: new Date().toISOString() }],
      });
      setTexto("");
    } catch (e) {
      setError(e.message);
      await onActualizar(fila.id, { comentarios: conversacion });
    } finally {
      setAjustando(false);
    }
  };

  return (
    <div className="rounded-xl p-3 space-y-2" style={tarjeta}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${fila.tipo === "reel" ? "bg-fuchsia-500/20 text-fuchsia-300" : "bg-sky-500/20 text-sky-300"}`}>
          <Icono className="w-3 h-3" /> {fila.tipo === "reel" ? "Reel" : "Carrusel"}
        </span>
        {p.pilar && <span className="text-[10px] text-emerald-300 border border-emerald-800/60 px-1.5 rounded-full">{p.pilar}</span>}
        {p.objetivo && <span className="text-[10px] text-amber-300 border border-amber-800/60 px-1.5 rounded-full">{p.objetivo}</span>}
      </div>
      <input value={fila.tema} onChange={(e) => onActualizar(fila.id, { tema: e.target.value }, true)}
        className="w-full bg-transparent text-sm font-semibold text-white border-b border-transparent focus:border-emerald-600 outline-none" />
      {p.gancho && <p className="text-xs text-gray-300"><span className="text-gray-500">Gancho:</span> {p.gancho}</p>}
      {p.por_que && <p className="text-xs text-gray-400"><span className="text-gray-500">Por qué:</span> {p.por_que}</p>}
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <Calendar className="w-3.5 h-3.5" />
        <input type="datetime-local" value={aInputLocal(fila.fecha_publicacion)}
          onChange={(e) => onActualizar(fila.id, { fecha_publicacion: desdeInputLocal(e.target.value) })}
          className="bg-black/40 border border-emerald-900/50 rounded-md text-white text-xs px-2 py-1" style={{ width: "auto" }} />
        <span className="hidden sm:inline">{fechaBonita(fila.fecha_publicacion)}</span>
      </label>

      {(fila.comentarios || []).length > 0 && (
        <div className="space-y-1.5 pt-1">
          {fila.comentarios.map((c, i) => (
            <div key={i} className={`flex gap-2 ${c.de === "oscar" ? "justify-end" : ""}`}>
              {c.de !== "oscar" && <Avatar a={sofia} tam={20} />}
              <p className={`text-xs rounded-lg px-2 py-1 max-w-[85%] ${c.de === "oscar" ? "bg-emerald-700/50 text-white" : "bg-white/10 text-gray-200"}`}>{c.texto}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder={`Pídele un cambio a ${sofia.nombre}…`} disabled={ajustando}
          className="flex-1 min-w-0 bg-black/40 border border-emerald-900/50 rounded-lg text-white text-xs px-2 py-1.5" />
        <button onClick={enviar} disabled={ajustando || !texto.trim()} className="px-2.5 rounded-lg bg-emerald-700/60 text-white disabled:opacity-40">
          {ajustando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-300">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={() => onActualizar(fila.id, { estado: "aprobada" })} disabled={ajustando}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg bg-lime-400 text-emerald-950 disabled:opacity-40">
          <Check className="w-4 h-4" /> Aprobar
        </button>
        <button onClick={() => onActualizar(fila.id, { estado: "descartada" })} disabled={ajustando}
          className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg border border-red-500/40 text-red-300 disabled:opacity-40">
          <Trash2 className="w-4 h-4" /> Descartar
        </button>
      </div>
    </div>
  );
}

export default function ReunionSala({ agentes = AGENTES, propuestas, resumen, onActualizar, onCerrar }) {
  const sofia = agentes.find((a) => a.id === "estratega");
  const aprobarTodas = async () => {
    for (const f of propuestas) await onActualizar(f.id, { estado: "aprobada" });
  };
  const semana = propuestas[0]?.semana;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="w-full sm:max-w-3xl sm:max-h-[90vh] flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: "#071407", border: "1px solid rgba(77,142,30,0.35)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/50 safe-area-top">
          <div>
            <p className="text-sm font-bold text-white">Sala de reuniones</p>
            {semana && <p className="text-[11px] text-gray-400">Plan de la semana del {new Date(`${semana}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</p>}
          </div>
          <button onClick={onCerrar} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex -space-x-2">
            {agentes.map((a) => <Avatar key={a.id} a={a} tam={30} />)}
          </div>
          <div className="flex gap-2">
            <Avatar a={sofia} />
            <div className="rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-100 bg-white/10">
              <p className="text-[11px] text-emerald-300 font-semibold mb-0.5">{sofia.nombre} · {sofia.rol}</p>
              {resumen || "Te traigo las propuestas de la semana. Apruébalas, pídeme cambios o descártalas."}
              <p className="text-[11px] text-gray-400 mt-1">Nada se produce ni se publica hasta que lo apruebes.</p>
            </div>
          </div>

          {propuestas.length ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {propuestas.map((f) => <Propuesta key={f.id} fila={f} onActualizar={onActualizar} sofia={sofia} />)}
            </div>
          ) : (
            <p className="text-sm text-emerald-300 text-center py-8">✓ Todo aprobado. Los agentes ya se pusieron a trabajar.</p>
          )}
        </div>

        {propuestas.length > 1 && (
          <div className="p-3 border-t border-emerald-900/50 safe-area-bottom">
            <button onClick={aprobarTodas} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-lime-400 text-emerald-950">
              <CheckCheck className="w-4 h-4" /> Aprobar todas ({propuestas.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
