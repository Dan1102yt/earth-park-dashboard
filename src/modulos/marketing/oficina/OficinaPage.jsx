// Oficina IA: el equipo de agentes de marketing de Earth Park trabajando en una oficina en pixel art.
// El Estratega arma el plan semanal → reunión contigo (apruebas / cambias / descartas) → producción → publicación.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clapperboard, Scissors, Images, Loader2, Sparkles, Users, AlertCircle, Film, LayoutGrid, Play, RefreshCw, Palette, FileSearch, Send, CalendarClock, ExternalLink, Instagram } from "lucide-react";
import { W, H, ESCALA, AGENTES, dibujarOficina, posicionAgente, POS_SILLA_OSCAR } from "./mapaOficina";
import { usePlan, lunesDe, lunesSiguiente, ESTADOS } from "./usePlan";
import { pedirPlanSemana, fechaColombia, fechaBonita } from "./planPrompt";
import ReunionSala from "./ReunionSala";
import InformeInvestigacion from "./InformeInvestigacion";
import EditorAvatares, { useAvatares, Retrato } from "./EditorAvatares";
import { ultimoInforme, informeVencido, investigar as investigarIvan, informeParaPlan, PEDIDOS_RAPIDOS, informesAnteriores } from "./investigacion";
import { actualizarKpis, historialKpis, conVariacion, cuentasSeguidas, DIAS_ENTRE_KPIS } from "./kpisRedes";
import { estadoInstagram, publicarAhora } from "./instagram";
import SubirALu from "./SubirALu";
import { aInputLocal, desdeInputLocal } from "./planPrompt";
import { useJuego } from "./useJuego";
import { misionDeHoy } from "./juego";
import { IndicadoresJuego, RutaSemana, MisionHoy, NivelAgente, Recompensas } from "./PanelJuego";

