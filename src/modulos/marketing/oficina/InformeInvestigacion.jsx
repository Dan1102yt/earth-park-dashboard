// Informe de Iván (investigador): respuesta a lo que le pediste, números de redes de Earth Park vs competencia,
// qué hace bien cada cuenta, acciones con prioridad, ideas de contenido y fuentes. En el celular ocupa toda la pantalla.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, TrendingUp, Users, Lightbulb, Target, Link2, Instagram } from "lucide-react";

const tarjeta = { background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.25)" };
const n = (v) => (v == null ? "—" : Number(v).toLocaleString("es-CO"));

function Seccion({ titulo, icono: Icono, children }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={tarjeta}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-lime-300 uppercase tracking-wide">{Icono && <Icono className="w-3.5 h-3.5" />} {titulo}</p>
      {children}
    </div>
  );
}

const CHIP = {
  alto: "bg-lime-400/20 text-lime-300 border-lime-500/40",
  medio: "bg-amber-400/15 text-amber-300 border-amber-500/40",
  bajo: "bg-white/5 text-gray-400 border-white/10",
};
const Chip = ({ nivel, prefijo }) => nivel ? <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CHIP[nivel] || CHIP.bajo}`}>{prefijo} {nivel}</span> : null;
const TIPO = { propia: "bg-lime-400 text-emerald-950", competencia: "bg-sky-500/20 text-sky-300", referente: "bg-fuchsia-500/20 text-fuchsia-300" };

/** Tabla de números: Earth Park primero y luego por interacción. */
export function TablaKpis({ kpis }) {
  if (!kpis?.cuentas?.length) return <p className="text-xs text-gray-500">Todavía no hay números de redes. Toca "Actualizar números" en la tarjeta de Iván.</p>;
  const cuentas = [...kpis.cuentas].sort((a, b) => (b.propia ? 1 : 0) - (a.propia ? 1 : 0) || (b.engagement || -1) - (a.engagement || -1));
  const maxEng = Math.max(0.01, ...cuentas.map((c) => c.engagement || 0));
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-gray-500">
        Últimas 12 publicaciones de cada cuenta · {new Date(kpis.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
        {kpis.dias ? ` · crecimiento en ${kpis.dias} días` : ""}. "Interacción" es el % de sus seguidores que reacciona o comenta cada publicación.
      </p>
      {cuentas.map((c) => (
        <div key={c.usuario} className={`rounded-lg p-2.5 ${c.propia ? "ring-1 ring-lime-400/60" : ""}`} style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2">
            {c.foto ? <img src={c.foto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
              : <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><Instagram className="w-3.5 h-3.5 text-gray-400" /></span>}
            <a href={`https://www.instagram.com/${c.usuario}/`} target="_blank" rel="noreferrer" className="text-sm text-white font-semibold truncate">@{c.usuario}</a>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${TIPO[c.tipo] || TIPO.competencia}`}>{c.propia ? "nosotros" : c.tipo}</span>
          </div>
          {c.error ? <p className="text-[11px] text-gray-500 mt-1">{c.error}</p> : (
            <>
              <div className="grid grid-cols-4 gap-1 mt-2 text-center">
                <div><p className="text-sm font-bold text-white">{n(c.seguidores)}</p><p className="text-[10px] text-gray-500">seguidores{c.crecimiento != null && <span className={c.crecimiento >= 0 ? " text-lime-300" : " text-red-300"}> {c.crecimiento >= 0 ? "+" : ""}{c.crecimiento}</span>}</p></div>
                <div><p className="text-sm font-bold text-white">{c.engagement}%</p><p className="text-[10px] text-gray-500">interacción</p></div>
                <div><p className="text-sm font-bold text-white">{c.por_semana}</p><p className="text-[10px] text-gray-500">publ./semana</p></div>
                <div><p className="text-sm font-bold text-white">{c.reels_pct}%</p><p className="text-[10px] text-gray-500">son reels</p></div>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className={`h-full rounded-full ${c.propia ? "bg-lime-400" : "bg-sky-400/70"}`} style={{ width: `${Math.max(3, ((c.engagement || 0) / maxEng) * 100)}%` }} />
              </div>
              {c.top?.[0] && (
                <a href={c.top[0].url} target="_blank" rel="noreferrer" className="block text-[11px] text-gray-400 mt-1.5 truncate">
                  🏆 Mejor publicación ({c.top[0].tipo}, {n(c.top[0].interacciones)} interacciones): {c.top[0].texto || "ver"}
                </a>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const PESTANAS = [
  ["resumen", "Resumen", Target],
  ["numeros", "Números", TrendingUp],
  ["competencia", "Competencia", Users],
  ["ideas", "Ideas", Lightbulb],
  ["fuentes", "Fuentes", Link2],
];

export default function InformeInvestigacion({ fila, agente, kpisActuales, onCerrar }) {
  const r = fila?.resultado || {};
  const [pestana, setPestana] = useState(r.soloNumeros ? "numeros" : "resumen");
  const fecha = fila?.creado_at ? new Date(fila.creado_at).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }) : "";
  const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const kpis = r.kpis || kpisActuales;
  const lista = (xs, cls = "text-gray-200") => <ul className="space-y-1.5">{xs.map((g, i) => <li key={i} className={`text-xs ${cls}`}>• {g}</li>)}</ul>;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-3xl h-[100dvh] sm:h-[90vh] flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: "#071407", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-3 pb-2 border-b border-emerald-900/50 safe-area-top space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">Informe de {agente?.nombre || "Iván"} · {fecha}</p>
              <p className="text-base font-bold text-white leading-snug">{r.titulo || fila?.tema || "Investigación"}</p>
              {r.pedido && <p className="text-[11px] text-gray-400 mt-0.5">Le pediste: “{r.pedido}”</p>}
            </div>
            <button onClick={onCerrar} className="text-gray-300 p-2 -m-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
            {PESTANAS.map(([id, t, Ic]) => (
              <button key={id} onClick={() => setPestana(id)}
                className={`flex items-center gap-1 flex-shrink-0 text-xs px-3 py-1.5 rounded-full ${pestana === id ? "bg-lime-400 text-emerald-950 font-semibold" : "text-gray-400 border border-emerald-900/60"}`}>
                <Ic className="w-3.5 h-3.5" /> {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pestana === "resumen" && (
            <>
              <p className="text-sm text-gray-100 leading-relaxed rounded-xl px-3 py-2.5" style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.25)" }}>{r.resumen}</p>
              {r.lectura_numeros && <Seccion titulo="Lo que dicen los números" icono={TrendingUp}><p className="text-xs text-gray-200 leading-relaxed">{r.lectura_numeros}</p></Seccion>}
              {r.acciones?.length > 0 && (
                <Seccion titulo="Qué hacer, en orden" icono={Target}>
                  <ol className="space-y-2">
                    {r.acciones.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="w-5 h-5 rounded-full bg-lime-400 text-emerald-950 text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm text-white leading-snug">{a.accion}</p>
                          <div className="flex flex-wrap gap-1"><Chip nivel={a.impacto} prefijo="impacto" /><Chip nivel={a.esfuerzo} prefijo="esfuerzo" /></div>
                          {a.para_reservas && <p className="text-[11px] text-emerald-300">→ {a.para_reservas}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Seccion>
              )}
              {r.oportunidades?.length > 0 && <Seccion titulo="Oportunidades que nadie está tomando" icono={Lightbulb}>{lista(r.oportunidades)}</Seccion>}
            </>
          )}

          {pestana === "numeros" && <TablaKpis kpis={kpis} />}

          {pestana === "competencia" && (r.competencia?.length ? r.competencia.map((c, i) => (
            <div key={i} className="rounded-xl p-3 space-y-1.5" style={tarjeta}>
              <div className="flex items-center gap-2">
                <a href={`https://www.instagram.com/${String(c.cuenta || "").replace(/^@/, "")}/`} target="_blank" rel="noreferrer" className="text-sm font-bold text-white">{c.cuenta}</a>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${TIPO[c.tipo] || TIPO.competencia}`}>{c.tipo}</span>
              </div>
              {c.que_hacen_bien && <p className="text-xs text-gray-200"><span className="text-gray-500">Qué hacen bien:</span> {c.que_hacen_bien}</p>}
              {c.por_que_les_funciona && <p className="text-xs text-gray-300"><span className="text-gray-500">Por qué les funciona:</span> {c.por_que_les_funciona}</p>}
              {c.que_tomamos && <p className="text-xs text-lime-300"><span className="text-gray-500">Lo que tomamos:</span> {c.que_tomamos}</p>}
              {c.ojo && <p className="text-[11px] text-amber-300">⚠ {c.ojo}</p>}
            </div>
          )) : <p className="text-xs text-gray-500">Este informe no analizó cuentas. Pídele a Iván "Analiza la competencia".</p>)}

          {pestana === "ideas" && (
            <>
              {r.tendencias?.length > 0 && (
                <Seccion titulo="Lo que está funcionando" icono={TrendingUp}>
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
              {r.temas?.length > 0 && (
                <Seccion titulo="Temas sugeridos" icono={Lightbulb}>
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
                {r.ganchos?.length > 0 && <Seccion titulo="Ganchos listos">{lista(r.ganchos.map((g) => `“${g}”`))}</Seccion>}
                {r.formatos?.length > 0 && <Seccion titulo="Formatos recomendados">{lista(r.formatos)}</Seccion>}
                {r.fechas?.length > 0 && <Seccion titulo="Fechas a aprovechar">{lista(r.fechas)}</Seccion>}
                {r.evitar?.length > 0 && <Seccion titulo="Mejor evitar">{lista(r.evitar, "text-gray-300")}</Seccion>}
              </div>
            </>
          )}

          {pestana === "fuentes" && (r.fuentes?.length ? (
            <div className="flex flex-col gap-1.5">
              {r.fuentes.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-sky-300 rounded-lg px-3 py-2" style={tarjeta}>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{dominio(u)}</span>
                </a>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">Sin fuentes.</p>)}

          <p className="text-[11px] text-gray-500 pt-1">Sofía usa este informe automáticamente cuando arma el plan de la semana.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
