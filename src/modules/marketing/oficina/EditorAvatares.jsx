// Editor de avatares de la oficina: nombre, piel, peinado, colores y accesorios de cada agente.
// Se guarda en Supabase (se ve igual en el celular y en el computador) y en el navegador como respaldo.
import { useEffect, useRef, useState, useCallback } from "react";
import { X, RotateCcw } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { AGENTES, PEINADOS, ACCESORIOS, dibujarRetrato } from "./mapaOficina";

const CLAVE = "ep_oficina_avatares";
const PIELES = ["#f6d5b8", "#f1c7a1", "#e8b48a", "#dba27c", "#c98e62", "#a8704a", "#7a4b2e", "#5a3520"];
const PELOS = ["#151515", "#3b2414", "#6b3f1d", "#b4532a", "#d6a24a", "#e5e7eb", "#7c3aed", "#0f766e"];
const NOMBRE_ACC = {
  ninguno: "Ninguno", gafas: "Gafas", boina: "Boina", audifonos: "Audífonos", gorra: "Gorra", lapiz: "Lápiz",
  bata: "Bata", lupa: "Lupa", telefono: "Celular", collar: "Collar",
};

/** Configuración de avatares: { [id]: { nombre, look } } */
export function useAvatares() {
  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; }
  });
  const filaId = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("marketing_agente").select("id, resultado").eq("modo", "config_oficina")
      .order("creado_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const f = data?.[0];
        if (f) { filaId.current = f.id; setCfg(f.resultado || {}); try { localStorage.setItem(CLAVE, JSON.stringify(f.resultado || {})); } catch { /* sin almacenamiento */ } }
      });
  }, []);

  const guardar = useCallback(async (nuevo) => {
    setCfg(nuevo);
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
    if (!supabase) return;
    if (filaId.current) await supabase.from("marketing_agente").update({ resultado: nuevo }).eq("id", filaId.current);
    else {
      const { data } = await supabase.from("marketing_agente").insert({ modo: "config_oficina", tema: "Avatares de la oficina", resultado: nuevo }).select().single();
      filaId.current = data?.id || null;
    }
  }, []);

  // Agentes con nombre y aspecto personalizados
  const agentes = AGENTES.map((a) => ({
    ...a, nombre: cfg[a.id]?.nombre || a.nombre, look: { ...a.look, ...(cfg[a.id]?.look || {}) },
  }));
  return { cfg, guardar, agentes };
}

function Retrato({ agente, look, tam = 120 }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) dibujarRetrato(ref.current, agente, look); }, [agente, look]);
  return <canvas ref={ref} width={tam} height={tam * 1.5} style={{ width: tam / 1.5, height: tam }} />;
}

function Muestras({ colores, valor, onElegir }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colores.map((c) => (
        <button key={c} onClick={() => onElegir(c)} className={`w-6 h-6 rounded-full border-2 ${valor === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
      ))}
    </div>
  );
}

export default function EditorAvatares({ cfg, onGuardar, onCerrar }) {
  const [borrador, setBorrador] = useState(cfg);
  const [sel, setSel] = useState(AGENTES[0].id);
  const base = AGENTES.find((a) => a.id === sel);
  const actual = { nombre: borrador[sel]?.nombre || base.nombre, look: { ...base.look, ...(borrador[sel]?.look || {}) } };
  const cambiar = (cambios) => setBorrador((b) => ({ ...b, [sel]: { nombre: actual.nombre, ...b[sel], ...cambios, look: { ...actual.look, ...(cambios.look || {}) } } }));
  const toggleAcc = (acc) => {
    const set = new Set(actual.look.accesorios || []);
    if (acc === "ninguno") set.clear(); else if (set.has(acc)) set.delete(acc); else set.add(acc);
    cambiar({ look: { accesorios: [...set] } });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="w-full sm:max-w-2xl sm:max-h-[92vh] flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: "#071407", border: "1px solid rgba(77,142,30,0.35)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/50 safe-area-top">
          <p className="text-sm font-bold text-white">Diseña a tu equipo</p>
          <button onClick={onCerrar} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
          {AGENTES.map((a) => {
            const look = { ...a.look, ...(borrador[a.id]?.look || {}) };
            return (
              <button key={a.id} onClick={() => setSel(a.id)}
                className={`flex-shrink-0 flex flex-col items-center rounded-xl px-2 pt-1 pb-1.5 ${sel === a.id ? "bg-emerald-800/50 ring-1 ring-lime-400" : "bg-white/5"}`}>
                <Retrato agente={a} look={look} tam={66} />
                <span className="text-[10px] text-white">{borrador[a.id]?.nombre || a.nombre}</span>
                <span className="text-[9px] text-gray-400">{a.rol}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-[150px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl p-2" style={{ background: "radial-gradient(circle, #1a3a1a, #071407)" }}>
              <Retrato agente={base} look={actual.look} tam={180} />
            </div>
            <button onClick={() => setBorrador((b) => { const n = { ...b }; delete n[sel]; return n; })}
              className="flex items-center gap-1 text-[11px] text-gray-400"><RotateCcw className="w-3 h-3" /> Volver al original</button>
          </div>
          <div className="space-y-3 text-xs text-gray-300">
            <label className="block space-y-1">
              <span>Nombre</span>
              <input value={actual.nombre} maxLength={14} onChange={(e) => cambiar({ nombre: e.target.value })}
                className="w-full bg-black/40 border border-emerald-900/50 rounded-lg text-white px-2 py-1.5" />
            </label>
            <div className="space-y-1"><span>Piel</span><Muestras colores={PIELES} valor={actual.look.piel} onElegir={(c) => cambiar({ look: { piel: c } })} /></div>
            <div className="space-y-1"><span>Color de pelo</span><Muestras colores={PELOS} valor={actual.look.pelo} onElegir={(c) => cambiar({ look: { pelo: c } })} /></div>
            <div className="space-y-1">
              <span>Peinado</span>
              <div className="flex flex-wrap gap-1.5">
                {PEINADOS.map((p) => (
                  <button key={p} onClick={() => cambiar({ look: { peinado: p } })}
                    className={`px-2 py-1 rounded-full border capitalize ${actual.look.peinado === p ? "bg-emerald-700/60 border-lime-400 text-white" : "border-emerald-900/60"}`}>{p}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <span>Color de ropa</span>
              <input type="color" value={actual.look.camisa} onChange={(e) => cambiar({ look: { camisa: e.target.value } })}
                className="w-10 h-7 rounded bg-transparent border-0 p-0" style={{ width: 40 }} />
            </label>
            <div className="space-y-1">
              <span>Accesorios</span>
              <div className="flex flex-wrap gap-1.5">
                {ACCESORIOS.map((a) => {
                  const on = a === "ninguno" ? !(actual.look.accesorios || []).length : (actual.look.accesorios || []).includes(a);
                  return (
                    <button key={a} onClick={() => toggleAcc(a)}
                      className={`px-2 py-1 rounded-full border ${on ? "bg-emerald-700/60 border-lime-400 text-white" : "border-emerald-900/60"}`}>{NOMBRE_ACC[a]}</button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-emerald-900/50 safe-area-bottom">
          <button onClick={() => { onGuardar(borrador); onCerrar(); }}
            className="w-full text-sm font-semibold py-2.5 rounded-xl bg-lime-400 text-emerald-950">Guardar equipo</button>
        </div>
      </div>
    </div>
  );
}

export { Retrato };
