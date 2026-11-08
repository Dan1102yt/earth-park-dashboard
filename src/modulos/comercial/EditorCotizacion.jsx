// Armar o editar una cotización: plan, personas, actividades por día, fotos, mensaje y PDF.
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Trash2, Plus, Eye, Download, Save, Check, Send, CalendarCheck, X, Copy, ImageIcon } from "lucide-react";
import { useAuth } from "../../compartido/contexto/AuthContext";
import {
  calcularCotizacion, itemsDesdePlan, itemDeCatalogo, pesos, tituloDia, ESTADOS, CODIGO_GUIA, UNIDADES, fechasTexto, quienesVienen,
} from "./calculo";
import { guardarCotizacion, subirPdf, urlFoto } from "./datos";
import DocumentoCotizacion from "./DocumentoCotizacion";
import ElegirFoto from "./ElegirFoto";
import { prepararImagenes, generarPdf } from "./pdf";

const campo = "w-full bg-black/30 border border-emerald-900/60 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-lime-400/60";
const etiqueta = "text-xs text-gray-400 mb-1 block";

export function cotizacionNueva(plan, catalogo, usuario) {
  return {
    estado: "borrador",
    cliente: { nombre: "", telefono: "", origen: "" },
    adultos: 2, ninos5: 0, menores5: 0,
    plan_id: plan?.id || null,
    llegada: "",
    tipo_cliente: "directo",
    descuento: 0,
    incluir_guia: true,
    dias_guia: plan?.dias || 1,
    items: itemsDesdePlan(plan, catalogo),
    fotos: structuredClone(plan?.fotos || {}),
    mensaje: plan?.mensaje || "",
    origen: "panel",
    creado_por: usuario?.nombre || usuario?.username || null,
  };
}

function Seccion({ titulo, children, derecha }) {
  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-lime-300 uppercase tracking-wide">{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
  );
}

function Numero({ label, value, onChange, min = 0 }) {
  return (
    <label className="block">
      <span className={etiqueta}>{label}</span>
      <input type="number" inputMode="numeric" min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} className={campo} />
    </label>
  );
}

