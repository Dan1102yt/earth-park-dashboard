import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReservas } from "../../context/ReservasContext";
import { supabase } from "../../lib/supabaseClient";
import { formatCOP } from "../../utils/formatCOP";

const CATEGORIAS = ["Reserva", "Inversión", "Gasto operativo", "Nómina", "Otro"];
const SUBCATEGORIAS_INVERSION = [
  "Infraestructura", "Construcción", "Financiero",
  "Adecuación", "Equipamiento", "Otro",
];
const TIPOS_CUENTA = ["Ahorros", "Corriente", "Nequi", "Daviplata"];
const ENTIDADES = ["Earth Park", "Corp R&R"];

const ESTADO_COLORS = {
  Pendiente: { bg: "bg-amber-500/15", text: "text-amber-400",   border: "border-amber-500/30"  },
  Aprobada:  { bg: "bg-blue-500/15",  text: "text-blue-400",    border: "border-blue-500/30"   },
  Pagada:    { bg: "bg-emerald-500/15",text: "text-emerald-400", border: "border-emerald-500/30"},
  Rechazada: { bg: "bg-red-500/15",   text: "text-red-400",     border: "border-red-500/30"    },
};

// Shared Tailwind strings
const CLS_LABEL = "text-xs text-gray-400 uppercase tracking-wide mb-1 block";
const CLS_INPUT = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition";

function EstadoBadge({ estado }) {
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS.Pendiente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {estado}
    </span>
  );
}

const FORM_DEFAULTS = {
  entidad: "Earth Park",
  fecha: new Date().toISOString().slice(0, 10),
  monto: "",
  descripcion: "",
  categoria: "Gasto operativo",
  subcategoria: "",
  reserva_id: "",
  banco: "",
  titular_cuenta: "",
  numero_cuenta: "",
  tipo_cuenta: "Ahorros",
};

function FormularioDevolucion({ onSubmit, onCancel, reservas }) {
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) {
      setFormError("El monto debe ser mayor a 0.");
      return;
    }
    if (!form.banco || !form.titular_cuenta || !form.numero_cuenta) {
      setFormError("Completa todos los datos bancarios.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      entidad: form.entidad,
      fecha: form.fecha,
      monto: Number(form.monto),
      descripcion: form.descripcion,
      categoria: form.categoria,
      subcategoria: form.categoria === "Inversión" ? form.subcategoria : null,
      reserva_id: form.categoria === "Reserva" ? form.reserva_id : null,
      banco: form.banco,
      titular_cuenta: form.titular_cuenta,
      numero_cuenta: form.numero_cuenta,
      tipo_cuenta: form.tipo_cuenta,
    };
    const error = await onSubmit(payload);
    if (error) setFormError(error.message || "Error al guardar.");
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-5">Nueva solicitud de devolución</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Entidad + Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={CLS_LABEL}>Entidad</label>
            <select className={CLS_INPUT} value={form.entidad} onChange={(e) => set("entidad", e.target.value)}>
              {ENTIDADES.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className={CLS_LABEL}>Fecha</label>
            <input type="date" className={CLS_INPUT} value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)} />
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className={CLS_LABEL}>Monto solicitado (COP)</label>
          <input type="number" min="1" className={CLS_INPUT} placeholder="0"
            value={form.monto} onChange={(e) => set("monto", e.target.value)} />
        </div>

        {/* Descripción */}
        <div>
          <label className={CLS_LABEL}>Descripción / motivo</label>
          <textarea rows={3} className={`${CLS_INPUT} resize-none`}
            placeholder="Describe brevemente la razón de la devolución..."
            value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
        </div>

        {/* Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={CLS_LABEL}>Categoría</label>
            <select className={CLS_INPUT} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {form.categoria === "Inversión" && (
            <div>
              <label className={CLS_LABEL}>Subcategoría</label>
              <select className={CLS_INPUT} value={form.subcategoria} onChange={(e) => set("subcategoria", e.target.value)}>
                <option value="">Seleccionar...</option>
                {SUBCATEGORIAS_INVERSION.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {form.categoria === "Reserva" && (
            <div>
              <label className={CLS_LABEL}>Reserva</label>
              <select
                className={CLS_INPUT}
                value={form.reserva_id}
                onChange={(e) => set("reserva_id", e.target.value)}
              >
                <option value="">— Selecciona una reserva —</option>
                {reservas
                  .slice()
                  .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
                  .map((r) => (
                    <option key={r.reserva_id} value={r.reserva_id}>
                      {r.reserva_id} · {r.nombre_cliente} · {r.fecha_inicio}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Datos bancarios */}
        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Datos bancarios para el pago</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={CLS_LABEL}>Banco / billetera</label>
              <input type="text" className={CLS_INPUT} placeholder="Bancolombia, Nequi..."
                value={form.banco} onChange={(e) => set("banco", e.target.value)} />
            </div>
            <div>
              <label className={CLS_LABEL}>Tipo de cuenta</label>
              <select className={CLS_INPUT} value={form.tipo_cuenta} onChange={(e) => set("tipo_cuenta", e.target.value)}>
                {TIPOS_CUENTA.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Titular</label>
              <input type="text" className={CLS_INPUT} placeholder="Nombre completo"
                value={form.titular_cuenta} onChange={(e) => set("titular_cuenta", e.target.value)} />
            </div>
            <div>
              <label className={CLS_LABEL}>Número de cuenta / celular</label>
              <input type="text" className={CLS_INPUT} placeholder="0000000000"
                value={form.numero_cuenta} onChange={(e) => set("numero_cuenta", e.target.value)} />
            </div>
          </div>
        </div>

        {formError && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white
              font-semibold rounded-lg px-5 py-2.5 text-sm transition">
            {saving ? "Guardando..." : "Enviar solicitud"}
          </button>
          <button type="button" onClick={onCancel}
            className="text-gray-400 hover:text-white border border-gray-700 rounded-lg
              px-5 py-2.5 text-sm transition">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-gray-500 flex-shrink-0">{label}</p>
      <p className={`text-sm text-right ${highlight ? "text-emerald-400 font-semibold" : "text-gray-200"}`}>
        {value}
      </p>
    </div>
  );
}

