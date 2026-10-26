// Oficina IA: el equipo de agentes de marketing de Earth Park trabajando en una oficina en pixel art.
// El Estratega arma el plan semanal → reunión contigo (apruebas / cambias / descartas) → producción → publicación.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Users, AlertCircle, Film, LayoutGrid, Play, RefreshCw, Palette, FileSearch, Send, CalendarClock, ExternalLink, Instagram } from "lucide-react";
import { W, H, ESCALA, AGENTES, dibujarOficina, posicionAgente, POS_SILLA_OSCAR } from "./mapaOficina";
import { usePlan, lunesDe, lunesSiguiente, ESTADOS } from "./usePlan";
import { pedirPlanSemana, fechaColombia, fechaBonita } from "./planPrompt";
import ReunionSala from "./ReunionSala";
import InformeInvestigacion from "./InformeInvestigacion";
import EditorAvatares, { useAvatares, Retrato } from "./EditorAvatares";
import { ultimoInforme, informeVencido, investigarSemana, informeParaPlan } from "./investigacion";
import { estadoInstagram, publicarAhora } from "./instagram";

const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const DUR_CAMINATA = 3.5; // segundos para ir del escritorio a la mesa

/* Qué está haciendo cada agente según el plan */
function estadosEquipo(items, generando, inv) {
  const vivos = items.filter((i) => i.estado !== "descartada");
  const cuenta = (tipo, estados) => vivos.filter((i) => (!tipo || i.tipo === tipo) && estados.includes(i.estado)).length;
  const propuestas = cuenta(null, ["propuesta"]);
  const carruseles = cuenta("carrusel", ["aprobada", "en_produccion"]);
  const reels = cuenta("reel", ["aprobada", "en_produccion"]);
  const listas = cuenta(null, ["lista"]);
  const programadas = cuenta(null, ["programada"]);
  const conError = vivos.filter((i) => i.error && ["lista", "programada"].includes(i.estado)).length;
  const proxima = lunesSiguiente();
  const hayProxima = vivos.some((i) => i.semana === proxima);
  const fechaInforme = inv.fila ? new Date(inv.fila.creado_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : null;
  return {
    investigador: inv.investigando ? { texto: "Investigando qué está funcionando esta semana…", trabajando: true, icono: "🔎" }
      : inv.error ? { texto: `No pudo investigar: ${inv.error}`, icono: "⚠️" }
      : inv.fila ? { texto: `Informe listo (${fechaInforme}). Tócame para leerlo`, icono: "📋" }
      : { texto: "Esperando para investigar la semana", icono: "☕" },
    estratega: generando ? { texto: "Armando el plan de la semana…", trabajando: true, icono: "⏳" }
      : propuestas ? { texto: `Te espera en la sala de reuniones (${propuestas} por aprobar)`, icono: "❗" }
      : !hayProxima ? { texto: "Lista para planear la próxima semana", icono: "💡" }
      : { texto: "Plan de la próxima semana aprobado", icono: "✅" },
    guionista: carruseles ? { texto: `Escribiendo ${carruseles} carrusel${carruseles > 1 ? "es" : ""}`, trabajando: true, icono: "✍️" }
      : { texto: "Sin pendientes", icono: "☕" },
    disenador: carruseles ? { texto: `Diseñando ${carruseles} carrusel${carruseles > 1 ? "es" : ""}`, trabajando: true, icono: "🎨" }
      : { texto: "Sin pendientes", icono: "☕" },
    editor: reels ? { texto: `Editando ${reels} video${reels > 1 ? "s" : ""}`, trabajando: true, icono: "🎬" }
      : { texto: "Sin pendientes", icono: "☕" },
    community: conError ? { texto: `${conError} publicación${conError > 1 ? "es" : ""} con problema: revisa el plan`, icono: "⚠️" }
      : programadas ? { texto: `${programadas} programada${programadas > 1 ? "s" : ""} para Instagram`, trabajando: true, icono: "📅" }
      : listas ? { texto: `${listas} lista${listas > 1 ? "s" : ""}: falta que la${listas > 1 ? "s" : ""} programes`, icono: "❗" }
      : { texto: "Esperando contenido para publicar", icono: "☕" },
    _propuestas: propuestas,
  };
}

export default function OficinaPage() {
  const navigate = useNavigate();
  const { items, cargando, error, recargar, crear, actualizar } = usePlan();
  const [generando, setGenerando] = useState(false);
  const [errorPlan, setErrorPlan] = useState(null);
  const [reunion, setReunion] = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [form, setForm] = useState({ semana: "proxima", cantidad: 4, indicaciones: "" });

  const { cfg: cfgAvatares, guardar: guardarAvatares, agentes } = useAvatares();
  const nombre = (id) => agentes.find((a) => a.id === id)?.nombre;
  const [inv, setInv] = useState({ fila: null, investigando: false, error: null, revisado: false });
  const [verInforme, setVerInforme] = useState(false);
  const [editarEquipo, setEditarEquipo] = useState(false);
  const equipo = useMemo(() => estadosEquipo(items, generando, inv), [items, generando, inv]);
  const propuestas = items.filter((i) => i.estado === "propuesta");
  const hayReunion = propuestas.length > 0;
  const resumen = propuestas.find((p) => p.propuesta?.resumen)?.propuesta?.resumen;

  /* ─── Lienzo animado ─── */
  const canvasRef = useRef(null);
  const etiquetas = useRef({});
  const oscarRef = useRef(null);
  const avance = useRef({ global: 0 });
  const looks = useMemo(() => Object.fromEntries(agentes.map((a) => [a.id, a.look])), [agentes]);
  const datos = useRef({ equipo, hayReunion, looks });
  datos.current = { equipo, hayReunion, looks };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return undefined;
    let raf, previo = performance.now();
    const cuadro = (ahora) => {
      const dt = Math.min(0.1, (ahora - previo) / 1000); previo = ahora;
      const { equipo: eq, hayReunion: hr, looks: lk } = datos.current;
      const estados = {};
      // En reunión todos caminan a la mesa, uno detrás de otro; al terminar vuelven a su escritorio
      const objetivo = hr ? 1 : 0;
      const g = avance.current.global || 0;
      avance.current.global = objetivo > g ? Math.min(1, g + dt / (DUR_CAMINATA * 1.6)) : Math.max(0, g - dt / (DUR_CAMINATA * 1.6));
      const S = 0.15;
      AGENTES.forEach((a, i) => {
        const k = Math.min(1, Math.max(0, avance.current.global * (1 + S * (AGENTES.length - 1)) - S * i));
        estados[a.id] = { trabajando: !!eq[a.id]?.trabajando, enReunion: k };
        const el = etiquetas.current[a.id];
        if (el) {
          // En la mesa de reuniones solo se ve el ícono (los nombres se amontonan)
          const nombre = el.querySelector("[data-nombre]");
          if (nombre) nombre.style.display = estados[a.id].enReunion > 0 ? "none" : "";
          const p = posicionAgente(a, estados[a.id].enReunion);
          el.style.left = `${(p.x / W) * 100}%`;
          el.style.top = `${(p.y / H) * 100}%`;
        }
      });
      if (oscarRef.current) {
        const p = POS_SILLA_OSCAR();
        oscarRef.current.style.left = `${(p.x / W) * 100}%`;
        oscarRef.current.style.top = `${(p.y / H) * 100}%`;
      }
      dibujarOficina(ctx, ahora / 1000, estados, { reunionPendiente: hr, looks: lk });
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ─── Investigador: una vez por semana, al abrir la oficina ─── */
  const investigar = async () => {
    setInv((v) => ({ ...v, investigando: true, error: null }));
    try {
      const fila = await investigarSemana();
      setInv({ fila, investigando: false, error: null, revisado: true });
    } catch (e) {
      setInv((v) => ({ ...v, investigando: false, error: e.message }));
    }
  };
  useEffect(() => {
    if (cargando || error || inv.revisado) return;
    setInv((v) => ({ ...v, revisado: true }));
    ultimoInforme().then((fila) => {
      setInv((v) => ({ ...v, fila }));
      if (informeVencido(fila)) investigar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, error]);

  /* ─── Instagram ─── */
  const [ig, setIg] = useState({ cargando: true });
  const [publicando, setPublicando] = useState(null);
  useEffect(() => {
    estadoInstagram().then((d) => setIg(d)).catch((e) => setIg({ error: e.message }));
  }, []);
  const programar = (f) => actualizarFila(f.id, { estado: "programada", error: null });
  const publicarYa = async (f) => {
    setPublicando(f.id);
    try { await publicarAhora(f.id); } catch (e) { await actualizarFila(f.id, { error: e.message }).catch(() => {}); }
    finally { setPublicando(null); recargar(); }
  };

  /* ─── Acciones ─── */
  const guardarTimer = useRef({});
  const actualizarFila = async (id, cambios, diferido = false) => {
    if (!diferido) { await actualizar(id, cambios); return; }
    // Para escribir el tema sin guardar en cada tecla
    clearTimeout(guardarTimer.current[id]);
    actualizar(id, cambios).catch(() => {});
    guardarTimer.current[id] = setTimeout(() => actualizar(id, cambios).catch(() => {}), 800);
  };

  const pedirPlan = async () => {
    setGenerando(true); setErrorPlan(null);
    try {
      const semana = form.semana === "esta" ? lunesDe() : lunesSiguiente();
      const previas = items.filter((i) => i.estado !== "descartada").map((i) => i.tema);
      const r = await pedirPlanSemana({ semana, cantidad: form.cantidad, previas, indicaciones: form.indicaciones.trim(), investigacion: informeParaPlan(inv.fila) });
      await crear(r.propuestas.map((p, k) => ({
        semana, tipo: p.tipo === "reel" ? "reel" : "carrusel", tema: p.tema || "Sin tema",
        propuesta: { gancho: p.gancho, por_que: p.por_que, pilar: p.pilar, objetivo: p.objetivo, ...(k === 0 ? { resumen: r.resumen } : {}) },
        fecha_publicacion: fechaColombia(p.dia, p.hora),
        estado: "propuesta",
      })));
      setReunion(true);
    } catch (e) {
      setErrorPlan(e.message);
    } finally {
      setGenerando(false);
    }
  };

  const producir = (f) => {
    const ruta = f.tipo === "reel" ? "/marketing/cine" : "/marketing/agente";
    navigate(`${ruta}?tema=${encodeURIComponent(f.tema)}&plan=${f.id}${f.resultado_id ? `&resultado=${f.resultado_id}` : ""}`);
  };

  const visibles = items.filter((i) => i.estado !== "descartada" && i.estado !== "propuesta")
    .sort((a, b) => String(a.fecha_publicacion).localeCompare(String(b.fecha_publicacion)));
  const agenteSel = agentes.find((a) => a.id === seleccion);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-lime-300" /> Oficina IA</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Tu equipo de marketing: planea, te consulta en reunión, produce y publica</p>
        </div>
        <button onClick={() => setEditarEquipo(true)} className="flex items-center gap-1 text-xs text-lime-200 border border-lime-500/40 rounded-lg px-2 py-1" title="Diseñar avatares">
          <Palette className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Diseñar equipo</span>
        </button>
        <button onClick={recargar} className="text-gray-400 hover:text-white p-1" title="Actualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {error && (
        <div className="flex gap-2 items-start text-sm text-amber-200 rounded-xl p-3" style={{ ...tarjeta, borderColor: "rgba(251,191,36,0.4)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {hayReunion && (
        <button onClick={() => setReunion(true)}
          className="w-full flex items-center gap-3 rounded-xl p-3 text-left animate-pulse"
          style={{ background: "linear-gradient(90deg, rgba(163,230,53,0.25), rgba(163,230,53,0.08))", border: "1px solid rgba(163,230,53,0.6)" }}>
          <span className="text-2xl">📣</span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-lime-200">{nombre("estratega")} te convocó a una reunión</span>
            <span className="block text-xs text-gray-300">{propuestas.length} propuesta{propuestas.length > 1 ? "s" : ""} esperando tu aprobación</span>
          </span>
          <span className="text-xs font-semibold text-emerald-950 bg-lime-300 px-3 py-1.5 rounded-lg">Entrar</span>
        </button>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        {/* Oficina */}
        <div className="rounded-2xl overflow-hidden relative select-none" style={{ ...tarjeta, background: "#0b1a0b" }}>
          <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
            <canvas ref={canvasRef} width={W * ESCALA} height={H * ESCALA} className="absolute inset-0 w-full h-full"
              onClick={() => hayReunion && setReunion(true)} />
            {agentes.map((a) => (
              <button key={a.id} ref={(el) => { etiquetas.current[a.id] = el; }}
                onClick={(e) => { e.stopPropagation(); setSeleccion(a.id); }}
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
                style={{ left: 0, top: 0 }}>
                <span className="text-[10px] sm:text-xs leading-none mb-0.5">{equipo[a.id]?.icono}</span>
                <span data-nombre className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${seleccion === a.id ? "bg-lime-300 text-emerald-950" : "bg-black/70 text-white"}`}>
                  {a.nombre}
                </span>
              </button>
            ))}
            {hayReunion && (
              <button ref={oscarRef} onClick={() => setReunion(true)}
                className="absolute -translate-x-1/2 -translate-y-full text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-lime-300 text-emerald-950 whitespace-nowrap"
                style={{ left: 0, top: 0 }}>
                Tu silla
              </button>
            )}
          </div>
          {agenteSel && (
            <div className="absolute left-2 right-2 bottom-2 sm:left-auto sm:w-72 rounded-xl p-3 text-sm" style={{ background: "rgba(3,10,3,0.92)", border: "1px solid rgba(163,230,53,0.4)" }}>
              <div className="flex items-center gap-2">
                <span className="w-10 h-12 rounded-lg flex items-end justify-center overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}><Retrato agente={agenteSel} look={agenteSel.look} tam={48} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold leading-tight">{agenteSel.nombre}</p>
                  <p className="text-[11px] text-gray-400">{agenteSel.rol}</p>
                </div>
                <button onClick={() => setSeleccion(null)} className="text-gray-500 text-xs">cerrar</button>
              </div>
              <p className="text-xs text-gray-200 mt-2">{equipo[agenteSel.id]?.texto}</p>
              {agenteSel.id === "investigador" && (
                <div className="mt-2 flex gap-2">
                  {inv.fila && <button onClick={() => setVerInforme(true)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-lime-300 text-emerald-950"><FileSearch className="w-3.5 h-3.5" /> Ver informe</button>}
                  <button onClick={investigar} disabled={inv.investigando} className="flex-1 text-xs py-1.5 rounded-lg border border-lime-500/40 text-lime-200 disabled:opacity-40">
                    {inv.investigando ? "Investigando…" : "Investigar ahora"}
                  </button>
                </div>
              )}
              {agenteSel.id === "estratega" && hayReunion && (
                <button onClick={() => setReunion(true)} className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-lime-300 text-emerald-950">Ir a la reunión</button>
              )}
            </div>
          )}
        </div>

        {/* Panel */}
        <div className="space-y-3">
          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Equipo</p>
            {agentes.map((a) => (
              <button key={a.id} onClick={() => (a.id === "investigador" && inv.fila ? setVerInforme(true) : setSeleccion(a.id))} className="w-full flex items-center gap-2 text-left">
                <span className="w-9 h-11 rounded-lg flex items-end justify-center flex-shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><Retrato agente={a} look={a.look} tam={42} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white leading-tight">{a.nombre} <span className="text-[11px] text-gray-500">· {a.rol}</span></span>
                  <span className="block text-[11px] text-gray-400 truncate">{equipo[a.id]?.texto}</span>
                </span>
                {equipo[a.id]?.trabajando && <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-3 flex items-center gap-2" style={tarjeta}>
            <Instagram className="w-5 h-5 text-pink-300 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-xs">
              {ig.cargando ? <span className="text-gray-400">Revisando Instagram…</span>
                : ig.usuario ? <span className="text-gray-200">Conectado como <b className="text-white">@{ig.usuario}</b>{!ig.renovacionAutomatica && <span className="block text-[10px] text-amber-300">El permiso vence en 60 días: activa la renovación automática (KV)</span>}</span>
                : <span className="text-amber-300">Instagram sin conectar. {nombre("community")} no puede publicar todavía.</span>}
            </div>
          </div>

          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pedir plan a {nombre("estratega")}</p>
            <div className="flex gap-2">
              {[["esta", "Esta semana"], ["proxima", "Próxima"]].map(([id, t]) => (
                <button key={id} onClick={() => setForm((f) => ({ ...f, semana: id }))}
                  className={`flex-1 text-xs py-1.5 rounded-lg border ${form.semana === id ? "bg-emerald-700/50 border-emerald-400 text-white" : "border-emerald-900/60 text-gray-400"}`}>{t}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              Publicaciones
              <input type="range" min={2} max={7} value={form.cantidad} onChange={(e) => setForm((f) => ({ ...f, cantidad: +e.target.value }))} className="flex-1 accent-lime-400" />
              <span className="text-white w-4 text-center">{form.cantidad}</span>
            </label>
            <textarea value={form.indicaciones} onChange={(e) => setForm((f) => ({ ...f, indicaciones: e.target.value }))} rows={2}
              placeholder="Opcional: ej. esta semana enfócate en el puente festivo y la mariposa 88"
              className="w-full bg-black/40 border border-emerald-900/50 rounded-lg text-white text-xs px-2 py-1.5" />
            <button onClick={pedirPlan} disabled={generando || !!error}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl bg-lime-400 text-emerald-950 disabled:opacity-40">
              {generando ? <><Loader2 className="w-4 h-4 animate-spin" /> {nombre("estratega")} está pensando…</> : <><Sparkles className="w-4 h-4" /> Armar plan y convocar reunión</>}
            </button>
            {errorPlan && <p className="text-[11px] text-red-300">{errorPlan}</p>}
          </div>
        </div>
      </div>

      {/* Plan aprobado */}
      <div className="rounded-2xl p-3 sm:p-4 space-y-2" style={tarjeta}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan aprobado</p>
        {cargando ? <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
          : !visibles.length ? <p className="text-sm text-gray-500">Todavía no hay publicaciones aprobadas. Pídele un plan a {nombre("estratega")}.</p>
          : (
            <div className="divide-y divide-emerald-900/40">
              {visibles.map((f) => {
                const est = ESTADOS[f.estado] || ESTADOS.aprobada;
                const Icono = f.tipo === "reel" ? Film : LayoutGrid;
                return (
                  <div key={f.id} className="py-2 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5">
                    <Icono className={`w-4 h-4 flex-shrink-0 ${f.tipo === "reel" ? "text-fuchsia-300" : "text-sky-300"}`} />
                    <div className="flex-1 min-w-0 basis-[calc(100%-2rem)] sm:basis-auto">
                      <p className="text-sm text-white truncate">{f.tema}</p>
                      <p className="text-[11px] text-gray-500">{fechaBonita(f.fecha_publicacion)}</p>
                      {f.error && <p className="text-[11px] text-red-300">⚠ {f.error}</p>}
                    </div>
                    <span className="ml-7 sm:ml-0 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: est.color, border: `1px solid ${est.color}66` }}>{est.texto}</span>
                    {f.estado === "lista" && (
                      <>
                        <button onClick={() => programar(f)} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-950 bg-pink-300 px-2 py-1 rounded-lg">
                          <CalendarClock className="w-3 h-3" /> Programar
                        </button>
                        <button onClick={() => publicarYa(f)} disabled={publicando === f.id} className="flex items-center gap-1 text-[11px] text-pink-200 border border-pink-400/50 px-2 py-1 rounded-lg disabled:opacity-40">
                          {publicando === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Publicar ya
                        </button>
                      </>
                    )}
                    {f.estado === "programada" && (
                      <button onClick={() => actualizarFila(f.id, { estado: "lista" })} className="text-[11px] text-gray-300 border border-white/15 px-2 py-1 rounded-lg">Cancelar</button>
                    )}
                    {f.estado === "publicada" && f.ig_permalink && (
                      <a href={f.ig_permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-lime-300 border border-lime-500/40 px-2 py-1 rounded-lg">
                        Ver <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {["aprobada", "en_produccion"].includes(f.estado) && (
                      <button onClick={() => producir(f)} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-950 bg-lime-300 px-2 py-1 rounded-lg">
                        <Play className="w-3 h-3" /> {f.estado === "aprobada" ? "Producir" : "Abrir"}
                      </button>
                    )}
                    <button onClick={() => actualizarFila(f.id, { estado: "descartada" })} className="ml-auto sm:ml-0 text-[11px] text-gray-500 hover:text-red-300">quitar</button>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {verInforme && inv.fila && (
        <InformeInvestigacion fila={inv.fila} agente={agentes.find((a) => a.id === "investigador")} onCerrar={() => setVerInforme(false)} />
      )}
      {editarEquipo && <EditorAvatares cfg={cfgAvatares} onGuardar={guardarAvatares} onCerrar={() => setEditarEquipo(false)} />}
      {reunion && (
        <ReunionSala agentes={agentes} propuestas={propuestas} resumen={resumen} onActualizar={actualizarFila} onCerrar={() => setReunion(false)} />
      )}
    </div>
  );
}
