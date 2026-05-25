import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReservas } from "../../context/ReservasContext";
import { CONFIG } from "../../data/config";
import { PLANES, calcularCostoOperativoPlan, calcularIngresoEsperado } from "../../data/planesConfig";
import { formatCOP } from "../../utils/formatCOP";
import { generarReservaId, validarFormReserva, calcularFechaFin } from "../../utils/validarReserva";
import { calcularIngresos, calcularPagos, calcularListaCompras, totalListaCompras } from "../../utils/calcularInsumos";
import { calcularHospedaje } from "../../utils/calcularHospedaje";
import PageHeader from "../../components/PageHeader";
import Badge from "../../components/Badge";
import MetricCard from "../../components/MetricCard";
import {
  DollarSign,
  Users,
  BedDouble,
  AlertTriangle,
  Send,
  Sparkles,
  ShoppingCart,
  Home,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Coffee,
  Wallet,
} from "lucide-react";

const initialForm = {
  cliente: "",
  fecha_inicio: "",
  plan: "2D1N",
  total_personas: 1,
  personas_alimentacion: 1,
  personas_alojamiento: 1,
  n_hamburguesa: 0,
  n_pechuga: 0,
  estado_pago: "anticipo",
  anticipo_cop: 0,
  notas: "",
  cuenta_pago: "",
};

// Helper: onFocus select-all for numeric inputs
const numFocus = (e) => e.target.select();

// Helper: onBlur reset to 0 if empty
const numBlur = (setter, field) => (e) => {
  if (e.target.value === "" || e.target.value === undefined) {
    setter(field, 0);
  }
};