const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
// Accesos a las secciones donde se produce el contenido
const HERRAMIENTAS = [
  ["/marketing/agente", LayoutGrid, "Carruseles", "Imágenes, historias y estrategia"],
  ["/marketing/cine", Clapperboard, "Reels con IA", "Video documental 9:16"],
  ["/marketing/animado", Film, "Animados", "Videos explicativos"],
  ["/marketing/editor-video", Scissors, "Editar mis videos", "Sube tu video y edítalo"],
  ["/marketing/galeria-web", Images, "Fotos web", "Qué sale en la página"],
];
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

  const { cfg: cfgAvatares, guardar: guardarAvatares, agentes, listo: cfgListo } = useAvatares();
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
  const avance = useRef({ global: 0, cafe: {} });
  const looks = useMemo(() => Object.fromEntries(agentes.map((a) => [a.id, a.look])), [agentes]);
  // KPI del tablero: avance del plan de esta semana (se actualiza solo con cada cambio)
  const kpis = useMemo(() => {
    const semana = items.filter((i) => i.semana === lunesDe() && i.estado !== "descartada");
    const en = (...es) => semana.filter((i) => es.includes(i.estado)).length;
    const proximas = items.filter((i) => i.estado === "programada" && i.fecha_publicacion && new Date(i.fecha_publicacion) > new Date())
      .sort((a, b) => a.fecha_publicacion.localeCompare(b.fecha_publicacion));
    return {
      total: semana.length,
      aprobadas: en("aprobada", "en_produccion", "lista", "programada", "publicada"),
      producidas: en("lista", "programada", "publicada"),
      publicadas: en("publicada"),
      proxima: proximas[0] ? new Date(proximas[0].fecha_publicacion).toLocaleString("es-CO", { timeZone: "America/Bogota", weekday: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null,
    };
  }, [items]);
  const decoracion = cfgAvatares?._juego?.compradas;
  const datos = useRef({ equipo, hayReunion, looks, kpis, decoracion });
  datos.current = { equipo, hayReunion, looks, kpis, decoracion };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return undefined;
    let raf, previo = performance.now();
    const cuadro = (ahora) => {
      const dt = Math.min(0.1, (ahora - previo) / 1000); previo = ahora;
      const { equipo: eq, hayReunion: hr, looks: lk, kpis: kp, decoracion: deco } = datos.current;
      const estados = {};
      // En reunión todos caminan a la mesa, uno detrás de otro; al terminar vuelven a su escritorio
      const objetivo = hr ? 1 : 0;
      const g = avance.current.global || 0;
      avance.current.global = objetivo > g ? Math.min(1, g + dt / (DUR_CAMINATA * 1.6)) : Math.max(0, g - dt / (DUR_CAMINATA * 1.6));
      const S = 0.15;
      AGENTES.forEach((a, i) => {
        const k = Math.min(1, Math.max(0, avance.current.global * (1 + S * (AGENTES.length - 1)) - S * i));
        // Quien no tiene trabajo se va un rato al café (cada agente a su hora, para que la oficina se vea viva)
        const libre = !eq[a.id]?.trabajando && !hr;
        const ciclo = (ahora / 1000 + i * 13) % 75;
        const quiereCafe = libre && ciclo < 20;
        const c = avance.current.cafe[a.id] || 0;
        avance.current.cafe[a.id] = quiereCafe ? Math.min(1, c + dt / 3.5) : Math.max(0, c - dt / 3.5);
        estados[a.id] = { trabajando: !!eq[a.id]?.trabajando, enReunion: k, enCafe: k > 0 ? 0 : avance.current.cafe[a.id] };
        const el = etiquetas.current[a.id];
        if (el) {
          // En la mesa de reuniones solo se ve el ícono (los nombres se amontonan)
          const nombre = el.querySelector("[data-nombre]");
          if (nombre) nombre.style.display = estados[a.id].enReunion > 0 || estados[a.id].enCafe > 0 ? "none" : "";
          const p = posicionAgente(a, estados[a.id].enReunion, estados[a.id].enCafe);
          el.style.left = `${(p.x / W) * 100}%`;
          el.style.top = `${(p.y / H) * 100}%`;
        }
      });
      if (oscarRef.current) {
        const p = POS_SILLA_OSCAR();
        oscarRef.current.style.left = `${(p.x / W) * 100}%`;
        oscarRef.current.style.top = `${(p.y / H) * 100}%`;
      }
      dibujarOficina(ctx, ahora / 1000, estados, { reunionPendiente: hr, looks: lk, kpis: kp, decoracion: deco || [] });
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ─── Iván: números de redes (cada semana) + investigación a pedido o semanal ─── */
  const [redes, setRedes] = useState({ datos: null, cargando: false, error: null });
  const kpisRef = useRef(null);
  const traerKpis = async () => {
    setRedes((k) => ({ ...k, cargando: true, error: null }));
    try {
      const [ant] = await historialKpis(1);
      const nuevo = await actualizarKpis();
      const datos = conVariacion(nuevo, ant?.resultado);
      kpisRef.current = datos;
      setRedes({ datos, cargando: false, error: null });
      return datos;
    } catch (e) {
      setRedes((k) => ({ ...k, cargando: false, error: e.message }));
      return kpisRef.current;
    }
  };
  const [pedidoIvan, setPedidoIvan] = useState("");
  const [anteriores, setAnteriores] = useState(null);
  const investigar = async (pedido = "") => {
    setInv((v) => ({ ...v, investigando: true, error: null }));
    try {
      const fila = await investigarIvan({ pedido, kpis: kpisRef.current, cuentas: cuentasSeguidas() });
      setInv({ fila, investigando: false, error: null, revisado: true });
      setPedidoIvan(""); setAnteriores(null);
      setVerInforme(fila);
    } catch (e) {
      setInv((v) => ({ ...v, investigando: false, error: e.message }));
    }
  };
  useEffect(() => {
    if (cargando || error || inv.revisado) return;
    setInv((v) => ({ ...v, revisado: true }));
    (async () => {
      // Números: la última foto; si tiene más de una semana, se toma una nueva
      const hist = await historialKpis(2);
      let datos = hist[0] ? conVariacion(hist[0].resultado, hist[1]?.resultado) : null;
      kpisRef.current = datos; setRedes((k) => ({ ...k, datos }));
      if (!hist[0] || Date.now() - new Date(hist[0].creado_at).getTime() > DIAS_ENTRE_KPIS * 86400000) datos = await traerKpis();
      const fila = await ultimoInforme();
      setInv((v) => ({ ...v, fila }));
      if (informeVencido(fila)) {
        setInv((v) => ({ ...v, investigando: true }));
        investigarIvan({ kpis: datos, cuentas: cuentasSeguidas() })
          .then((f) => setInv({ fila: f, investigando: false, error: null, revisado: true }))
          .catch((e) => setInv((v) => ({ ...v, investigando: false, error: e.message })));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, error]);

  /* ─── Instagram ─── */
  const [ig, setIg] = useState({ cargando: true });
  const [publicando, setPublicando] = useState(null);
  useEffect(() => {
    estadoInstagram().then((d) => setIg(d)).catch((e) => setIg({ error: e.message }));
  }, []);
  const [subir, setSubir] = useState(false);

  /* ─── Juego: nivel, monedas, ruta y misión ─── */
  const { juego, filas: historial, compradas, comprar, seguidores } = useJuego(items, cfgAvatares, guardarAvatares, ig.seguidores, cfgListo);
  const mision = useMemo(() => misionDeHoy(historial, {
    hayPlanProxima: items.some((i) => i.semana === lunesSiguiente() && i.estado !== "descartada"),
    estratega: nombre("estratega"), lu: nombre("community"),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [historial, items, agentes]);
  const planRef = useRef(null);
  const ivanRef = useRef(null);
  const formRef = useRef(null);
  const verPlan = () => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const accionMision = () => {
    if (mision.tipo === "reunion") setReunion(true);
    else if (mision.tipo === "producir" && mision.fila) producir(mision.fila);
    else if (mision.tipo === "programar") verPlan();
    else if (mision.tipo === "plan") { setForm((f) => ({ ...f, semana: "proxima" })); formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }
  };
  const programar = (f) => {
    if (!f.fecha_publicacion) { actualizarFila(f.id, { error: "Ponle fecha y hora antes de programar" }); return; }
    if (new Date(f.fecha_publicacion) <= new Date()) { publicarYa(f); return; }
    actualizarFila(f.id, { estado: "programada", error: null });
  };
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
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-lime-300" /> Marketing · Oficina IA</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Tu equipo de marketing: planea, te consulta en reunión, produce y publica</p>
        </div>
        <button onClick={() => setEditarEquipo(true)} className="flex items-center gap-1 text-xs text-lime-200 border border-lime-500/40 rounded-lg px-2 py-1" title="Diseñar avatares">
          <Palette className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Diseñar equipo</span>
        </button>
        <button onClick={recargar} className="text-gray-400 hover:text-white p-1" title="Actualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Herramientas de producción (deslizables en el celular) */}
      <div className="flex gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
        {HERRAMIENTAS.map(([to, Icono, titulo, desc]) => (
          <Link key={to} to={to} className="flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 border border-emerald-900/60 hover:border-emerald-600/60" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icono className="w-4 h-4 text-emerald-400" />
            <span className="leading-tight">
              <span className="block text-xs font-semibold text-white whitespace-nowrap">{titulo}</span>
              <span className="hidden sm:block text-[10px] text-gray-500 whitespace-nowrap">{desc}</span>
            </span>
          </Link>
        ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <div className="space-y-3 min-w-0">
        <IndicadoresJuego juego={juego} seguidores={seguidores} />
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
                  {inv.fila && <button onClick={() => setVerInforme(inv.fila)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-lime-300 text-emerald-950"><FileSearch className="w-3.5 h-3.5" /> Ver informe</button>}
                  <button onClick={() => { setSeleccion(null); ivanRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="flex-1 text-xs py-1.5 rounded-lg border border-lime-500/40 text-lime-200">
                    Pedirle algo
                  </button>
                </div>
              )}
              {agenteSel.id === "estratega" && hayReunion && (
                <button onClick={() => setReunion(true)} className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg bg-lime-300 text-emerald-950">Ir a la reunión</button>
              )}
            </div>
          )}
        </div>
        <RutaSemana juego={juego} onDia={verPlan} />
        <MisionHoy mision={mision} onAccion={accionMision} />
        </div>

        {/* Panel */}
        <div className="space-y-3">
          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Equipo</p>
            {agentes.map((a) => (
              <button key={a.id} onClick={() => (a.id === "investigador" && inv.fila ? setVerInforme(inv.fila) : setSeleccion(a.id))} className="w-full flex items-center gap-2 text-left">
                <span className="w-9 h-11 rounded-lg flex items-end justify-center flex-shrink-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><Retrato agente={a} look={a.look} tam={42} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white leading-tight">{a.nombre} <span className="text-[11px] text-gray-500">· {a.rol}</span></span>
                  <span className="block text-[11px] text-gray-400 truncate">{equipo[a.id]?.texto}</span>
                </span>
                {equipo[a.id]?.trabajando && <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />}
                <NivelAgente n={juego.agentes[a.id]} />
              </button>
            ))}
          </div>

          <div ref={ivanRef} className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pedirle a {nombre("investigador")}</p>
              {inv.fila && <button onClick={() => setVerInforme(inv.fila)} className="text-[11px] text-lime-300">Último informe</button>}
            </div>
            <textarea value={pedidoIvan} onChange={(e) => setPedidoIvan(e.target.value)} rows={2}
              placeholder="¿Qué quieres que investigue? Ej: por qué Macana Aventuras tiene más reservas en puentes"
              className="w-full bg-black/40 border border-emerald-900/50 rounded-lg text-white text-xs px-2 py-1.5" />
            <div className="flex flex-wrap gap-1">
              {PEDIDOS_RAPIDOS.map((p) => (
                <button key={p} onClick={() => setPedidoIvan(p)} className="text-[10px] text-left px-2 py-1 rounded-full text-emerald-300 border border-emerald-800/60">{p}</button>
              ))}
            </div>
            <button onClick={() => investigar(pedidoIvan)} disabled={inv.investigando || !!error}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl bg-lime-400 text-emerald-950 disabled:opacity-40">
              {inv.investigando ? <><Loader2 className="w-4 h-4 animate-spin" /> {nombre("investigador")} está investigando (1–3 min)…</> : <><FileSearch className="w-4 h-4" /> {pedidoIvan.trim() ? "Investigar esto" : "Investigación de la semana"}</>}
            </button>
            {inv.error && <p className="text-[11px] text-red-300">{inv.error}</p>}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-900/40 text-[11px]">
              <span className="text-gray-400 min-w-0 truncate">
                {redes.cargando ? "Trayendo números de Instagram…"
                  : redes.datos ? `Números del ${new Date(redes.datos.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · ${redes.datos.cuentas.filter((c) => !c.error).length} cuentas`
                  : redes.error ? <span className="text-amber-300">Sin números: {redes.error}</span> : "Sin números todavía"}
              </span>
              <span className="flex gap-2 flex-shrink-0">
                {redes.datos && <button onClick={() => setVerInforme({ tema: "Números de redes", creado_at: redes.datos.fecha, resultado: { soloNumeros: true, titulo: "Números de redes", resumen: "Comparación de Earth Park con la competencia y los referentes.", kpis: redes.datos } })} className="text-lime-300">Ver</button>}
                <button onClick={traerKpis} disabled={redes.cargando} className="text-sky-300 disabled:opacity-40">Actualizar</button>
              </span>
            </div>
            <button onClick={() => (anteriores ? setAnteriores(null) : informesAnteriores().then(setAnteriores))} className="text-[11px] text-gray-400 underline">
              {anteriores ? "Ocultar informes anteriores" : "Ver informes anteriores"}
            </button>
            {anteriores && (anteriores.length ? anteriores.map((f) => (
              <button key={f.id} onClick={() => setVerInforme(f)} className="w-full text-left text-[11px] text-gray-300 truncate">
                <span className="text-gray-500">{new Date(f.creado_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span> · {f.resultado?.titulo || f.tema}
              </button>
            )) : <p className="text-[11px] text-gray-500">No hay informes anteriores.</p>)}
          </div>

          <Recompensas juego={juego} compradas={compradas} onComprar={comprar} />

          <div className="rounded-2xl p-3 flex items-center gap-2" style={tarjeta}>
            <Instagram className="w-5 h-5 text-pink-300 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-xs">
              {ig.cargando ? <span className="text-gray-400">Revisando Instagram…</span>
                : ig.usuario ? <span className="text-gray-200">Conectado como <b className="text-white">@{ig.usuario}</b>{!ig.renovacionAutomatica && <span className="block text-[10px] text-amber-300">El permiso vence en 60 días: activa la renovación automática (KV)</span>}</span>
                : <span className="text-amber-300">Instagram sin conectar. {nombre("community")} no puede publicar todavía.</span>}
            </div>
            <button onClick={() => setSubir(true)} className="flex-shrink-0 text-[11px] font-semibold text-pink-950 bg-pink-300 px-2 py-1.5 rounded-lg">
              Entregar a {nombre("community")}
            </button>
          </div>

          <div ref={formRef} className="rounded-2xl p-3 space-y-2" style={tarjeta}>
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
      <div ref={planRef} className="rounded-2xl p-3 sm:p-4 space-y-2 scroll-mt-4" style={tarjeta}>
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
                        <input type="datetime-local" value={aInputLocal(f.fecha_publicacion)}
                          onChange={(e) => actualizarFila(f.id, { fecha_publicacion: desdeInputLocal(e.target.value), error: null })}
                          className="bg-black/40 border border-pink-900/60 rounded-md text-white text-[11px] px-1.5 py-1" style={{ width: "auto" }} />
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
                    {["aprobada", "en_produccion", "lista"].includes(f.estado) && (
                      <button onClick={() => actualizarFila(f.id, { estado: "publicada", error: null })} title="Si ya la subiste a Instagram por otro lado"
                        className="text-[11px] text-gray-400 hover:text-lime-300">ya la publiqué</button>
                    )}
                    <button onClick={() => actualizarFila(f.id, { estado: "descartada" })} className="ml-auto sm:ml-0 text-[11px] text-gray-500 hover:text-red-300">quitar</button>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {subir && <SubirALu nombreLu={nombre("community")} onListo={recargar} onCerrar={() => setSubir(false)} />}
      {verInforme && (
        <InformeInvestigacion fila={verInforme} agente={agentes.find((a) => a.id === "investigador")} kpisActuales={redes.datos} onCerrar={() => setVerInforme(false)} />
      )}
      {editarEquipo && <EditorAvatares cfg={cfgAvatares} onGuardar={guardarAvatares} onCerrar={() => setEditarEquipo(false)} />}
      {reunion && (
        <ReunionSala agentes={agentes} propuestas={propuestas} resumen={resumen} onActualizar={actualizarFila} onCerrar={() => setReunion(false)} />
      )}
    </div>
  );
}
