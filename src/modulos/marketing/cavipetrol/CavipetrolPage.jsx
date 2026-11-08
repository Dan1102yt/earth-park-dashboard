// Cavipetrol: piezas para el convenio CaviAliados (historias, posts y banner web) con la plantilla fija de la marca,
// revisión automática de los lineamientos y la entrega de cada lunes. Lineamientos en cerebro/cavipetrol.md.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Images, Upload, Sparkles, ShieldCheck, Loader2, Check, X, Save, Trash2 } from "lucide-react";
import { supabase } from "../../../compartido/lib/supabaseClient";
import SelectorFotos from "../comun/SelectorFotos";
import { extraerObjetoJSON } from "../agente/agenteApi";
import { PLANES } from "../../../configuracion/planesConfig";
import GUIA from "@cerebro/cavipetrol.md?raw";
import {
  FORMATOS, PLANTILLAS, COLORES, FUENTES, CTAS, INCLUYE_CORTO, PIEZA_INICIAL, dibujarPieza, dibujarZonaSegura, revisarLineamientos, nombrePlan,
} from "./piezas";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const campo = "w-full bg-black/40 border border-emerald-900/50 rounded-lg text-white text-sm px-3 py-2";
const RUTA_LOGO = "marca/cavipetrol-aliados.png";

const cargarImagen = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
const urlLogoCavi = () => supabase?.storage.from("videos").getPublicUrl(RUTA_LOGO).data.publicUrl;

/** Lunes de entrega: hoy si es lunes, si no el próximo. */
function proximoLunes() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
  return d;
}

async function preguntarClaude(prompt) {
  const res = await fetch(WORKER_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Worker error ${res.status}`);
  const d = await res.json();
  const obj = extraerObjetoJSON((d.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
  if (!obj) throw new Error("La IA respondió algo que no se pudo leer. Intenta de nuevo.");
  return obj;
}

export default function CavipetrolPage() {
  const [p, setP] = useState(PIEZA_INICIAL);
  const cambiar = (c) => setP((x) => ({ ...x, ...c }));
  const [recursos, setRecursos] = useState({});
  const [zona, setZona] = useState(true);
  const [elegirFoto, setElegirFoto] = useState(false);
  const [ia, setIa] = useState({ cargando: null, revision: null, error: null });
  const [semana, setSemana] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const canvasRef = useRef(null);
  const lunes = useMemo(proximoLunes, []);

  // Logos: Earth Park (del sitio) y Cavipetrol/CaviAliados (subido una vez a Supabase)
  useEffect(() => {
    cargarImagen(`${import.meta.env.BASE_URL}logo-earth-park.png`).then((logoEP) => setRecursos((r) => ({ ...r, logoEP }))).catch(() => {});
    const u = urlLogoCavi();
    if (u) cargarImagen(`${u}?v=${Date.now()}`).then((logoCavi) => setRecursos((r) => ({ ...r, logoCavi }))).catch(() => {});
  }, []);

  // Piezas guardadas para la entrega de esta semana
  const cargarSemana = async () => {
    if (!supabase) return;
    const desde = new Date(lunes); desde.setDate(desde.getDate() - 7);
    const { data } = await supabase.from("marketing_agente").select("id, creado_at, resultado").eq("modo", "cavipetrol")
      .gte("creado_at", desde.toISOString()).order("creado_at", { ascending: false });
    setSemana(data || []);
  };
  useEffect(() => { cargarSemana(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Dibujar (espera la fuente de la marca)
  useEffect(() => {
    let vivo = true;
    Promise.all(["Bree Serif", "Outfit", "Montserrat", "Poppins"].map((f) => document.fonts.load(`60px '${f}'`))).finally(() => {
      if (!vivo || !canvasRef.current) return;
      dibujarPieza(canvasRef.current, p, recursos);
      if (zona) dibujarZonaSegura(canvasRef.current, p.formato);
    });
    return () => { vivo = false; };
  }, [p, recursos, zona]);

  const checklist = revisarLineamientos(p, recursos);
  const F = FORMATOS[p.formato];

  const usarFoto = async (f) => {
    setElegirFoto(false);
    try {
      const r = await fetch(`${WORKER_URL}/drive/image?id=${encodeURIComponent(f.id)}`);
      const foto = await createImageBitmap(await r.blob());
      setRecursos((x) => ({ ...x, foto }));
    } catch { setIa((x) => ({ ...x, error: "No se pudo cargar esa foto de Drive" })); }
  };
  const subirFoto = async (archivo) => { if (!archivo) return; const foto = await createImageBitmap(archivo); setRecursos((x) => ({ ...x, foto })); };
  const subirLogo = async (archivo) => {
    if (!archivo || !supabase) return;
    const { error } = await supabase.storage.from("videos").upload(RUTA_LOGO, archivo, { upsert: true, contentType: archivo.type || "image/png" });
    if (error) { setIa((x) => ({ ...x, error: `No se pudo subir el logo: ${error.message}` })); return; }
    const logoCavi = await cargarImagen(`${urlLogoCavi()}?v=${Date.now()}`);
    setRecursos((r) => ({ ...r, logoCavi }));
  };

  /** Imagen final, sin la guía de zona segura. */
  const archivoFinal = () => new Promise((res) => {
    const c = document.createElement("canvas");
    dibujarPieza(c, p, recursos);
    c.toBlob(res, "image/jpeg", 0.92);
  });
  const nombreArchivo = () => `cavipetrol-${F.nombre.toLowerCase().replace(/\s+/g, "-")}-${new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })}.jpg`;
  const descargarBlob = (blob, nombre) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const descargar = async () => descargarBlob(await archivoFinal(), nombreArchivo());

  const guardar = async () => {
    if (!supabase) return;
    setGuardando(true);
    try {
      const blob = await archivoFinal();
      const ruta = `cavipetrol/${Date.now()}-${p.formato}.jpg`;
      const { error } = await supabase.storage.from("videos").upload(ruta, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      const url = supabase.storage.from("videos").getPublicUrl(ruta).data.publicUrl;
      await supabase.from("marketing_agente").insert({ modo: "cavipetrol", tema: `${F.nombre}: ${p.titulo || p.mensaje}`.slice(0, 200), resultado: { ...p, url, nombre: nombreArchivo() } });
      await cargarSemana();
    } catch (e) { setIa((x) => ({ ...x, error: `No se pudo guardar: ${e.message}` })); }
    finally { setGuardando(false); }
  };
  const borrar = async (id) => { await supabase.from("marketing_agente").delete().eq("id", id); cargarSemana(); };
  const descargarSemana = async () => {
    for (const f of semana) {
      const r = await fetch(f.resultado.url); descargarBlob(await r.blob(), f.resultado.nombre || "cavipetrol.jpg");
      await new Promise((ok) => setTimeout(ok, 400));
    }
  };

  const sugerir = async () => {
    setIa({ cargando: "sugerir", revision: null, error: null });
    try {
      const plan = PLANES[p.plan];
      const r = await preguntarClaude(`${GUIA}

