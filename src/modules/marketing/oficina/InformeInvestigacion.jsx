// Informe semanal de Iván (investigador): tendencias, formatos, ganchos y temas sugeridos, con fuentes.
import { X, ExternalLink } from "lucide-react";

const tarjeta = { background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.25)" };

function Seccion({ titulo, children }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={tarjeta}>
      <p className="text-xs font-semibold text-lime-300 uppercase tracking-wide">{titulo}</p>
      {children}
    </div>
  );
}

export default function InformeInvestigacion({ fila, agente, onCerrar }) {
  const r = fila?.resultado || {};
  const fecha = fila?.creado_at ? new Date(fila.creado_at).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }) : "";
  const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-3xl sm:max-h-[90vh] flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: "#071407", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/50 safe-area-top">
          <div>
            <p className="text-sm font-bold text-white">Informe de {agente?.nombre || "investigación"} · {agente?.rol}</p>
            <p className="text-[11px] text-gray-400">{fecha}</p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-gray-100 rounded-xl px-3 py-2 bg-white/10">{r.resumen}</p>

          {r.tendencias?.length > 0 && (
            <Seccion titulo="Lo que está funcionando">
              {r.tendencias.map((t, i) => (
                <div key={i} className="text-xs space-y-0.5 border-b border-emerald-900/40 pb-2 last:border-0 last:pb-0">
                  <p className="text-sm text-white font-semibold">{t.titulo}</p>
                  {t.que_es && <p className="text-gray-300">{t.que_es}</p>}
                  {t.ejemplo && <p className="text-gray-400"><span className="text-gray-500">Referencia:</span> {t.ejemplo}</p>}
                  {t.por_que_funciona && <p className="text-gray-400"><span className="text-gray-500">Por qué funciona:</span> {t.por_que_funciona}</p>}
                  {t.como_aplicarlo && <p className="text-emerald-300"><span className="text-gray-500">Para Earth Park:</span> {t.como_aplicarlo}</p>}
                </div>
              ))}
            </Seccion>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {r.ganchos?.length > 0 && (
              <Seccion titulo="Ganchos para esta semana">
                <ul className="space-y-1">{r.ganchos.map((g, i) => <li key={i} className="text-xs text-gray-200">“{g}”</li>)}</ul>
              </Seccion>
            )}
            {r.formatos?.length > 0 && (
              <Seccion titulo="Formatos recomendados">
                <ul className="space-y-1">{r.formatos.map((g, i) => <li key={i} className="text-xs text-gray-200">• {g}</li>)}</ul>
              </Seccion>
            )}
          </div>

          {r.temas?.length > 0 && (
            <Seccion titulo="Temas sugeridos">
              {r.temas.map((t, i) => (
                <div key={i} className="text-xs">
                  <span className={`text-[10px] font-bold mr-1.5 ${t.tipo === "reel" ? "text-fuchsia-300" : "text-sky-300"}`}>{t.tipo === "reel" ? "REEL" : "CARRUSEL"}</span>
                  <span className="text-white">{t.tema}</span>
                  {t.gancho && <span className="text-gray-400"> · “{t.gancho}”</span>}
                </div>
              ))}
            </Seccion>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {r.fechas?.length > 0 && (
              <Seccion titulo="Fechas a aprovechar">
                <ul className="space-y-1">{r.fechas.map((g, i) => <li key={i} className="text-xs text-gray-200">• {g}</li>)}</ul>
              </Seccion>
            )}
            {r.evitar?.length > 0 && (
              <Seccion titulo="Mejor evitar">
                <ul className="space-y-1">{r.evitar.map((g, i) => <li key={i} className="text-xs text-gray-300">• {g}</li>)}</ul>
              </Seccion>
            )}
          </div>

          {r.fuentes?.length > 0 && (
            <Seccion titulo="Fuentes">
              <div className="flex flex-wrap gap-1.5">
                {r.fuentes.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-sky-300 border border-sky-800/60 rounded-full px-2 py-0.5">
                    {dominio(u)} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </Seccion>
          )}
          <p className="text-[11px] text-gray-500">Sofía usa este informe automáticamente cuando arma el plan de la semana.</p>
        </div>
      </div>
    </div>
  );
}
