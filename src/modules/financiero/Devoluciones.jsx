import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReservas } from "../../context/ReservasContext";
import { supabase } from "../../lib/supabaseClient";
import { formatCOP } from "../../utils/formatCOP";

const CATEGORIAS = ["Reserva", "Inversión", "Gasto operativo", "Nómina", "Otro"];
const SUBCATEGORIAS_INVERSION = [
  "Infraestructura", "Construcción", "Financiero",
  "Adecuación", "Equipamiento", "Otro",
];
const TIPOS_CUENTA = ["Ahorros", "Corriente", "Nequi", "Daviplata", "Efectivo"];
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

function DetalleModal({ devolucion, onClose, onActualizar, onEditar, esAdmin }) {
  const [notas, setNotas] = useState(devolucion.notas_aprobacion || "");
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    solicitante_nombre: devolucion.solicitante_nombre,
    entidad: devolucion.entidad || "Earth Park",
    categoria: devolucion.categoria || "Otro",
    banco: devolucion.banco || "",
    titular_cuenta: devolucion.titular_cuenta || "",
    numero_cuenta: devolucion.numero_cuenta || "",
    tipo_cuenta: devolucion.tipo_cuenta || "",
  });

  const esEfectivo = devolucion.tipo_cuenta === "Efectivo";

  const setEditField = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  const cancelarEdicion = () => {
    setEditForm({
      solicitante_nombre: devolucion.solicitante_nombre,
      entidad: devolucion.entidad || "Earth Park",
      categoria: devolucion.categoria || "Otro",
      banco: devolucion.banco || "",
      titular_cuenta: devolucion.titular_cuenta || "",
      numero_cuenta: devolucion.numero_cuenta || "",
      tipo_cuenta: devolucion.tipo_cuenta || "",
    });
    setEditando(false);
  };

  async function guardarEdicion() {
    setSavingEdit(true);
    await onEditar(devolucion.id, editForm);
    setSavingEdit(false);
    setEditando(false);
  }

  const accionar = async (estado) => {
    setSaving(true);
    if (esEfectivo && estado === "Pagada") {
      const notasFinal = notas
        ? `Pago realizado en efectivo. ${notas}`
        : "Pago realizado en efectivo";
      await onActualizar(devolucion.id, estado, notasFinal, null, devolucion.tipo_cuenta);
    } else {
      await onActualizar(devolucion.id, estado, notas, archivo, devolucion.tipo_cuenta);
    }
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
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-gray-500 flex-shrink-0">Solicitante</p>
              <div className="flex items-center gap-2">
                {editando ? (
                  <input type="text" className={`${CLS_INPUT} text-right py-1`}
                    value={editForm.solicitante_nombre}
                    onChange={(e) => setEditField("solicitante_nombre", e.target.value)} />
                ) : (
                  <p className="text-sm text-right text-gray-200">{devolucion.solicitante_nombre}</p>
                )}
                {esAdmin && !editando && (
                  <button onClick={() => setEditando(true)}
                    className="text-xs text-gray-500 hover:text-green-400 transition flex-shrink-0">
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
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
            {editando ? (
              <div className="space-y-3">
                <div>
                  <label className={CLS_LABEL}>Entidad</label>
                  <select className={CLS_INPUT}
                    value={editForm.entidad}
                    onChange={e => setEditForm(f => ({ ...f, entidad: e.target.value }))}>
                    <option value="Earth Park">Earth Park</option>
                    <option value="Corp R&R">Corp R&R</option>
                  </select>
                </div>
                <div>
                  <label className={CLS_LABEL}>Categoría</label>
                  <select className={CLS_INPUT}
                    value={editForm.categoria}
                    onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}>
                    <option value="Reserva">Reserva</option>
                    <option value="Inversión">Inversión</option>
                    <option value="Gasto operativo">Gasto operativo</option>
                    <option value="Nómina">Nómina</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={CLS_LABEL}>Banco / billetera</label>
                  <input type="text" className={CLS_INPUT} value={editForm.banco}
                    onChange={(e) => setEditField("banco", e.target.value)} />
                </div>
                <div>
                  <label className={CLS_LABEL}>Tipo de cuenta</label>
                  <select className={CLS_INPUT} value={editForm.tipo_cuenta}
                    onChange={(e) => setEditField("tipo_cuenta", e.target.value)}>
                    {TIPOS_CUENTA.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={CLS_LABEL}>Titular</label>
                  <input type="text" className={CLS_INPUT} value={editForm.titular_cuenta}
                    onChange={(e) => setEditField("titular_cuenta", e.target.value)} />
                </div>
                <div>
                  <label className={CLS_LABEL}>Número de cuenta / celular</label>
                  <input type="text" className={CLS_INPUT} value={editForm.numero_cuenta}
                    onChange={(e) => setEditField("numero_cuenta", e.target.value)} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={guardarEdicion} disabled={savingEdit}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50
                      text-white font-semibold rounded-lg py-2 text-sm transition">
                    {savingEdit ? "Guardando..." : "💾 Guardar"}
                  </button>
                  <button onClick={cancelarEdicion} disabled={savingEdit}
                    className="flex-1 text-gray-400 hover:text-white border border-gray-700
                      rounded-lg py-2 text-sm transition disabled:opacity-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Banco"   value={devolucion.banco} />
                <InfoRow label="Tipo"    value={devolucion.tipo_cuenta} />
                <InfoRow label="Titular" value={devolucion.titular_cuenta} />
                <InfoRow label="Cuenta"  value={devolucion.numero_cuenta} />
              </>
            )}
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
              {esEfectivo ? (
                <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-300">
                  💵 Pago en efectivo — no requiere comprobante
                </div>
              ) : (
                <div>
                  <label className={CLS_LABEL}>Comprobante de pago (al aprobar)</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={(e) => setArchivo(e.target.files[0])}
                    className="text-sm text-gray-400 file:mr-3 file:py-1 file:px-3
                      file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-300
                      file:text-xs file:cursor-pointer hover:file:bg-gray-600" />
                </div>
              )}
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
              {esEfectivo ? (
                <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-300">
                  💵 Pago en efectivo — no requiere comprobante
                </div>
              ) : (
                <div>
                  <label className={CLS_LABEL}>Comprobante de pago</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={(e) => setArchivo(e.target.files[0])}
                    className="text-sm text-gray-400 file:mr-3 file:py-1 file:px-3
                      file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-300
                      file:text-xs file:cursor-pointer hover:file:bg-gray-600" />
                </div>
              )}
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
  const [filtros, setFiltros] = useState({
    texto: "",
    entidad: "",
    categoria: "",
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });
  const [filtroAbierto, setFiltroAbierto] = useState(null);

  const esAdmin = usuario?.rol === "admin";

  useEffect(() => { cargarDevoluciones(); }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest("th")) setFiltroAbierto(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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

  async function editarDatosSolicitante(id, datos) {
    if (!supabase || !esAdmin) return;
    await supabase.from("devoluciones").update({
      solicitante_nombre: datos.solicitante_nombre,
      entidad: datos.entidad,
      categoria: datos.categoria,
      banco: datos.banco,
      titular_cuenta: datos.titular_cuenta,
      numero_cuenta: datos.numero_cuenta,
      tipo_cuenta: datos.tipo_cuenta,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    await cargarDevoluciones();
  }

  async function actualizarEstado(id, estado, notas, comprobanteFile, tipoCuenta) {
    if (!supabase || !esAdmin) return;
    let comprobante_url = null;
    if (comprobanteFile) {
      const ext = comprobanteFile.name.split(".").pop();
      const path = `${id}.${ext}`;
      await supabase.storage.from("comprobantes").upload(path, comprobanteFile, { upsert: true });
      const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path);
      comprobante_url = urlData?.publicUrl;
    }
    let notasFinal = notas;
    if (estado === "Pagada" && tipoCuenta === "Efectivo" && !comprobanteFile
      && !(notasFinal || "").toLowerCase().includes("efectivo")) {
      notasFinal = `Pago en efectivo. ${notasFinal || ""}`.trim();
    }
    await supabase.from("devoluciones").update({
      estado,
      aprobado_por: usuario.nombre,
      fecha_aprobacion: new Date().toISOString(),
      notas_aprobacion: notasFinal,
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

  const devolucionesFiltradas = useMemo(() => {
    return devoluciones.filter(d => {
      if (filtros.texto) {
        const t = filtros.texto.toLowerCase();
        const match =
          d.solicitante_nombre?.toLowerCase().includes(t) ||
          d.descripcion?.toLowerCase().includes(t);
        if (!match) return false;
      }
      if (filtros.entidad && d.entidad !== filtros.entidad) return false;
      if (filtros.categoria && d.categoria !== filtros.categoria) return false;
      if (filtros.estado && d.estado !== filtros.estado) return false;
      if (filtros.fechaDesde && d.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && d.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [devoluciones, filtros]);

  const resumen = devolucionesFiltradas.reduce((acc, d) => {
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
                  {devolucionesFiltradas.filter((d) => d.estado === estado).length} solicitud(es)
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
                  {/* Fecha */}
                  <th className="px-3 py-2 text-left relative">
                    <button
                      onClick={() => setFiltroAbierto(filtroAbierto === "fecha" ? null : "fecha")}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-medium uppercase tracking-wide"
                    >
                      Fecha
                      <span className={filtros.fechaDesde || filtros.fechaHasta ? "text-green-400" : ""}>▼</span>
                    </button>
                    {filtroAbierto === "fecha" && (
                      <div className="absolute top-8 left-0 z-50 bg-gray-900 border border-gray-700
                        rounded-lg p-3 shadow-xl min-w-48">
                        <p className="text-xs text-gray-400 mb-1">Desde</p>
                        <input type="date" className="w-full bg-gray-800 border border-gray-700
                          rounded px-2 py-1 text-xs text-white mb-2"
                          value={filtros.fechaDesde}
                          onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
                        />
                        <p className="text-xs text-gray-400 mb-1">Hasta</p>
                        <input type="date" className="w-full bg-gray-800 border border-gray-700
                          rounded px-2 py-1 text-xs text-white"
                          value={filtros.fechaHasta}
                          onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
                        />
                        {(filtros.fechaDesde || filtros.fechaHasta) && (
                          <button onClick={() => setFiltros(f => ({ ...f, fechaDesde: "", fechaHasta: "" }))}
                            className="mt-2 text-xs text-red-400 hover:text-red-300">
                            Limpiar
                          </button>
                        )}
                      </div>
                    )}
                  </th>

                  {/* Solicitante */}
                  <th className="px-3 py-2 text-left relative">
                    <button
                      onClick={() => setFiltroAbierto(filtroAbierto === "solicitante" ? null : "solicitante")}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-medium uppercase tracking-wide"
                    >
                      Solicitante
                      <span className={filtros.texto ? "text-green-400" : ""}>▼</span>
                    </button>
                    {filtroAbierto === "solicitante" && (
                      <div className="absolute top-8 left-0 z-50 bg-gray-900 border border-gray-700
                        rounded-lg p-3 shadow-xl min-w-48">
                        <input type="text" placeholder="Buscar..."
                          className="w-full bg-gray-800 border border-gray-700
                            rounded px-2 py-1 text-xs text-white"
                          value={filtros.texto}
                          onChange={e => setFiltros(f => ({ ...f, texto: e.target.value }))}
                          autoFocus
                        />
                        {/* Lista de solicitantes únicos */}
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {[...new Set(devoluciones.map(d => d.solicitante_nombre))].map(s => (
                            <button key={s}
                              onClick={() => { setFiltros(f => ({ ...f, texto: s })); setFiltroAbierto(null); }}
                              className="block w-full text-left text-xs text-gray-300
                                hover:text-white hover:bg-gray-800 rounded px-2 py-1">
                              {s}
                            </button>
                          ))}
                        </div>
                        {filtros.texto && (
                          <button onClick={() => setFiltros(f => ({ ...f, texto: "" }))}
                            className="mt-2 text-xs text-red-400 hover:text-red-300">
                            Limpiar
                          </button>
                        )}
                      </div>
                    )}
                  </th>

                  {/* Entidad */}
                  <th className="px-3 py-2 text-left relative">
                    <button
                      onClick={() => setFiltroAbierto(filtroAbierto === "entidad" ? null : "entidad")}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-medium uppercase tracking-wide"
                    >
                      Entidad
                      <span className={filtros.entidad ? "text-green-400" : ""}>▼</span>
                    </button>
                    {filtroAbierto === "entidad" && (
                      <div className="absolute top-8 left-0 z-50 bg-gray-900 border border-gray-700
                        rounded-lg p-3 shadow-xl min-w-40">
                        {["", "Earth Park", "Corp R&R"].map(op => (
                          <button key={op}
                            onClick={() => { setFiltros(f => ({ ...f, entidad: op })); setFiltroAbierto(null); }}
                            className={`block w-full text-left text-xs rounded px-2 py-1.5
                              hover:bg-gray-800 ${filtros.entidad === op ? "text-green-400" : "text-gray-300"}`}>
                            {op === "" ? "Todas" : op}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* Categoría */}
                  <th className="px-3 py-2 text-left relative">
                    <button
                      onClick={() => setFiltroAbierto(filtroAbierto === "categoria" ? null : "categoria")}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-medium uppercase tracking-wide"
                    >
                      Categoría
                      <span className={filtros.categoria ? "text-green-400" : ""}>▼</span>
                    </button>
                    {filtroAbierto === "categoria" && (
                      <div className="absolute top-8 left-0 z-50 bg-gray-900 border border-gray-700
                        rounded-lg p-3 shadow-xl min-w-44">
                        {["", "Reserva", "Inversión", "Gasto operativo", "Nómina", "Otro"].map(op => (
                          <button key={op}
                            onClick={() => { setFiltros(f => ({ ...f, categoria: op })); setFiltroAbierto(null); }}
                            className={`block w-full text-left text-xs rounded px-2 py-1.5
                              hover:bg-gray-800 ${filtros.categoria === op ? "text-green-400" : "text-gray-300"}`}>
                            {op === "" ? "Todas" : op}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* Monto */}
                  <th className="px-3 py-2 text-right text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Monto
                  </th>

                  {/* Estado */}
                  <th className="px-3 py-2 text-left relative">
                    <button
                      onClick={() => setFiltroAbierto(filtroAbierto === "estado" ? null : "estado")}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-medium uppercase tracking-wide"
                    >
                      Estado
                      <span className={filtros.estado ? "text-green-400" : ""}>▼</span>
                    </button>
                    {filtroAbierto === "estado" && (
                      <div className="absolute top-8 left-0 z-50 bg-gray-900 border border-gray-700
                        rounded-lg p-3 shadow-xl min-w-36">
                        {["", "Pendiente", "Aprobada", "Pagada", "Rechazada"].map(op => (
                          <button key={op}
                            onClick={() => { setFiltros(f => ({ ...f, estado: op })); setFiltroAbierto(null); }}
                            className={`block w-full text-left text-xs rounded px-2 py-1.5
                              hover:bg-gray-800 ${filtros.estado === op ? "text-green-400" : "text-gray-300"}`}>
                            {op === "" ? "Todos" : op}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {devolucionesFiltradas.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">{d.solicitante_nombre}</td>
                    <td className="px-3 py-2 text-gray-400">{d.entidad}</td>
                    <td className="px-3 py-2 text-gray-400">
                      {[d.categoria, d.subcategoria].filter(Boolean).join(" › ")}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-400 font-semibold whitespace-nowrap">
                      {formatCOP(d.monto)}
                    </td>
                    <td className="px-3 py-2">
                      <EstadoBadge estado={d.estado} />
                    </td>
                    <td className="px-3 py-2 text-right">
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
          onEditar={editarDatosSolicitante}
          esAdmin={esAdmin}
        />
      )}
    </div>
  );
}