export default function EditorCotizacion({ inicial, catalogo, planes, descuentos, empresa, onVolver, onGuardada }) {
  const { usuario } = useAuth();
  const [cot, setCot] = useState(inicial);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [eligiendo, setEligiendo] = useState(null); // { tipo: "portada" | "dias" | "tira", i }
  const [vista, setVista] = useState(null); // { imgs, logo, mariposas } para la vista previa
  const [paraPdf, setParaPdf] = useState(null);
  const hojasRef = useRef(null);

  const plan = planes.find((p) => p.id === cot.plan_id);
  const guia = catalogo.find((c) => c.codigo === CODIGO_GUIA);
  const actividades = catalogo.filter((c) => c.activo && c.codigo !== CODIGO_GUIA);
  const nDias = Math.max(plan?.dias || 1, ...cot.items.map((i) => i.dia || 1));

  const t = useMemo(() => calcularCotizacion({
    items: cot.items, adultos: cot.adultos, ninos5: cot.ninos5, menores5: cot.menores5,
    descuento: cot.descuento, incluirGuia: cot.incluir_guia, diasGuia: cot.dias_guia, guia,
  }), [cot, guia]);

  const cambiar = (parche) => setCot((c) => ({ ...c, ...parche }));
  const cambiarCliente = (k, v) => setCot((c) => ({ ...c, cliente: { ...c.cliente, [k]: v } }));

  const elegirPlan = (id) => {
    const p = planes.find((x) => x.id === id);
    if (!p) return;
    const tocado = cot.id && cot.plan_id !== id;
    if (tocado && !window.confirm("Al cambiar de plan se reemplazan las actividades, las fotos y el mensaje. ¿Seguimos?")) return;
    cambiar({ plan_id: id, items: itemsDesdePlan(p, catalogo), fotos: structuredClone(p.fotos || {}), mensaje: p.mensaje || "", dias_guia: p.dias || 1 });
  };

  const elegirTipo = (id) => {
    const d = descuentos.find((x) => x.id === id);
    cambiar({ tipo_cliente: id, descuento: d ? Number(d.porcentaje) : cot.descuento });
  };

  const quitarItem = (k) => cambiar({ items: cot.items.filter((_, i) => i !== k) });
  const precioItem = (k, v) => cambiar({ items: cot.items.map((it, i) => (i === k ? { ...it, precio: Math.max(0, Number(v) || 0) } : it)) });
  const agregarItem = (dia, codigo) => {
    const c = catalogo.find((x) => x.codigo === codigo);
    if (!c) return;
    const items = [...cot.items];
    let pos = items.length;
    for (let i = items.length - 1; i >= 0; i--) if ((items[i].dia || 1) <= dia) { pos = i + 1; break; }
    if (!items.some((x) => (x.dia || 1) <= dia)) pos = 0;
    items.splice(pos, 0, itemDeCatalogo(c, dia));
    cambiar({ items });
  };

  const ponerFoto = (ref) => {
    const { tipo, i } = eligiendo;
    setCot((c) => {
      const fotos = { ...c.fotos };
      if (tipo === "portada") fotos.portada = ref;
      else { const arr = [...(fotos[tipo] || [])]; arr[i] = ref; fotos[tipo] = arr; }
      return { ...c, fotos };
    });
    setEligiendo(null);
  };

  const fila = () => ({ ...cot, totales: t, items: cot.items });

  const guardar = async (parche = {}) => {
    setError("");
    if (!cot.plan_id) { setError("Elige un plan"); return null; }
    setOcupado("guardar");
    try {
      const g = await guardarCotizacion({ ...fila(), ...parche });
      setCot(g);
      onGuardada?.(g);
      setAviso(parche.estado ? `Quedó como "${ESTADOS[parche.estado].nombre}"` : "Guardada");
      setTimeout(() => setAviso(""), 2500);
      return g;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setOcupado("");
    }
  };

  const verPrevia = async () => {
    setOcupado("previa");
    setVista(await prepararImagenes(cot.fotos, t.dias, empresa));
    setOcupado("");
  };

  const descargar = async () => {
    setError("");
    const g = await guardar();
    if (!g) return;
    setOcupado("pdf");
    try {
      const recursos = vista || (await prepararImagenes(g.fotos, t.dias, empresa));
      setParaPdf({ cot: g, ...recursos });
      await new Promise((r) => setTimeout(r, 400)); // esperar a que se dibujen las hojas fuera de pantalla
      const blob = await generarPdf(hojasRef.current);
      const nombre = `Propuesta Earth Park ${g.numero} - ${g.cliente?.nombre || "cliente"}.pdf`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      try {
        const pdf_url = await subirPdf(blob, g);
        const g2 = await guardarCotizacion({ ...g, pdf_url });
        setCot(g2);
        onGuardada?.(g2);
      } catch { /* el PDF ya se descargó; guardarlo en la nube es un extra */ }
    } catch (e) {
      setError(`No se pudo crear el PDF: ${e.message}`);
    } finally {
      setParaPdf(null);
      setOcupado("");
    }
  };

  const textoWhatsApp = () => [
    `¡Hola, ${cot.cliente?.nombre || ""}! Te comparto la propuesta de Earth Park 🦋`,
    `*${plan?.nombre || ""}* · ${fechasTexto(cot.llegada, t.dias)}`,
    quienesVienen(cot),
    `Total: *${pesos(t.total)}* (${pesos(t.porPersona)} por persona que paga)`,
    t.guia ? `Si prefieren ir sin guía: ${pesos(t.totalSinGuia)}` : "",
    cot.pdf_url ? `Propuesta completa: ${cot.pdf_url}` : "",
    "Para separar la fecha: 50 % de anticipo. ¿Te ayudo con algo más?",
  ].filter(Boolean).join("\n");

  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoWhatsApp()); setAviso("Mensaje copiado"); setTimeout(() => setAviso(""), 2000); } catch { setError("No se pudo copiar"); }
  };

  const Miniatura = ({ refFoto, etiqueta: et, onClick }) => (
    <button onClick={onClick} className="relative rounded-xl overflow-hidden border border-emerald-900/60 aspect-[4/3] bg-black/30 group">
      {refFoto ? <img src={urlFoto(refFoto)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-500 m-auto" />}
      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[11px] text-white py-1 px-2 text-left">{et} · cambiar</span>
    </button>
  );

  const estado = ESTADOS[cot.estado] || ESTADOS.borrador;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-28">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onVolver} className="btn-ghost !px-2 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Cotizaciones</button>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white">{cot.numero ? `Cotización N° ${cot.numero}` : "Nueva cotización"}</h1>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${estado.color}22`, color: estado.color }}>{estado.nombre}</span>
        {cot.origen === "whatsapp" && <span className="text-xs text-sky-300">armada por el agente de WhatsApp</span>}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Seccion titulo="Cliente y plan">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block"><span className={etiqueta}>Nombre (así sale en el saludo)</span>
                <input className={campo} value={cot.cliente?.nombre || ""} onChange={(e) => cambiarCliente("nombre", e.target.value)} placeholder="Familia Pérez" /></label>
              <label className="block"><span className={etiqueta}>WhatsApp</span>
                <input className={campo} inputMode="tel" value={cot.cliente?.telefono || ""} onChange={(e) => cambiarCliente("telefono", e.target.value)} /></label>
              <label className="block"><span className={etiqueta}>Desde (ciudad)</span>
                <input className={campo} value={cot.cliente?.origen || ""} onChange={(e) => cambiarCliente("origen", e.target.value)} placeholder="Bogotá" /></label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {planes.map((p) => (
                <button key={p.id} onClick={() => elegirPlan(p.id)}
                  className={`text-left rounded-xl p-3 border transition ${cot.plan_id === p.id ? "border-lime-400 bg-lime-400/10" : "border-emerald-900/60 bg-black/20 hover:border-emerald-600"}`}>
                  <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.subtitulo} · {p.dias} {p.dias === 1 ? "día" : "días"}{p.noches ? ` · ${p.noches} ${p.noches === 1 ? "noche" : "noches"}` : ""}</p>
                </button>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Fechas y personas">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block col-span-2 sm:col-span-1"><span className={etiqueta}>Llegada</span>
                <input type="date" className={campo} value={cot.llegada || ""} onChange={(e) => cambiar({ llegada: e.target.value })} /></label>
              <Numero label="Adultos" value={cot.adultos} onChange={(v) => cambiar({ adultos: v })} />
              <Numero label="Niños de 5+ años" value={cot.ninos5} onChange={(v) => cambiar({ ninos5: v })} />
              <Numero label="Menores de 5 (no pagan)" value={cot.menores5} onChange={(v) => cambiar({ menores5: v })} />
            </div>
          </Seccion>

          <Seccion titulo="Precio">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
              <label className="block col-span-2"><span className={etiqueta}>Tipo de cliente</span>
                <select className={campo} value={cot.tipo_cliente || ""} onChange={(e) => elegirTipo(e.target.value)}>
                  {descuentos.map((d) => <option key={d.id} value={d.id}>{d.nombre} ({Math.round(d.porcentaje * 100)} %)</option>)}
                  <option value="personalizado">Personalizado</option>
                </select></label>
              <label className="block"><span className={etiqueta}>Descuento %</span>
                <input type="number" min={0} max={100} className={campo} value={Math.round((cot.descuento || 0) * 1000) / 10}
                  onChange={(e) => cambiar({ descuento: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100, tipo_cliente: "personalizado" })} /></label>
              <Numero label="Días de guía" value={cot.dias_guia} onChange={(v) => cambiar({ dias_guia: v })} />
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-200">
              <input type="checkbox" checked={!!cot.incluir_guia} onChange={(e) => cambiar({ incluir_guia: e.target.checked })} className="w-4 h-4 accent-lime-400" />
              Incluir guía en el total (en la propuesta dice que es opcional y muestra el valor sin guía)
            </label>
          </Seccion>

          <Seccion titulo="Actividades por día">
            <div className="space-y-4">
              {Array.from({ length: nDias }, (_, d) => (
                <div key={d}>
                  <p className="text-sm font-semibold text-orange-300 mb-2">{tituloDia(cot.llegada, d)}</p>
                  <div className="space-y-1.5">
                    {cot.items.map((it, k) => ((it.dia || 1) !== d + 1 ? null : (
                      <div key={k} className="flex items-center gap-2 bg-black/20 rounded-lg px-2.5 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{it.actividad}</p>
                          <p className="text-[11px] text-gray-500">{UNIDADES[it.unidad] || it.unidad}</p>
                        </div>
                        <input type="number" min={0} step={1000} value={it.precio} onChange={(e) => precioItem(k, e.target.value)}
                          className="!w-24 sm:!w-28 flex-none !bg-black/30 !border-emerald-900/60 !rounded-lg !px-2 !py-1 text-base sm:text-sm text-right text-white" aria-label="Precio" />
                        <button onClick={() => quitarItem(k)} className="p-1.5 text-gray-400 hover:text-red-400" aria-label="Quitar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )))}
                  </div>
                  <select className={`${campo} mt-2 !py-2 text-gray-300`} value="" onChange={(e) => agregarItem(d + 1, e.target.value)}>
                    <option value="">+ Agregar actividad al día {d + 1}…</option>
                    {actividades.map((c) => <option key={c.codigo} value={c.codigo}>{c.actividad} — {c.precio ? pesos(c.precio) : "incluido"}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Cambiar el precio aquí solo afecta esta cotización. Para cambiarlo siempre, ve a Precios.</p>
          </Seccion>

          <Seccion titulo="Fotos de la propuesta">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Miniatura refFoto={cot.fotos?.portada} etiqueta="Portada" onClick={() => setEligiendo({ tipo: "portada" })} />
              {Array.from({ length: nDias }, (_, i) => (
                <Miniatura key={`d${i}`} refFoto={cot.fotos?.dias?.[i]} etiqueta={`Día ${i + 1}`} onClick={() => setEligiendo({ tipo: "dias", i })} />
              ))}
              {[0, 1, 2].map((i) => (
                <Miniatura key={`t${i}`} refFoto={cot.fotos?.tira?.[i]} etiqueta={`Final ${i + 1}`} onClick={() => setEligiendo({ tipo: "tira", i })} />
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Saludo">
            <textarea rows={4} className={campo} value={cot.mensaje || ""} onChange={(e) => cambiar({ mensaje: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">{"{cliente}"} se reemplaza por el nombre del cliente.</p>
          </Seccion>
        </div>

        <aside className="glass-card p-4 sm:p-5 lg:sticky lg:top-4 space-y-2 text-sm">
          <h2 className="text-sm font-bold text-lime-300 uppercase tracking-wide mb-2">Resumen</h2>
          <Fila k={`Actividades (${t.pagan} pagan)`} v={pesos(t.subtotal)} />
          {t.descuentoValor > 0 && <Fila k={`Descuento ${Math.round(t.descuento * 100)} %`} v={`−${pesos(t.descuentoValor)}`} />}
          {t.guia > 0 && <Fila k={`Guía (${t.diasGuia} d)`} v={pesos(t.guia)} />}
          <div className="border-t border-emerald-900/60 pt-2"><Fila k="Total" v={pesos(t.total)} fuerte /></div>
          <Fila k="Por persona que paga" v={pesos(t.porPersona)} />
          <Fila k="Anticipo 50 %" v={pesos(t.anticipo)} />
          {plan?.precio_referencia ? <Fila k="Precio en la web (por persona)" v={pesos(plan.precio_referencia)} gris /> : null}
          <div className="border-t border-dashed border-emerald-900/60 pt-2 mt-2">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Interno (no sale en el PDF)</p>
            <Fila k="Costo" v={pesos(t.costo)} gris />
            <Fila k="Margen" v={`${pesos(t.margen)} · ${Math.round(t.margenPct * 100)} %`} gris />
            {t.faltanCostos && <p className="text-xs text-amber-300 mt-1">Hay actividades sin costo registrado: el margen real es menor.</p>}
          </div>
        </aside>
      </div>

      {(error || aviso) && (
        <p className={`text-sm ${error ? "text-red-400" : "text-lime-300"}`}>{error || aviso}</p>
      )}

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-30 glass-nav border-t p-3 safe-area-bottom">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto">
          <Boton onClick={() => guardar()} icono={Save} ocupado={ocupado === "guardar"}>Guardar</Boton>
          <Boton onClick={verPrevia} icono={Eye} ocupado={ocupado === "previa"}>Ver</Boton>
          <Boton onClick={descargar} icono={Download} ocupado={ocupado === "pdf"} principal>PDF</Boton>
          {cot.estado === "borrador" && <Boton onClick={() => guardar({ estado: "aprobada" })} icono={Check}>Aprobar</Boton>}
          {cot.estado === "aprobada" && <Boton onClick={() => guardar({ estado: "enviada" })} icono={Send}>Ya la envié</Boton>}
          {cot.estado === "enviada" && <Boton onClick={() => guardar({ estado: "reservada" })} icono={CalendarCheck}>Reservó</Boton>}
          <Boton onClick={copiar} icono={Copy}>Texto WhatsApp</Boton>
          {cot.id && !["descartada", "reservada"].includes(cot.estado) && <Boton onClick={() => guardar({ estado: "descartada" })} icono={X}>Descartar</Boton>}
        </div>
      </div>

      {eligiendo && <ElegirFoto titulo="Foto para la propuesta" onElegir={ponerFoto} onCerrar={() => setEligiendo(null)} />}
      {vista && <VistaPrevia onCerrar={() => setVista(null)}><DocumentoCotizacion cot={cot} plan={plan} totales={t} empresa={empresa} {...vista} /></VistaPrevia>}
      {paraPdf && createPortal(
        <div style={{ position: "fixed", left: "-10000px", top: 0, width: "210mm" }} aria-hidden>
          <DocumentoCotizacion ref={hojasRef} cot={paraPdf.cot} plan={plan} totales={t} imgs={paraPdf.imgs} logo={paraPdf.logo} mariposas={paraPdf.mariposas} empresa={empresa} logosEmpresa={paraPdf.logosEmpresa} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function Fila({ k, v, fuerte, gris }) {
  return (
    <div className={`flex justify-between gap-3 ${fuerte ? "text-lg font-bold text-lime-300" : gris ? "text-gray-400" : "text-gray-200"}`}>
      <span>{k}</span><span className="text-right">{v}</span>
    </div>
  );
}

function Boton({ onClick, icono: Icono, children, ocupado, principal }) {
  return (
    <button onClick={onClick} disabled={!!ocupado}
      className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-50 ${principal ? "bg-lime-400 text-emerald-950" : "bg-white/5 text-gray-200 border border-white/10"}`}>
      <Icono className="w-4 h-4" /> {ocupado ? "…" : children}
    </button>
  );
}

function VistaPrevia({ children, onCerrar }) {
  const ancho = Math.min(window.innerWidth - 24, 820);
  const escala = ancho / 794;
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/85 overflow-y-auto" onClick={onCerrar}>
      <div className="sticky top-0 flex justify-end p-3 z-10">
        <button onClick={onCerrar} className="bg-white/10 text-white rounded-full p-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
      </div>
      <div className="mx-auto pb-10" style={{ width: ancho }} onClick={(e) => e.stopPropagation()}>
        <div style={{ transform: `scale(${escala})`, transformOrigin: "top left", width: 794 }} className="[&_[data-hoja]]:mb-4 [&_[data-hoja]]:shadow-2xl">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