export default function NuevaReserva() {
  const [form, setForm] = useState(initialForm);
  const [errores, setErrores] = useState([]);
  const [toast, setToast] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const { dispatch } = useReservas();
  const navigate = useNavigate();

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setNum = (field, value) => set(field, Math.max(0, parseInt(value) || 0));

  // ── Derived values ────────────────────────────
  const reservaId = useMemo(
    () => form.cliente && form.fecha_inicio ? generarReservaId(form.cliente, form.fecha_inicio) : "",
    [form.cliente, form.fecha_inicio]
  );

  const fechaFin = useMemo(
    () => calcularFechaFin(form.fecha_inicio, form.plan),
    [form.fecha_inicio, form.plan]
  );

  // n_desayuno = total_personas (auto-calculated)
  const nDesayuno = form.total_personas;

  // precio_por_persona from plan config
  const precioPorPersona = useMemo(() => {
    const planConfig = PLANES[form.plan];
    return planConfig ? planConfig.precio_por_persona : 0;
  }, [form.plan]);

  // Costo operativo estimado from plan
  const costoOperativoEstimado = useMemo(
    () => calcularCostoOperativoPlan(form.plan, form.total_personas),
    [form.plan, form.total_personas]
  );

  // Ingreso esperado from plan
  const ingresoEsperado = useMemo(
    () => calcularIngresoEsperado(form.plan, form.total_personas),
    [form.plan, form.total_personas]
  );

  const preview = useMemo(() => {
    if (!form.total_personas || form.total_personas < 1) return null;
    const reservaData = {
      ...form,
      total_personas: form.total_personas,
      personas_alimentacion: form.personas_alimentacion,
      personas_alojamiento: form.personas_alojamiento,
    };
    const ingresos = calcularIngresos(reservaData, CONFIG);
    const pagos = calcularPagos(ingresos.total);
    const lista = calcularListaCompras(reservaData, CONFIG);
    const totalCompras = totalListaCompras(lista);
    const hospedaje = calcularHospedaje(form.personas_alojamiento);
    return { ingresos, pagos, totalCompras, hospedaje };
  }, [form]);

  const today = new Date().toISOString().split("T")[0];

  // Plan config for expandable detail
  const planConfig = PLANES[form.plan];

  const handleSubmit = (e) => {
    e.preventDefault();
    const validacion = validarFormReserva(form);
    if (!validacion.valido) {
      setErrores(validacion.errores);
      return;
    }
    if (!reservaId) {
      setErrores(["Complete el nombre y fecha para generar ID"]);
      return;
    }

    const ingresos = calcularIngresos(form, CONFIG);
    const pagos = calcularPagos(ingresos.total);

    const nuevaReserva = {
      reserva_id: reservaId,
      cliente: form.cliente.trim(),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: fechaFin,
      plan: form.plan,
      total_personas: form.total_personas,
      personas_alimentacion: form.personas_alimentacion,
      personas_alojamiento: form.personas_alojamiento,
      n_hamburguesa: form.n_hamburguesa,
      n_pechuga: form.n_pechuga,
      n_desayuno: nDesayuno,
      estado_pago: form.estado_pago,
      anticipo_cop: form.estado_pago === "pagado" ? ingresos.total : (form.anticipo_cop || pagos.anticipo),
      saldo_cop: form.estado_pago === "pagado" ? 0 : ingresos.total - (form.anticipo_cop || pagos.anticipo),
      cuenta_pago: form.cuenta_pago,
      costo_operativo_estimado: costoOperativoEstimado,
      notas: form.notas,
      created_at: new Date().toISOString(),
    };

    dispatch({ type: "ADD_RESERVA", payload: nuevaReserva });
    setToast(true);
    setTimeout(() => {
      setToast(false);
      navigate("/reservas");
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Nueva Reserva"
        subtitle="Registrar una nueva reserva de experiencia Earth Park"
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 toast-enter">
          <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">¡Reserva creada exitosamente!</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Form Column ──────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Errores */}
            {errores.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <ul className="text-sm text-red-400 space-y-1">
                    {errores.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* ID Preview */}
            {reservaId && (
              <div className="glass-card p-4 flex items-center gap-3 animate-fade-in">
                <span className="text-xs text-gray-500 uppercase tracking-wider">ID:</span>
                <code className="text-emerald-400 font-mono font-bold text-sm">{reservaId}</code>
              </div>
            )}

            {/* Datos generales */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Datos del Grupo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Nombre / Apellido del grupo *</label>
                  <input
                    type="text"
                    value={form.cliente}
                    onChange={(e) => set("cliente", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
                    placeholder="Ej: Viviana"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Fecha de inicio *</label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    min={today}
                    onChange={(e) => set("fecha_inicio", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Plan *</label>
                  <select value={form.plan} onChange={(e) => set("plan", e.target.value)}>
                    <option value="2D1N">2 Días / 1 Noche</option>
                    <option value="3D2N">3 Días / 2 Noches</option>
                    <option value="visita">Visita Earth Park</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Fecha fin (automática)</label>
                  <input type="date" value={fechaFin} readOnly className="opacity-60 cursor-not-allowed" />
                </div>
              </div>

              {/* ── Plan detail expandable ── */}
              {planConfig && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setPlanOpen(!planOpen)}
                    className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                  >
                    {planOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Ver qué incluye este plan
                  </button>
                  {planOpen && (
                    <div className="mt-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-3 animate-fade-in">
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">{planConfig.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{planConfig.descripcion}</p>
                      </div>
                      <div className="space-y-1.5">
                        {planConfig.incluye.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-400">
                              {item.cantidad > 1 ? `${item.cantidad}× ` : ""}{item.item}
                            </span>
                            <span className={item.costo_unit > 0 ? "text-gray-300 font-mono" : "text-emerald-500/60"}>
                              {item.costo_unit > 0
                                ? `${formatCOP(item.costo_unit)} c/u`
                                : "Incluido"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-emerald-500/15 pt-2 flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Precio por persona</span>
                        <span className="text-emerald-400">{formatCOP(planConfig.precio_por_persona)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Costo operativo estimado ({form.total_personas} pers.)</span>
                        <span className="text-amber-400">{formatCOP(costoOperativoEstimado)}</span>
                      </div>
                      {planConfig.notas && (
                        <p className="text-[10px] text-gray-600 italic">{planConfig.notas}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Personas */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Personas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Total personas *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.total_personas}
                    onFocus={numFocus}
                    onBlur={(e) => {
                      if (!e.target.value || parseInt(e.target.value) < 1) {
                        setForm((f) => ({ ...f, total_personas: 1, personas_alimentacion: 1, personas_alojamiento: 1 }));
                      }
                    }}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      setForm((f) => ({
                        ...f,
                        total_personas: v,
                        personas_alimentacion: Math.min(f.personas_alimentacion, v),
                        personas_alojamiento: Math.min(f.personas_alojamiento, v),
                      }));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Alimentación</label>
                  <input
                    type="number"
                    min={0}
                    max={form.total_personas}
                    value={form.personas_alimentacion}
                    onFocus={numFocus}
                    onBlur={numBlur(setNum, "personas_alimentacion")}
                    onChange={(e) => setNum("personas_alimentacion", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Alojamiento</label>
                  <input
                    type="number"
                    min={0}
                    max={form.total_personas}
                    value={form.personas_alojamiento}
                    onFocus={numFocus}
                    onBlur={numBlur(setNum, "personas_alojamiento")}
                    onChange={(e) => setNum("personas_alojamiento", e.target.value)}
                  />
                </div>
              </div>

              {/* Desayuno auto-calculated (read-only) */}
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <label className="text-xs text-amber-400 font-medium">Desayunos (caldo de costilla)</label>
                </div>
                <input
                  type="number"
                  value={nDesayuno}
                  readOnly
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-[10px] text-amber-500/70 mt-1.5 italic">
                  1 desayuno por persona — incluido en el plan
                </p>
              </div>
            </div>

            {/* Cena */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                Menú de Cena
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Hamburguesas
                    <span className="text-gray-600 ml-1">(máx {form.total_personas})</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.total_personas}
                    value={form.n_hamburguesa}
                    onFocus={numFocus}
                    onBlur={numBlur(setNum, "n_hamburguesa")}
                    onChange={(e) => setNum("n_hamburguesa", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Pechugas
                    <span className="text-gray-600 ml-1">(máx {form.total_personas})</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.total_personas}
                    value={form.n_pechuga}
                    onFocus={numFocus}
                    onBlur={numBlur(setNum, "n_pechuga")}
                    onChange={(e) => setNum("n_pechuga", e.target.value)}
                  />
                </div>
              </div>
              {(form.n_hamburguesa + form.n_pechuga > form.total_personas) && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Hamburguesas + pechugas no puede superar total personas
                </p>
              )}
            </div>

            {/* Pago */}
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Estado de Pago
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Estado *</label>
                  <select value={form.estado_pago} onChange={(e) => set("estado_pago", e.target.value)}>
                    <option value="anticipo">Anticipo (50%)</option>
                    <option value="pagado">Pagado completo</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
                {form.estado_pago === "anticipo" && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Monto anticipo (COP)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.anticipo_cop}
                      onFocus={numFocus}
                      onBlur={numBlur(setNum, "anticipo_cop")}
                      onChange={(e) => setNum("anticipo_cop", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Cuenta de pago */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Wallet className="w-3 h-3" />
                  Cuenta de pago recibido
                </label>
                <select value={form.cuenta_pago} onChange={(e) => set("cuenta_pago", e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Notas */}
            <div className="glass-card p-6">
              <label className="block text-xs text-gray-400 mb-1.5">Notas adicionales</label>
              <textarea
                rows={3}
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                placeholder="Eventos especiales, alergias, solicitudes…"
              />
            </div>

            {/* Submit */}
            <button type="submit" className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              Crear Reserva
            </button>
          </div>

          {/* ── Preview Column ───────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="sticky top-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Previsualización en vivo
              </h2>

              {preview ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Plan revenue */}
                  <div className="glass-card p-5 space-y-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Ingreso esperado (plan)</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      {formatCOP(ingresoEsperado)}
                    </p>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{formatCOP(precioPorPersona)} × {form.total_personas} personas</span>
                    </div>
                  </div>

                  {/* Ingresos */}
                  <div className="glass-card p-5 space-y-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Ingresos estimados (cálculo interno)</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCOP(preview.ingresos.total)}
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Experiencias</span>
                        <span className="text-gray-300">{formatCOP(preview.ingresos.experiencias)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Alimentación</span>
                        <span className="text-gray-300">{formatCOP(preview.ingresos.alimentacion)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Alojamiento</span>
                        <span className="text-gray-300">{formatCOP(preview.ingresos.alojamiento)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Guía</span>
                        <span className="text-gray-300">{formatCOP(preview.ingresos.guia)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Costo operativo plan */}
                  <div className="glass-card p-5">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Costo operativo plan</p>
                    </div>
                    <p className="text-xl font-bold text-amber-400">
                      {formatCOP(costoOperativoEstimado)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Margen estimado: {ingresoEsperado > 0
                        ? ((1 - costoOperativoEstimado / ingresoEsperado) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>

                  {/* Pagos */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Anticipo 50%"
                      value={formatCOP(preview.pagos.anticipo)}
                      colorVariant="earth"
                      icon={DollarSign}
                    />
                    <MetricCard
                      label="Saldo"
                      value={formatCOP(preview.pagos.saldo)}
                      colorVariant="bark"
                      icon={DollarSign}
                    />
                  </div>

                  {/* Compras */}
                  <div className="glass-card p-5">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Lista de compras</p>
                      <ShoppingCart className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-xl font-bold text-amber-400">
                      {formatCOP(preview.totalCompras)}
                    </p>
                  </div>

                  {/* Hospedaje */}
                  <div className="glass-card p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Hospedaje</p>
                      <Home className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Internas: </span>
                        <span className="text-white font-semibold">{preview.hospedaje.personas_internas}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Externas: </span>
                        <span className={`font-semibold ${preview.hospedaje.personas_externas > 0 ? "text-red-400" : "text-white"}`}>
                          {preview.hospedaje.personas_externas}
                        </span>
                      </div>
                    </div>
                    {preview.hospedaje.alerta_externos.activa && (
                      <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-400">{preview.hospedaje.alerta_externos.mensaje}</p>
                      </div>
                    )}
                  </div>

                  {/* Plan Badge */}
                  <div className="flex gap-2">
                    <Badge variant="info">{form.plan}</Badge>
                    {fechaFin && (
                      <Badge variant="pending">
                        {form.fecha_inicio} → {fechaFin}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-8 text-center">
                  <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">
                    Completa el formulario para ver la previsualización
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