function DetalleModal({ devolucion, onClose, onActualizar, esAdmin }) {
  const [notas, setNotas] = useState(devolucion.notas_aprobacion || "");
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);

  const accionar = async (estado) => {
    setSaving(true);
    await onActualizar(devolucion.id, estado, notas, archivo);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-base font-semibold text-white">Detalle de solicitud</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <EstadoBadge estado={devolucion.estado} />
            <span className="text-xs text-gray-500">
              {new Date(devolucion.created_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}
            </span>
          </div>

          {/* Info principal */}
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
            <InfoRow label="Solicitante" value={devolucion.solicitante_nombre} />
            <InfoRow label="Entidad"     value={devolucion.entidad} />
            <InfoRow label="Fecha"       value={devolucion.fecha} />
            <InfoRow label="Monto"       value={formatCOP(devolucion.monto)} highlight />
            <InfoRow label="Categoría"   value={[devolucion.categoria, devolucion.subcategoria].filter(Boolean).join(" › ")} />
            {devolucion.reserva_id && <InfoRow label="Reserva" value={devolucion.reserva_id} />}
            {devolucion.descripcion && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Descripción</p>
                <p className="text-sm text-gray-200">{devolucion.descripcion}</p>
              </div>
            )}
          </div>

          {/* Datos bancarios */}
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Datos bancarios</p>
            <InfoRow label="Banco"   value={devolucion.banco} />
            <InfoRow label="Tipo"    value={devolucion.tipo_cuenta} />
            <InfoRow label="Titular" value={devolucion.titular_cuenta} />
            <InfoRow label="Cuenta"  value={devolucion.numero_cuenta} />
          </div>

          {/* Info aprobación */}
          {devolucion.aprobado_por && (
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Resolución</p>
              <InfoRow label="Resuelto por" value={devolucion.aprobado_por} />
              <InfoRow label="Fecha" value={
                devolucion.fecha_aprobacion
                  ? new Date(devolucion.fecha_aprobacion).toLocaleDateString("es-CO")
                  : ""
              } />
              {devolucion.notas_aprobacion && <InfoRow label="Notas" value={devolucion.notas_aprobacion} />}
              {devolucion.comprobante_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Comprobante</p>
                  <a href={devolucion.comprobante_url} target="_blank" rel="noopener noreferrer"
                    className="text-green-400 text-sm underline">Ver comprobante</a>
                </div>
              )}
            </div>
          )}

          {/* Acciones admin — Pendiente */}
          {esAdmin && devolucion.estado === "Pendiente" && (
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Acción de administrador</p>
              <div>
                <label className={CLS_LABEL}>Notas (opcional)</label>
                <textarea rows={2} className={`${CLS_INPUT} resize-none`} value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Motivo de aprobación/rechazo..." />
              </div>
              <div>
                <label className={CLS_LABEL}>Comprobante de pago (al aprobar)</label>
                <input type="file" accept="image/*,application/pdf"
                  onChange={(e) => setArchivo(e.target.files[0])}
                  className="text-sm text-gray-400 file:mr-3 file:py-1 file:px-3
                    file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-300
                    file:text-xs file:cursor-pointer hover:file:bg-gray-600" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => accionar("Aprobada")} disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                    text-white font-semibold rounded-lg py-2 text-sm transition">
                  {saving ? "..." : "Aprobar"}
                </button>
                <button onClick={() => accionar("Pagada")} disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                    text-white font-semibold rounded-lg py-2 text-sm transition">
                  {saving ? "..." : "Marcar pagada"}
                </button>
                <button onClick={() => accionar("Rechazada")} disabled={saving}
                  className="flex-1 bg-red-700 hover:bg-red-800 disabled:opacity-50
                    text-white font-semibold rounded-lg py-2 text-sm transition">
                  {saving ? "..." : "Rechazar"}
                </button>
              </div>
            </div>
          )}

          {/* Acciones admin — Aprobada → Pagada */}
          {esAdmin && devolucion.estado === "Aprobada" && (
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Registrar pago</p>
              <div>
                <label className={CLS_LABEL}>Comprobante de pago</label>
                <input type="file" accept="image/*,application/pdf"
                  onChange={(e) => setArchivo(e.target.files[0])}
                  className="text-sm text-gray-400 file:mr-3 file:py-1 file:px-3
                    file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-300
                    file:text-xs file:cursor-pointer hover:file:bg-gray-600" />
              </div>
              <div>
                <label className={CLS_LABEL}>Notas</label>
                <textarea rows={2} className={`${CLS_INPUT} resize-none`} value={notas}
                  onChange={(e) => setNotas(e.target.value)} placeholder="Notas adicionales..." />
              </div>
              <button onClick={() => accionar("Pagada")} disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                  text-white font-semibold rounded-lg py-2 text-sm transition">
                {saving ? "Guardando..." : "Marcar como pagada"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Devoluciones() {
  const { usuario } = useAuth();
  const { state, dispatch } = useReservas();
  const reservas = state.reservas || [];
  const [devoluciones, setDevoluciones] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  const esAdmin = usuario?.rol === "admin";

  useEffect(() => { cargarDevoluciones(); }, []);

  async function cargarDevoluciones() {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("devoluciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDevoluciones(data);
    setLoading(false);
  }

  async function crearDevolucion(form) {
    if (!supabase) return { message: "Sin conexión a base de datos" };
    const { error } = await supabase.from("devoluciones").insert({
      ...form,
      solicitante_nombre: usuario.nombre,
      estado: "Pendiente",
    });
    if (!error) { await cargarDevoluciones(); setMostrarForm(false); }
    return error;
  }

  async function actualizarEstado(id, estado, notas, comprobanteFile) {
    if (!supabase || !esAdmin) return;
    let comprobante_url = null;
    if (comprobanteFile) {
      const ext = comprobanteFile.name.split(".").pop();
      const path = `${id}.${ext}`;
      await supabase.storage.from("comprobantes").upload(path, comprobanteFile, { upsert: true });
      const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path);
      comprobante_url = urlData?.publicUrl;
    }
    await supabase.from("devoluciones").update({
      estado,
      aprobado_por: usuario.nombre,
      fecha_aprobacion: new Date().toISOString(),
      notas_aprobacion: notas,
      ...(comprobante_url && { comprobante_url }),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    await cargarDevoluciones();

    if (estado === "Pagada") {
      const { data: dev } = await supabase
        .from("devoluciones")
        .select("*")
        .eq("id", id)
        .single();

      if (dev) {
        const categoriaEgreso = {
          "Reserva": "reserva",
          "Inversión": "inversion",
          "Gasto operativo": "operativo",
          "Nómina": "nomina",
          "Otro": "otros",
        }[dev.categoria] || "otros";

        const egresoId = `EG-DEV-${Date.now()}`;

        const nuevoEgreso = {
          egreso_id: egresoId,
          reserva_id: dev.reserva_id || "SIN_ASIGNAR",
          item: `Devolución: ${dev.descripcion}`.substring(0, 80),
          categoria: categoriaEgreso,
          tipo: "extraordinario",
          valor_cop: Number(dev.monto),
          tiene_recibo: !!dev.comprobante_url,
          proveedor: `${dev.solicitante_nombre} → ${dev.entidad}`,
          notas: `Devolución aprobada por ${dev.aprobado_por}. ${dev.notas_aprobacion || ""}`.trim(),
          fecha: new Date().toISOString().split("T")[0],
        };

        dispatch({ type: "ADD_EGRESO", payload: nuevoEgreso });
      }
    }

    setDetalle(null);
  }

  const resumen = devoluciones.reduce((acc, d) => {
    acc[d.estado] = (acc[d.estado] || 0) + d.monto;
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Devoluciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Solicitudes de reembolso y pagos pendientes</p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold
              rounded-xl px-4 py-2 text-sm transition"
          >
            + Nueva solicitud
          </button>
        )}
      </div>

      {/* Resumen cards */}
      {devoluciones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { estado: "Pendiente", label: "Pendientes" },
            { estado: "Aprobada",  label: "Aprobadas"  },
            { estado: "Pagada",    label: "Pagadas"    },
            { estado: "Rechazada", label: "Rechazadas" },
          ].map(({ estado, label }) => {
            const c = ESTADO_COLORS[estado];
            return (
              <div key={estado} className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
                <p className={`text-xs font-medium ${c.text}`}>{label}</p>
                <p className="text-white font-semibold text-sm mt-1">
                  {resumen[estado] ? formatCOP(resumen[estado]) : "—"}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {devoluciones.filter((d) => d.estado === estado).length} solicitud(es)
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="mb-6">
          <FormularioDevolucion
            onSubmit={crearDevolucion}
            onCancel={() => setMostrarForm(false)}
            reservas={reservas}
          />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando solicitudes...</div>
      ) : !supabase ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg mb-2">Sin conexión a base de datos</p>
          <p className="text-sm">Configura las variables de entorno de Supabase.</p>
        </div>
      ) : devoluciones.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-base text-gray-400">No hay solicitudes aún</p>
          <p className="text-sm text-gray-600 mt-1">Crea la primera usando el botón de arriba.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {["Fecha", "Solicitante", "Entidad", "Categoría", "Monto", "Estado", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide ${h === "Monto" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {devoluciones.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{d.solicitante_nombre}</td>
                    <td className="px-4 py-3 text-gray-400">{d.entidad}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {[d.categoria, d.subcategoria].filter(Boolean).join(" › ")}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold whitespace-nowrap">
                      {formatCOP(d.monto)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={d.estado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetalle(d)}
                        className="text-xs text-gray-500 hover:text-green-400 transition"
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <DetalleModal
          devolucion={detalle}
          onClose={() => setDetalle(null)}
          onActualizar={actualizarEstado}
          esAdmin={esAdmin}
        />
      )}
    </div>
  );
}
