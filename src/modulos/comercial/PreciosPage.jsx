// Precios: catálogo de actividades (precio y costo), itinerario y fotos de cada plan, y descuentos por tipo de cliente.
// Es la fuente única: las cotizaciones copian de aquí el precio del momento.
import { useCallback, useEffect, useState } from "react";
import { Save, Plus, Trash2, ImageIcon, Upload } from "lucide-react";
import { useAuth } from "../../compartido/contexto/AuthContext";
import PageHeader from "../../compartido/componentes/PageHeader";
import { cargarCatalogo, cargarPlanes, cargarDescuentos, guardarCatalogo, guardarPlan, guardarDescuento, borrarCatalogo, urlFoto, cargarEmpresa, guardarEmpresa, subirLogo } from "./datos";
import { completarEmpresa, CANALES, iconoGenerico } from "./empresa";
import { pesos, UNIDADES, CODIGO_GUIA } from "./calculo";
import ElegirFoto from "./ElegirFoto";

const campo = "w-full bg-black/30 border border-emerald-900/60 rounded-lg px-2.5 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-lime-400/60";

export default function PreciosPage() {
  const { usuario } = useAuth();
  const [pestana, setPestana] = useState("actividades");
  const [catalogo, setCatalogo] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [c, p, d] = await Promise.all([cargarCatalogo(), cargarPlanes(), cargarDescuentos()]);
      setCatalogo(c); setPlanes(p); setDescuentos(d);
      setError(c.length ? "" : "El catálogo está vacío. Corre privado/08_datos_iniciales.sql en Supabase → SQL Editor.");
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const avisar = (t) => { setAviso(t); setTimeout(() => setAviso(""), 2500); };
  const conError = (fn) => async (...a) => { setError(""); try { await fn(...a); } catch (e) { setError(e.message); } };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Precios" subtitle="Un solo lugar para los precios. Cambiarlos aquí no altera cotizaciones ya hechas." />
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[["actividades", "Actividades"], ["planes", "Planes"], ["descuentos", "Descuentos"], ["empresa", "Empresa"]].map(([k, v]) => (
          <button key={k} onClick={() => setPestana(k)}
            className={`text-sm px-4 py-2 rounded-full border ${pestana === k ? "border-lime-400 text-lime-300 bg-lime-400/10" : "border-white/10 text-gray-400"}`}>{v}</button>
        ))}
      </div>
      {error && <p className="text-sm text-amber-300 glass-card p-3 mb-4">{error}</p>}
      {aviso && <p className="text-sm text-lime-300 mb-3">{aviso}</p>}

      {pestana === "actividades" && (
        <Actividades catalogo={catalogo}
          onGuardar={conError(async (item) => {
            const g = await guardarCatalogo(item, usuario?.nombre || usuario?.username);
            setCatalogo((c) => (c.some((x) => x.codigo === g.codigo) ? c.map((x) => (x.codigo === g.codigo ? g : x)) : [...c, g]));
            avisar(`${g.actividad}: guardado`);
          })}
          onBorrar={conError(async (codigo) => {
            if (planes.some((p) => p.itinerario.flat().includes(codigo))) { setError("Esa actividad está en un plan. Quítala del plan o desactívala."); return; }
            if (!window.confirm("¿Borrar esta actividad del catálogo?")) return;
            await borrarCatalogo(codigo);
            setCatalogo((c) => c.filter((x) => x.codigo !== codigo));
          })} />
      )}
      {pestana === "planes" && planes.map((p) => (
        <PlanEditor key={p.id} plan={p} catalogo={catalogo}
          onGuardar={conError(async (plan) => {
            const g = await guardarPlan(plan);
            setPlanes((ps) => ps.map((x) => (x.id === g.id ? g : x)));
            avisar(`${g.nombre} (${g.subtitulo}): guardado`);
          })} />
      ))}
      {pestana === "empresa" && <Empresa onAviso={avisar} onError={setError} />}
      {pestana === "descuentos" && (
        <div className="glass-card p-4 space-y-2">
          {descuentos.map((d) => <FilaDescuento key={d.id} d={d} onGuardar={conError(async (x) => { const g = await guardarDescuento(x); setDescuentos((ds) => ds.map((y) => (y.id === g.id ? g : y))); avisar("Descuento guardado"); })} />)}
          <p className="text-xs text-gray-500 pt-2">El descuento se aplica a las actividades. El guía va aparte.</p>
        </div>
      )}
    </div>
  );
}