Escribe los textos de una pieza tipo "${PLANTILLAS[p.plantilla].nombre}" (${F.nombre} ${F.w}x${F.h}) para los afiliados de Cavipetrol.
Plan: ${plan?.nombre} (${p.plan}). Oferta: ${p.oferta}. ${p.titulo ? `Idea o fecha: ${p.titulo}.` : ""}
Español de Colombia, con "tú", cálido. Cumple los lineamientos: un solo mensaje, título de máximo 7 palabras, mensaje de máximo 18 palabras.
Responde SOLO JSON: {"titulo":"...","mensaje":"...","cta":"uno de: ${CTAS.join(" | ")}"}`);
      cambiar({ titulo: r.titulo || p.titulo, mensaje: r.mensaje || p.mensaje, cta: CTAS.includes(r.cta) ? r.cta : p.cta });
      setIa({ cargando: null, revision: null, error: null });
    } catch (e) { setIa({ cargando: null, revision: null, error: e.message }); }
  };

  const revisar = async () => {
    setIa({ cargando: "revisar", revision: null, error: null });
    try {
      const r = await preguntarClaude(`${GUIA}

Revisa esta pieza para Cavipetrol como lo haría su equipo antes de publicarla.
Formato: ${F.nombre}. Título: "${p.titulo}". Oferta: "${p.oferta}". Mensaje: "${p.mensaje}". CTA: "${p.cta}".
${p.plantilla === "plan" ? `Incluye: ${p.incluye.replace(/\n/g, ", ")}. Teléfonos: ${p.telefonos}.` : ""}
Responde SOLO JSON: {"aprobada":true|false,"se_entiende_en_3s":true|false,"ortografia":["errores encontrados, vacío si no hay"],
"que_se_ofrece":"...","a_quien":"...","beneficio":"...","sugerencias":["máximo 3, concretas"]}`);
      setIa({ cargando: null, revision: r, error: null });
    } catch (e) { setIa({ cargando: null, revision: null, error: e.message }); }
  };

  const chip = (activo) => `text-xs px-3 py-1.5 rounded-lg border ${activo ? "bg-emerald-700/60 border-emerald-400 text-white" : "border-emerald-900/60 text-gray-400"}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/marketing" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white">Cavipetrol · CaviAliados</h1>
          <p className="text-xs text-gray-400">Entrega de piezas: <b className="text-lime-300">lunes {lunes.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</b> · {semana.length} lista{semana.length === 1 ? "" : "s"} esta semana</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
        {/* Vista previa */}
        <div className="space-y-2 lg:sticky lg:top-4">
          <div className="rounded-2xl p-3 flex justify-center" style={{ ...tarjeta, background: "#0b1a0b" }}>
            <canvas ref={canvasRef} className="rounded-lg shadow-lg"
              style={{ width: p.formato === "banner" ? "100%" : `min(100%, calc(70dvh * ${F.w} / ${F.h}))`, aspectRatio: `${F.w} / ${F.h}` }} />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setZona((z) => !z)} className={chip(zona)}>{zona ? "Ocultar" : "Ver"} zona segura</button>
            <button onClick={descargar} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white"><Download className="w-3.5 h-3.5" /> Descargar JPG</button>
            <button onClick={guardar} disabled={guardando} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-lime-400 text-emerald-950 disabled:opacity-50">
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar para el lunes
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-500">{F.w} × {F.h} px · la zona roja (bordes) no sale en la descarga, es solo una guía</p>
        </div>

        {/* Controles */}
        <div className="space-y-3">
          <div className="rounded-2xl p-3 space-y-2.5" style={tarjeta}>
            <div className="flex flex-wrap gap-1.5">{Object.entries(FORMATOS).map(([id, f]) => <button key={id} onClick={() => cambiar({ formato: id })} className={chip(p.formato === id)}>{f.nombre} <span className="opacity-60">{f.relacion}</span></button>)}</div>
            {p.formato !== "banner" && <div className="flex flex-wrap gap-1.5">{Object.entries(PLANTILLAS).map(([id, t]) => <button key={id} onClick={() => cambiar({ plantilla: id })} className={chip(p.plantilla === id)} title={t.desc}>{t.nombre}</button>)}</div>}
            <div className="flex flex-wrap gap-1.5 items-center">
              {Object.entries(COLORES).map(([id, c]) => <button key={id} onClick={() => cambiar({ color: id })} className={`w-8 h-8 rounded-full border-2 ${p.color === id ? "border-white" : "border-transparent"}`} style={{ background: c.base }} title={c.nombre} />)}
              <select value={p.fuente} onChange={(e) => cambiar({ fuente: e.target.value })} className={`${campo} !w-auto`} title="Tipografía">
                {Object.entries(FUENTES).map(([id, f]) => <option key={id} value={id} style={{ fontFamily: f.css }}>{f.nombre}</option>)}
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-300"><input type="checkbox" checked={p.mariposas} onChange={(e) => cambiar({ mariposas: e.target.checked })} className="accent-lime-400" /> Mariposas EP</label>
              <select value={p.plan} onChange={(e) => cambiar({ plan: e.target.value, incluye: (INCLUYE_CORTO[e.target.value] || []).join("\n") })} className={`${campo} !w-auto ml-auto`}>
                {Object.keys(PLANES).map((id) => <option key={id} value={id}>{nombrePlan(id)}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Textos</p>
              <button onClick={sugerir} disabled={!!ia.cargando} className="flex items-center gap-1 text-[11px] text-lime-300 disabled:opacity-40">
                {ia.cargando === "sugerir" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Sugerir con IA
              </button>
            </div>
            <input value={p.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} className={campo}
              placeholder={p.plantilla === "fecha" ? "Título: ej. Mes de la Madre en Earth Park" : "Título (opcional): ej. Reconecta con la naturaleza"} />
            <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-2">
              <input value={p.oferta} onChange={(e) => cambiar({ oferta: e.target.value })} className={campo} placeholder="10% OFF" title="Oferta: ej. 10% OFF, 25% DTO, 2x1" />
              <select value={p.cta} onChange={(e) => cambiar({ cta: e.target.value })} className={campo}>{CTAS.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <textarea value={p.mensaje} onChange={(e) => cambiar({ mensaje: e.target.value })} rows={2} className={campo} placeholder="Mensaje: beneficio claro en una frase" />
            {p.plantilla === "plan" && p.formato !== "banner" && (
              <>
                <textarea value={p.incluye} onChange={(e) => cambiar({ incluye: e.target.value })} rows={3} className={campo} placeholder="Qué incluye (uno por línea, máx. 9)" />
                <input value={p.telefonos} onChange={(e) => cambiar({ telefonos: e.target.value })} className={campo} placeholder="WhatsApp" />
              </>
            )}
            {p.formato === "banner" && <input value={p.legal} onChange={(e) => cambiar({ legal: e.target.value })} className={campo} placeholder="Nota legal" />}
          </div>

          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Foto y logos</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setElegirFoto(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-sky-500/40 text-sky-300"><Images className="w-3.5 h-3.5" /> Foto de Drive</button>
              <label className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-emerald-700/60 text-emerald-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Subir foto
                <input type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
              </label>
              <label className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-amber-500/40 text-amber-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> {recursos.logoCavi ? "Cambiar logo Cavipetrol" : "Subir logo Cavipetrol + CaviAliados"}
                <input type="file" accept="image/png,image/*" className="hidden" onChange={(e) => subirLogo(e.target.files?.[0])} />
              </label>
            </div>
            {!recursos.logoCavi && <p className="text-[11px] text-amber-300">Sube una sola vez el logo de Cavipetrol con CaviAliados (PNG, mejor con fondo transparente).</p>}
          </div>

          <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lineamientos de Cavipetrol</p>
              <button onClick={revisar} disabled={!!ia.cargando} className="flex items-center gap-1 text-[11px] text-lime-300 disabled:opacity-40">
                {ia.cargando === "revisar" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Revisar con IA
              </button>
            </div>
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.texto} className={`flex items-start gap-1.5 text-xs ${c.ok ? "text-gray-300" : "text-amber-300"}`}>
                  {c.ok ? <Check className="w-3.5 h-3.5 text-lime-400 mt-0.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />} {c.texto}
                </li>
              ))}
            </ul>
            {ia.revision && (
              <div className="rounded-lg p-2.5 text-xs space-y-1" style={{ background: ia.revision.aprobada ? "rgba(163,230,53,0.08)" : "rgba(251,191,36,0.08)" }}>
                <p className={`font-semibold ${ia.revision.aprobada ? "text-lime-300" : "text-amber-300"}`}>{ia.revision.aprobada ? "✓ Lista para enviar" : "Ajustar antes de enviar"} · {ia.revision.se_entiende_en_3s ? "se entiende en 3 s" : "tarda en entenderse"}</p>
                <p className="text-gray-300"><span className="text-gray-500">Qué:</span> {ia.revision.que_se_ofrece} · <span className="text-gray-500">Para:</span> {ia.revision.a_quien} · <span className="text-gray-500">Beneficio:</span> {ia.revision.beneficio}</p>
                {ia.revision.ortografia?.length > 0 && <p className="text-red-300">Ortografía: {ia.revision.ortografia.join(" · ")}</p>}
                {(ia.revision.sugerencias || []).map((s) => <p key={s} className="text-gray-300">• {s}</p>)}
              </div>
            )}
            {ia.error && <p className="text-[11px] text-red-300">{ia.error}</p>}
          </div>
        </div>
      </div>

      {/* Entrega del lunes */}
      <div className="rounded-2xl p-3 space-y-2" style={tarjeta}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Para enviar el lunes {lunes.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
          {semana.length > 0 && <button onClick={descargarSemana} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-950 bg-lime-300 px-2 py-1 rounded-lg"><Download className="w-3 h-3" /> Descargar todas</button>}
        </div>
        {semana.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {semana.map((f) => (
              <div key={f.id} className="relative flex-shrink-0">
                <img src={f.resultado.url} alt="" className="h-40 rounded-lg" />
                <button onClick={() => borrar(f.id)} className="absolute top-1 right-1 bg-black/70 rounded-full p-1" title="Quitar"><Trash2 className="w-3 h-3 text-red-300" /></button>
                <p className="text-[10px] text-gray-400 mt-0.5">{FORMATOS[f.resultado.formato]?.nombre}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-gray-500">Todavía no hay piezas guardadas para esta entrega. Arma una arriba y toca "Guardar para el lunes".</p>}
      </div>

      {elegirFoto && <SelectorFotos titulo="Foto para la pieza" onElegir={([f]) => usarFoto(f)} onCerrar={() => setElegirFoto(false)} />}
    </div>
  );
}
