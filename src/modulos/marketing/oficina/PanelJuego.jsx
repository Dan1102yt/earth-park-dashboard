// Piezas visuales del juego de la Oficina: indicadores (arriba de la oficina), ruta de la semana (debajo),
// misión de hoy y recompensas. La lógica vive en juego.js.
import { useState } from "react";
import { Check, Lock, Gift } from "lucide-react";
import { RECOMPENSAS } from "./juego";

const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const Titulo = ({ children, extra }) => (
  <div className="flex items-center justify-between mb-2.5">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</p>
    {extra && <span className="text-xs text-lime-300">{extra}</span>}
  </div>
);

/** Nivel, XP e indicadores principales. */
export function IndicadoresJuego({ juego, seguidores }) {
  const k = (valor, texto, extra) => (
    <div className="rounded-xl px-1 py-2 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
      <p className="text-base sm:text-lg font-bold text-white leading-tight whitespace-nowrap">{valor}</p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight mt-0.5">{texto}</p>
      {extra && <p className="text-[10px] text-lime-300 leading-tight">{extra}</p>}
    </div>
  );
  const seg = seguidores?.delta;
  return (
    <div className="rounded-2xl p-3" style={tarjeta}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center leading-none text-emerald-950 flex-shrink-0"
          style={{ background: "linear-gradient(145deg,#a3e635,#65a30d)" }}>
          <span className="text-[8px] font-bold">NIVEL</span>
          <span className="text-lg font-extrabold">{juego.nivel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Equipo Earth Park</span>
            <span><b className="text-white">{juego.xpNivel}</b> / {juego.xpSiguiente} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, juego.progreso * 100)}%`, background: "linear-gradient(90deg,#65a30d,#a3e635)" }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {k(`🔥 ${juego.racha}`, juego.racha === 1 ? "semana cumplida" : "semanas seguidas")}
        {k(`${juego.semana.porcentaje}%`, "plan semanal", `${juego.semana.publicadas} de ${juego.semana.total}`)}
        {k(seg == null ? "—" : `${seg >= 0 ? "+" : ""}${seg}`, "seguidores", seg == null ? null : "este mes")}
        {k(`🪙 ${juego.monedas}`, "monedas")}
      </div>
    </div>
  );
}

const PUNTO = {
  hecho: "bg-lime-400 text-emerald-950",
  hoy: "border-2 border-yellow-400 text-yellow-300 shadow-[0_0_0_4px_rgba(250,204,21,0.15)]",
  atrasado: "border-2 border-red-400 text-red-300",
  pendiente: "border-2 border-emerald-800 text-gray-400",
  libre: "border-2 border-dashed border-emerald-900/70 text-gray-600",
};

/** Ruta de lunes a domingo con lo que toca cada día. */
export function RutaSemana({ juego, onDia }) {
  const { ruta, semana } = juego;
  const hoyIdx = Math.max(0, ruta.findIndex((d) => d.esHoy));
  const completa = semana.total > 0 && semana.publicadas === semana.total;
  return (
    <div className="rounded-2xl p-3" style={tarjeta}>
      <Titulo extra={semana.total ? `${semana.publicadas} de ${semana.total} publicaciones` : "sin plan esta semana"}>Ruta de la semana</Titulo>
      <div className="relative flex justify-between px-0.5">
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-emerald-900/70" />
        <div className="absolute left-4 top-4 h-0.5 bg-lime-400 transition-all" style={{ width: `calc((100% - 2rem) * ${hoyIdx / 6})` }} />
        {ruta.map((d, i) => (
          <button key={d.fecha} onClick={() => d.piezas.length && onDia?.(d)} className="relative z-10 flex flex-col items-center w-[13%] min-w-0">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#0b1a0b] ${PUNTO[d.estado]}`}
              style={d.estado === "hecho" ? { background: "#a3e635" } : undefined}>
              {d.estado === "hecho" ? <Check className="w-4 h-4" /> : d.estado === "libre" ? "–" : d.estado === "atrasado" ? "!" : d.estado === "hoy" ? "●" : i + 1}
            </span>
            <span className={`text-[11px] font-semibold mt-1 ${d.esHoy ? "text-yellow-300" : "text-gray-200"}`}>{d.dia}</span>
            <span className="text-[9px] sm:text-[10px] text-gray-500 truncate max-w-full">{d.etiqueta}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-emerald-900/50 text-xs text-gray-400">
        <span>{completa ? "¡Semana completa! Cofre abierto" : "Completa la semana y abre el cofre"}</span>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${completa ? "bg-yellow-400 text-yellow-950" : "text-yellow-300 border border-yellow-700/60"}`}
          style={completa ? undefined : { background: "rgba(120,80,10,0.25)" }}>
          <Gift className="w-3.5 h-3.5" /> +40 🪙
        </span>
      </div>
    </div>
  );
}

/** La tarea más importante del día. */
export function MisionHoy({ mision, onAccion }) {
  const iconos = { reunion: "📣", programar: "📅", producir: "🎬", plan: "🧭", listo: "✅" };
  const boton = { reunion: "Entrar", programar: "Programar", producir: "Producir", plan: "Pedir plan" }[mision.tipo];
  return (
    <div className="rounded-2xl p-3" style={tarjeta}>
      <Titulo extra={mision.xp ? `+${mision.xp} XP` : null}>Misión de hoy</Titulo>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(250,204,21,0.12)" }}>{iconos[mision.tipo]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{mision.texto}</p>
          <p className="text-[11px] text-gray-400">{mision.detalle}</p>
        </div>
        {boton && <button onClick={onAccion} className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-lime-400 text-emerald-950">{boton}</button>}
      </div>
    </div>
  );
}

/** Nivel de un agente (para la lista del equipo). */
export function NivelAgente({ n }) {
  if (!n) return null;
  return (
    <span className="flex flex-col items-end flex-shrink-0 w-12">
      <span className="text-[10px] font-semibold text-lime-300">Nv {n.nivel}</span>
      <span className="w-full h-1 rounded-full mt-0.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <span className="block h-full bg-lime-400 rounded-full" style={{ width: `${Math.max(4, n.progreso * 100)}%` }} />
      </span>
    </span>
  );
}

/** Tienda: decoración para la oficina, se paga con monedas y se desbloquea por nivel. */
export function Recompensas({ juego, compradas, onComprar }) {
  const [confirmar, setConfirmar] = useState(null);
  return (
    <div className="rounded-2xl p-3" style={tarjeta}>
      <Titulo extra="decoran la oficina">Recompensas</Titulo>
      <div className="grid grid-cols-4 gap-1.5">
        {RECOMPENSAS.map((r) => {
          const tuya = compradas.includes(r.id);
          const bloqueada = !tuya && juego.nivel < r.nivel;
          const alcanza = juego.monedas >= r.costo;
          return (
            <button key={r.id} disabled={tuya || bloqueada}
              onClick={() => setConfirmar(confirmar === r.id ? null : r.id)}
              className={`rounded-xl px-1 py-2 text-center ${tuya ? "ring-1 ring-lime-400" : ""} ${bloqueada ? "opacity-45" : ""} ${confirmar === r.id ? "ring-1 ring-yellow-400" : ""}`}
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="block text-2xl leading-none">{bloqueada ? "🔒" : r.emoji}</span>
              <span className="block text-[10px] sm:text-[11px] text-gray-200 mt-1 leading-tight">{r.nombre}</span>
              <span className={`block text-[10px] mt-0.5 ${tuya ? "text-lime-300" : bloqueada ? "text-gray-400" : alcanza ? "text-yellow-300" : "text-gray-500"}`}>
                {tuya ? "En la oficina ✓" : bloqueada ? <><Lock className="inline w-2.5 h-2.5" /> Nivel {r.nivel}</> : `${r.costo} 🪙`}
              </span>
            </button>
          );
        })}
      </div>
      {confirmar && (() => {
        const r = RECOMPENSAS.find((x) => x.id === confirmar);
        const alcanza = juego.monedas >= r.costo;
        return (
          <div className="flex items-center gap-2 mt-2.5 text-xs">
            <span className="flex-1 text-gray-300">
              {alcanza ? `¿Poner ${r.nombre.toLowerCase()} en la oficina por ${r.costo} 🪙?` : `Te faltan ${r.costo - juego.monedas} 🪙. Se ganan publicando.`}
            </span>
            {alcanza && <button onClick={() => { onComprar(r.id); setConfirmar(null); }} className="font-bold px-3 py-1.5 rounded-lg bg-yellow-400 text-yellow-950">Comprar</button>}
            <button onClick={() => setConfirmar(null)} className="text-gray-400 px-1">Cancelar</button>
          </div>
        );
      })()}
    </div>
  );
}