function Actividades({ catalogo, onGuardar, onBorrar }) {
  const [nueva, setNueva] = useState(null);
  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[1fr_150px_110px_110px_90px_70px] gap-2 px-3 text-xs text-gray-400 uppercase">
        <span>Actividad</span><span>Unidad</span><span className="text-right">Precio</span><span className="text-right">Costo</span><span className="text-right">Margen</span><span />
      </div>
      {catalogo.map((c) => <FilaActividad key={c.codigo} item={c} onGuardar={onGuardar} onBorrar={onBorrar} />)}
      {nueva ? (
        <FilaActividad item={nueva} nueva onGuardar={async (x) => { if (!x.codigo?.trim()) return; await onGuardar({ ...x, codigo: x.codigo.trim().toUpperCase(), orden: catalogo.length + 1 }); setNueva(null); }} onBorrar={() => setNueva(null)} />
      ) : (
        <button onClick={() => setNueva({ codigo: "", actividad: "", unidad: "persona", precio: 0, costo: null, nota: "", activo: true })}
          className="btn-secondary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Nueva actividad</button>
      )}
    </div>
  );
}

function FilaActividad({ item, nueva, onGuardar, onBorrar }) {
  const [x, setX] = useState(item);
  useEffect(() => setX(item), [item]);
  const cambio = nueva || JSON.stringify(x) !== JSON.stringify(item);
  const margen = x.costo == null || !x.precio ? null : x.precio - x.costo;
  const num = (v) => (v === "" ? null : Math.max(0, Number(v) || 0));

  return (
    <div className={`glass-card p-3 ${x.activo ? "" : "opacity-50"}`}>
      <div className="grid grid-cols-2 md:grid-cols-[1fr_150px_110px_110px_90px_70px] gap-2 items-center">
        <div className="col-span-2 md:col-span-1 flex gap-2">
          {nueva && <input className={`${campo} !w-20`} placeholder="Código" value={x.codigo} onChange={(e) => setX({ ...x, codigo: e.target.value })} />}
          <input className={campo} value={x.actividad} placeholder="Nombre (así sale en la propuesta)" onChange={(e) => setX({ ...x, actividad: e.target.value })} />
        </div>
        <select className={`${campo} col-span-2 md:col-span-1`} value={x.unidad} onChange={(e) => setX({ ...x, unidad: e.target.value })}>
          {Object.entries(UNIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="block"><span className="md:hidden text-xs text-gray-400">Precio</span>
          <input type="number" min={0} step={1000} className={`${campo} text-right`} value={x.precio ?? 0} onChange={(e) => setX({ ...x, precio: num(e.target.value) ?? 0 })} /></label>
        <label className="block"><span className="md:hidden text-xs text-gray-400">Costo</span>
          <input type="number" min={0} step={1000} className={`${campo} text-right ${x.costo == null ? "!border-amber-500/60" : ""}`} placeholder="falta" value={x.costo ?? ""} onChange={(e) => setX({ ...x, costo: num(e.target.value) })} /></label>
        <span className={`text-sm text-right ${margen == null ? "text-gray-500" : margen < 0 ? "text-red-400" : "text-lime-300"}`}>
          {margen == null ? "—" : `${pesos(margen)}`}{margen != null && x.precio ? <span className="block text-[11px] text-gray-500">{Math.round((margen / x.precio) * 100)} %</span> : null}
        </span>
        <div className="flex justify-end gap-1">
          {cambio && <button onClick={() => onGuardar(x)} className="p-2 rounded-lg bg-lime-400 text-emerald-950" aria-label="Guardar"><Save className="w-4 h-4" /></button>}
          <button onClick={() => onBorrar(x.codigo)} className="p-2 text-gray-500 hover:text-red-400" aria-label="Borrar"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex gap-3 items-center mt-2">
        <input className={`${campo} !py-1.5 text-xs`} placeholder="Nota interna" value={x.nota || ""} onChange={(e) => setX({ ...x, nota: e.target.value })} />
        {!nueva && (
          <label className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
            <input type="checkbox" className="accent-lime-400" checked={!!x.activo} onChange={(e) => setX({ ...x, activo: e.target.checked })} /> Activa
          </label>
        )}
        <span className="text-[11px] text-gray-600 flex-shrink-0">{item.codigo}</span>
      </div>
    </div>
  );
}

function PlanEditor({ plan, catalogo, onGuardar }) {
  const [p, setP] = useState(plan);
  const [eligiendo, setEligiendo] = useState(null);
  useEffect(() => setP(plan), [plan]);
  const cambio = JSON.stringify(p) !== JSON.stringify(plan);
  const porCodigo = Object.fromEntries(catalogo.map((c) => [c.codigo, c]));
  const itin = p.itinerario || [];
  const ponerItin = (nuevo) => setP({ ...p, itinerario: nuevo });
  const valorDia = (codigos) => codigos.reduce((s, k) => s + (porCodigo[k] && porCodigo[k].unidad !== "grupo_dia" ? Number(porCodigo[k].precio) || 0 : 0), 0);

  const ponerFoto = (ref) => {
    const { tipo, i } = eligiendo;
    const fotos = { ...(p.fotos || {}) };
    if (tipo === "portada") fotos.portada = ref;
    else { const arr = [...(fotos[tipo] || [])]; arr[i] = ref; fotos[tipo] = arr; }
    setP({ ...p, fotos });
    setEligiendo(null);
  };
  const Mini = ({ r, et, onClick }) => (
    <button onClick={onClick} className="relative rounded-lg overflow-hidden border border-emerald-900/60 aspect-[4/3] bg-black/30">
      {r ? <img src={urlFoto(r)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-500 m-auto" />}
      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white py-0.5 px-1.5 text-left">{et}</span>
    </button>
  );

  return (
    <section className="glass-card p-4 sm:p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-white font-bold">{p.nombre}</h2>
          <p className="text-xs text-gray-400">{p.subtitulo}</p>
        </div>
        {cambio && <button onClick={() => onGuardar(p)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {itin.map((codigos, d) => (
          <div key={d} className="bg-black/20 rounded-xl p-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-orange-300">Día {d + 1}</span>
              <span className="text-gray-400">{pesos(valorDia(codigos))} por persona</span>
            </div>
            <ul className="space-y-1">
              {codigos.map((k, i) => (
                <li key={`${k}${i}`} className="flex items-center gap-2 text-sm text-gray-200">
                  <span className="flex-1 truncate">{porCodigo[k]?.actividad || k}{k === CODIGO_GUIA ? " (no se suma: el guía va aparte)" : ""}</span>
                  <span className="text-xs text-gray-500">{porCodigo[k]?.precio ? pesos(porCodigo[k].precio) : "incl."}</span>
                  <button onClick={() => ponerItin(itin.map((c, j) => (j === d ? c.filter((_, z) => z !== i) : c)))} className="p-1 text-gray-500 hover:text-red-400" aria-label="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
            <select className={`${campo} mt-2 !py-1.5 text-gray-300`} value="" onChange={(e) => e.target.value && ponerItin(itin.map((c, j) => (j === d ? [...c, e.target.value] : c)))}>
              <option value="">+ Agregar…</option>
              {catalogo.filter((c) => c.activo && c.codigo !== CODIGO_GUIA).map((c) => <option key={c.codigo} value={c.codigo}>{c.actividad}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-[180px_1fr] gap-3 mt-4">
        <label className="block"><span className="text-xs text-gray-400">Precio en la web (por persona)</span>
          <input type="number" min={0} step={1000} className={campo} value={p.precio_referencia ?? ""} placeholder="—"
            onChange={(e) => setP({ ...p, precio_referencia: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        <label className="block"><span className="text-xs text-gray-400">Saludo por defecto ({"{cliente}"} = nombre)</span>
          <textarea rows={2} className={campo} value={p.mensaje || ""} onChange={(e) => setP({ ...p, mensaje: e.target.value })} /></label>
      </div>

      <p className="text-xs text-gray-400 mt-4 mb-2">Fotos por defecto (en cada cotización se pueden cambiar)</p>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        <Mini r={p.fotos?.portada} et="Portada" onClick={() => setEligiendo({ tipo: "portada" })} />
        {itin.map((_, i) => <Mini key={`d${i}`} r={p.fotos?.dias?.[i]} et={`Día ${i + 1}`} onClick={() => setEligiendo({ tipo: "dias", i })} />)}
        {[0, 1, 2].map((i) => <Mini key={`t${i}`} r={p.fotos?.tira?.[i]} et={`Final ${i + 1}`} onClick={() => setEligiendo({ tipo: "tira", i })} />)}
      </div>
      {eligiendo && <ElegirFoto titulo={`Foto para ${p.nombre}`} onElegir={ponerFoto} onCerrar={() => setEligiendo(null)} />}
    </section>
  );
}

function FilaDescuento({ d, onGuardar }) {
  const [x, setX] = useState(d);
  useEffect(() => setX(d), [d]);
  const cambio = JSON.stringify(x) !== JSON.stringify(d);
  return (
    <div className="flex items-center gap-2">
      <input className={campo} value={x.nombre} onChange={(e) => setX({ ...x, nombre: e.target.value })} />
      <input type="number" min={0} max={100} className={`${campo} !w-20 text-right`} value={Math.round(Number(x.porcentaje) * 1000) / 10}
        onChange={(e) => setX({ ...x, porcentaje: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 })} />
      <span className="text-gray-400 text-sm">%</span>
      {cambio && <button onClick={() => onGuardar(x)} className="p-2 rounded-lg bg-lime-400 text-emerald-950" aria-label="Guardar"><Save className="w-4 h-4" /></button>}
    </div>
  );
}

function Empresa({ onAviso, onError }) {
  const [e, setE] = useState(null);
  const [original, setOriginal] = useState(null);
  const [subiendo, setSubiendo] = useState("");
  useEffect(() => { cargarEmpresa().then((d) => { const c = completarEmpresa(d || {}); setE(c); setOriginal(c); }); }, []);
  if (!e) return <p className="text-gray-400 text-sm">Cargando…</p>;
  const cambio = JSON.stringify(e) !== JSON.stringify(original);
  const pago = (k, campoP, v) => setE({ ...e, pagos: { ...e.pagos, [k]: { ...e.pagos[k], [campoP]: v } } });

  const guardar = async () => {
    onError("");
    try { const g = completarEmpresa(await guardarEmpresa(e)); setE(g); setOriginal(g); onAviso("Datos de la empresa guardados"); } catch (x) { onError(x.message); }
  };
  const logo = async (clave, archivo) => {
    if (!archivo) return;
    setSubiendo(clave);
    try { const url = await subirLogo(clave, archivo); setE((x) => ({ ...x, logos: { ...x.logos, [clave]: url } })); } catch (x) { onError(x.message); }
    setSubiendo("");
  };
  const Logo = ({ clave }) => (
    <label className="relative w-11 h-11 flex-shrink-0 rounded-lg bg-white/90 flex items-center justify-center cursor-pointer overflow-hidden" title="Subir logo">
      <img src={e.logos[clave] || iconoGenerico(clave)} alt="" className="w-8 h-8 object-contain" />
      <span className="absolute inset-x-0 bottom-0 bg-black/60 flex justify-center">{subiendo === clave ? <span className="text-[9px] text-white">…</span> : <Upload className="w-2.5 h-2.5 text-white" />}</span>
      <input type="file" accept="image/*" className="hidden" onChange={(ev) => logo(clave, ev.target.files?.[0])} />
    </label>
  );

  return (
    <div className="space-y-4">
      <section className="glass-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-lime-300 uppercase tracking-wide mb-3">Medios de pago (salen en la propuesta)</h2>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <Logo clave="bancolombia" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              <input className={campo} value={e.pagos.banco.nombre} placeholder="Banco" onChange={(x) => pago("banco", "nombre", x.target.value)} />
              <input className={campo} value={e.pagos.banco.tipo} placeholder="Tipo de cuenta" onChange={(x) => pago("banco", "tipo", x.target.value)} />
              <input className={campo} value={e.pagos.banco.numero} placeholder="Número" onChange={(x) => pago("banco", "numero", x.target.value)} />
              <input className={campo} value={e.pagos.banco.titular} placeholder="Titular (opcional)" onChange={(x) => pago("banco", "titular", x.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Logo clave="nequi" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              <input className={campo} value={e.pagos.nequi.nombre} placeholder="Billetera" onChange={(x) => pago("nequi", "nombre", x.target.value)} />
              <input className={campo} value={e.pagos.nequi.numero} placeholder="Número" onChange={(x) => pago("nequi", "numero", x.target.value)} />
              <input className={`${campo} col-span-2`} value={e.pagos.nequi.titular} placeholder="Titular (opcional)" onChange={(x) => pago("nequi", "titular", x.target.value)} />
            </div>
          </div>
        </div>
      </section>
      <section className="glass-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-lime-300 uppercase tracking-wide mb-3">Redes y contacto</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CANALES.map((c) => (
            <div key={c.clave} className="flex gap-3 items-center">
              <Logo clave={c.clave} />
              <label className="flex-1"><span className="text-xs text-gray-400">{c.nombre} (vacío = no sale)</span>
                <input className={campo} value={e.contacto[c.clave] || ""} onChange={(x) => setE({ ...e, contacto: { ...e.contacto, [c.clave]: x.target.value } })} /></label>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">Toca cada cuadro para subir el logo oficial (PNG con fondo transparente). Mientras no lo subas, sale un ícono genérico.</p>
      </section>
      {cambio && <button onClick={guardar} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Guardar datos de la empresa</button>}
    </div>
  );
}
