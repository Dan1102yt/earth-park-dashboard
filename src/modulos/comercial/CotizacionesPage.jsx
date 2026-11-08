// Cotizaciones: lista y editor. Las que arme el agente de WhatsApp llegarán aquí como borrador para aprobarlas.
import { useCallback, useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { useAuth } from "../../compartido/contexto/AuthContext";
import PageHeader from "../../compartido/componentes/PageHeader";
import { cargarCatalogo, cargarDescuentos, cargarPlanes, listarCotizaciones } from "./datos";
import { ESTADOS, pesos, fechasTexto } from "./calculo";
import EditorCotizacion, { cotizacionNueva } from "./EditorCotizacion";

export default function CotizacionesPage() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null); // { catalogo, planes, descuentos }
  const [lista, setLista] = useState([]);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("activas");
  const [abierta, setAbierta] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [catalogo, planes, descuentos, cots] = await Promise.all([cargarCatalogo(), cargarPlanes(), cargarDescuentos(), listarCotizaciones()]);
      setDatos({ catalogo, planes, descuentos });
      setLista(cots);
      setError(planes.length ? "" : "No hay planes cargados. Corre privado/08_datos_iniciales.sql en Supabase → SQL Editor.");
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const actualizarEnLista = (c) => setLista((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]));

  if (abierta && datos) {
    return (
      <EditorCotizacion key={abierta.id || "nueva"} inicial={abierta} {...datos}
        onVolver={() => setAbierta(null)} onGuardada={actualizarEnLista} />
    );
  }

  const nombrePlan = (id) => datos?.planes.find((p) => p.id === id);
  const visibles = lista.filter((c) => (filtro === "activas" ? !["descartada", "reservada"].includes(c.estado) : filtro === "todas" || c.estado === filtro));
  const porAprobar = lista.filter((c) => c.estado === "borrador").length;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Cotizaciones"
        subtitle={porAprobar ? `${porAprobar} por revisar y aprobar` : "Arma la propuesta, apruébala y descarga el PDF para el cliente"}
        action={
          <button disabled={!datos?.planes.length} onClick={() => setAbierta(cotizacionNueva(datos.planes[0], datos.catalogo, usuario))}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-40">
            <Plus className="w-5 h-5" /> Nueva cotización
          </button>
        }
      />
      {error && <p className="text-sm text-amber-300 glass-card p-3 mb-4">{error}</p>}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {[["activas", "Activas"], ...Object.entries(ESTADOS).map(([k, v]) => [k, v.nombre]), ["todas", "Todas"]].map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full border ${filtro === k ? "border-lime-400 text-lime-300 bg-lime-400/10" : "border-white/10 text-gray-400"}`}>{v}</button>
        ))}
      </div>

      {!visibles.length ? (
        <div className="glass-card p-8 text-center text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-60" />
          No hay cotizaciones aquí todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibles.map((c) => {
            const p = nombrePlan(c.plan_id);
            const e = ESTADOS[c.estado] || ESTADOS.borrador;
            return (
              <button key={c.id} onClick={() => setAbierta(c)} className="glass-card-hover p-4 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">N° {c.numero}{c.origen === "whatsapp" ? " · WhatsApp" : ""}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${e.color}22`, color: e.color }}>{e.nombre}</span>
                </div>
                <p className="text-white font-semibold mt-1 truncate">{c.cliente?.nombre || "Sin nombre"}</p>
                <p className="text-sm text-gray-400 truncate">{p?.nombre || c.plan_id} · {fechasTexto(c.llegada, p?.dias || 1)}</p>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-xs text-gray-500">{(c.adultos || 0) + (c.ninos5 || 0) + (c.menores5 || 0)} personas{c.creado_por ? ` · ${c.creado_por}` : ""}</span>
                  <span className="text-lime-300 font-bold">{pesos(c.totales?.total || 0)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
