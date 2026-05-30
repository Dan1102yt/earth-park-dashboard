import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReservas } from "../../context/ReservasContext";
import { CONFIG } from "../../data/config";
import { formatCOP } from "../../utils/formatCOP";
import { calcularIngresos } from "../../utils/calcularInsumos";
import PageHeader from "../../components/PageHeader";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import ImportarDatos from "../../components/ImportarDatos";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  ChefHat,
  BedDouble,
  Trash2,
  PlusCircle,
  Eye,
  DollarSign,
  Users,
  Receipt,
  Pencil,
  Check,
  XCircle,
} from "lucide-react";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const estadoMap = {
  pagado:   { variant: "ok",      label: "Pagado"   },
  anticipo: { variant: "warn",    label: "Anticipo"  },
  pendiente:{ variant: "danger",  label: "Pendiente" },
};

const CATEGORIAS_EGRESO = [
  "cocina", "desayuno", "cena", "bebida", "evento",
  "transporte", "guía", "mantenimiento", "insumos", "otro",
];

const emptyEgreso = {
  item: "",
  categoria: "cocina",
  tipo: "operativo",
  valor_cop: 0,
  tiene_recibo: false,
  proveedor: "",
  notas: "",
};

export default function ReservasPage() {
  const { state, dispatch } = useReservas();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Egreso inline form state ──
  const [showEgresoForm, setShowEgresoForm] = useState(false);
  const [nuevoEgreso, setNuevoEgreso] = useState({ ...emptyEgreso });
  const [editingEgresoId, setEditingEgresoId] = useState(null);
  const [editingEgresoData, setEditingEgresoData] = useState(null);

  // Calendar
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday first
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  // Available months from reservas
  const availableMonths = useMemo(() => {
    const months = new Set();
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    state.reservas.forEach((r) => {
      const [y, m] = r.fecha_inicio.split("-");
      months.add(`${y}-${m}`);
    });
    return Array.from(months).sort();
  }, [state.reservas]);

  // Filter reservas for selected month
  const filteredReservas = useMemo(() => {
    return state.reservas
      .filter((r) => r.fecha_inicio.startsWith(selectedMonth))
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  }, [state.reservas, selectedMonth]);

  // Map days to reservas
  const dayReservas = useMemo(() => {
    const map = {};
    state.reservas.forEach((r) => {
      const start = new Date(r.fecha_inicio + "T12:00:00");
      const end = new Date(r.fecha_fin + "T12:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(r);
        }
      }
    });
    return map;
  }, [state.reservas, year, month]);

  // Egresos for selected reserva
  const reservaEgresos = useMemo(() => {
    if (!selectedReserva) return [];
    return state.egresos.filter((e) => e.reserva_id === selectedReserva.reserva_id);
  }, [state.egresos, selectedReserva]);

  const dayColor = (day) => {
    const rs = dayReservas[day];
    if (!rs || rs.length === 0) return "";
    const estados = rs.map((r) => r.estado_pago);
    if (estados.includes("pendiente")) return "bg-red-500/20 border-red-500/40 text-red-300";
    if (estados.includes("anticipo")) return "bg-amber-500/20 border-amber-500/40 text-amber-300";
    return "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
  };

  const handleDelete = (reservaId) => {
    dispatch({ type: "DELETE_RESERVA", reserva_id: reservaId });
    setSelectedReserva(null);
    setConfirmDelete(null);
  };

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // ── Egreso handlers ──
  const handleAddEgreso = () => {
    if (!nuevoEgreso.item.trim() || nuevoEgreso.valor_cop <= 0) return;
    const egreso = {
      ...nuevoEgreso,
      egreso_id: `eg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reserva_id: selectedReserva.reserva_id,
      fecha: new Date().toISOString().split("T")[0],
      valor_cop: parseInt(nuevoEgreso.valor_cop) || 0,
    };
    dispatch({ type: "ADD_EGRESO", payload: egreso });
    setNuevoEgreso({ ...emptyEgreso });
    setShowEgresoForm(false);
  };

  const startEditEgreso = (egreso) => {
    setEditingEgresoId(egreso.egreso_id);
    setEditingEgresoData({ ...egreso });
  };

  const cancelEditEgreso = () => {
    setEditingEgresoId(null);
    setEditingEgresoData(null);
  };

  const saveEditEgreso = () => {
    if (!editingEgresoData) return;
    dispatch({
      type: "UPDATE_EGRESO",
      payload: {
        ...editingEgresoData,
        valor_cop: parseInt(editingEgresoData.valor_cop) || 0,
      },
    });
    setEditingEgresoId(null);
    setEditingEgresoData(null);
  };

  // Inline field helpers
  const numFocusSelect = (e) => e.target.select();

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Reservas"
        subtitle={`${filteredReservas.length} reserva${filteredReservas.length !== 1 ? "s" : ""} en ${MONTHS_ES[month - 1]} ${year}`}
        action={
          <button onClick={() => navigate("/nueva")} className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" />
            Nueva Reserva
          </button>
        }
      />

      {/* ── Import CSV Panel ──────────────────── */}
      <ImportarDatos />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Calendar + List ────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          {/* Month Nav + Calendar */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="btn-ghost p-2">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-800/60 border-gray-700/50 rounded-lg text-sm px-3 py-1.5 focus:ring-emerald-500/50"
                >
                  {availableMonths.map((m) => {
                    const [y, mo] = m.split("-").map(Number);
                    return <option key={m} value={m}>{MONTHS_ES[mo - 1]} {y}</option>;
                  })}
                </select>
              </div>
              <button onClick={nextMonth} className="btn-ghost p-2">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
                <div key={d} className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-wider py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`b-${i}`} />)}
              {days.map((day) => {
                const hasReserva = dayReservas[day]?.length > 0;
                const color = dayColor(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (hasReserva) setSelectedReserva(dayReservas[day][0]);
                    }}
                    className={`aspect-square rounded-lg border text-sm font-medium transition-all duration-150
                      ${hasReserva
                        ? `${color} cursor-pointer hover:scale-105`
                        : "border-gray-800/30 text-gray-600 hover:bg-gray-800/30"
                      }
                      ${day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()
                        ? "ring-1 ring-emerald-500/50"
                        : ""
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/60" /> Pagado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/60" /> Anticipo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60" /> Pendiente</span>
            </div>
          </div>

          {/* Reservas Table */}
          <div className="glass-card overflow-hidden">
            {filteredReservas.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin reservas"
                message={`No hay reservas para ${MONTHS_ES[month - 1]} ${year}`}
                action={{ label: "Crear reserva", onClick: () => navigate("/nueva") }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-dark min-w-[480px]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fechas</th>
                      <th>Plan</th>
                      <th>Personas</th>
                      <th>Ingresos</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservas.map((r) => {
                      const isHist = r.es_historico;
                      const totalDisplay = isHist
                        ? r.ingreso_total
                        : calcularIngresos(r, CONFIG).total;
                      const est = estadoMap[r.estado_pago];
                      return (
                        <tr
                          key={r.reserva_id}
                          className={`cursor-pointer ${selectedReserva?.reserva_id === r.reserva_id ? "bg-emerald-500/5" : ""}`}
                          onClick={() => setSelectedReserva(r)}
                        >
                          <td>
                            <code className={`text-xs font-mono ${isHist ? "text-violet-400" : "text-emerald-400"}`}>{r.reserva_id}</code>
                          </td>
                          <td className="text-xs text-gray-400 whitespace-nowrap">
                            {r.fecha_inicio} → {r.fecha_fin}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Badge variant="info">{r.plan}</Badge>
                              {isHist && <Badge variant="pending">CSV</Badge>}
                            </div>
                          </td>
                          <td className="text-center">{r.total_personas}</td>
                          <td className="text-right font-mono text-sm">{formatCOP(totalDisplay, { short: true })}</td>
                          <td><Badge variant={est.variant}>{est.label}</Badge></td>
                          <td>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedReserva(r); }}
                              className="text-gray-500 hover:text-gray-300 p-1"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ───────────────────── */}
        <div className="xl:col-span-1">
          {selectedReserva ? (
            <div className="glass-card p-5 sm:p-6 lg:sticky lg:top-6 animate-slide-in-right space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{selectedReserva.cliente}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className={`text-xs font-mono ${selectedReserva.es_historico ? "text-violet-400/70" : "text-emerald-400/70"}`}>{selectedReserva.reserva_id}</code>
                    {selectedReserva.es_historico && <Badge variant="pending">Histórico</Badge>}
                  </div>
                </div>
                <button onClick={() => setSelectedReserva(null)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fechas</span>
                  <span className="text-gray-300">{selectedReserva.fecha_inicio} → {selectedReserva.fecha_fin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <Badge variant="info">{selectedReserva.plan}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Personas</span>
                  <span className="text-gray-300 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {selectedReserva.total_personas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <Badge variant={estadoMap[selectedReserva.estado_pago].variant}>
                    {estadoMap[selectedReserva.estado_pago].label}
                  </Badge>
                </div>
                {selectedReserva.cuenta_pago && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cuenta pago</span>
                    <span className="text-gray-300 capitalize">{selectedReserva.cuenta_pago}</span>
                  </div>
                )}
              </div>

              {/* Ingresos — different display for historical vs regular */}
              {selectedReserva.es_historico ? (
                <div className="border-t border-gray-800/50 pt-4 space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Productos vendidos</p>
                  {selectedReserva.lineas_negocio?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedReserva.lineas_negocio.map((ln) => (
                        <span key={ln} className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">{ln}</span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {(selectedReserva.productos || []).map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-400 truncate mr-2">{p.unidades}× {p.nombre}</span>
                        <span className="text-gray-200 whitespace-nowrap">{formatCOP(p.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-800/50 pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-violet-400">{formatCOP(selectedReserva.ingreso_total)}</span>
                  </div>
                </div>
              ) : (
                (() => {
                  const ing = calcularIngresos(selectedReserva, CONFIG);
                  return (
                    <div className="border-t border-gray-800/50 pt-4 space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Desglose de ingresos</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Experiencias</span>
                        <span className="text-gray-200">{formatCOP(ing.experiencias)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Alimentación</span>
                        <span className="text-gray-200">{formatCOP(ing.alimentacion)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Alojamiento</span>
                        <span className="text-gray-200">{formatCOP(ing.alojamiento)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Guía</span>
                        <span className="text-gray-200">{formatCOP(ing.guia)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-gray-800/50 pt-2">
                        <span className="text-white">Total</span>
                        <span className="text-emerald-400">{formatCOP(ing.total)}</span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Pago */}
              <div className="border-t border-gray-800/50 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Anticipo</span>
                  <span className="text-emerald-400">{formatCOP(selectedReserva.anticipo_cop)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Saldo</span>
                  <span className="text-amber-400">{formatCOP(selectedReserva.saldo_cop)}</span>
                </div>
              </div>

              {/* ── EGRESOS DE ESTA RESERVA ─────────── */}
              <div className="border-t border-gray-800/50 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    Egresos de esta reserva
                  </p>
                  <span className="text-xs font-mono text-amber-400">
                    {formatCOP(reservaEgresos.reduce((s, e) => s + (e.valor_cop || 0), 0))}
                  </span>
                </div>

                {reservaEgresos.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {reservaEgresos.map((eg) => (
                      <div key={eg.egreso_id}>
                        {editingEgresoId === eg.egreso_id ? (
                          /* ── Inline Edit Form ── */
                          <div className="bg-sky-500/5 border border-sky-500/20 rounded-lg p-3 space-y-2 animate-fade-in">
                            <input
                              type="text"
                              value={editingEgresoData.item}
                              onChange={(e) => setEditingEgresoData((d) => ({ ...d, item: e.target.value }))}
                              className="text-xs py-1.5 px-2"
                              placeholder="Ítem"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingEgresoData.categoria}
                                onChange={(e) => setEditingEgresoData((d) => ({ ...d, categoria: e.target.value }))}
                                className="text-xs py-1.5 px-2"
                              >
                                {CATEGORIAS_EGRESO.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select
                                value={editingEgresoData.tipo}
                                onChange={(e) => setEditingEgresoData((d) => ({ ...d, tipo: e.target.value }))}
                                className="text-xs py-1.5 px-2"
                              >
                                <option value="operativo">Operativo</option>
                                <option value="extraordinario">Extraordinario</option>
                              </select>
                            </div>
                            <input
                              type="number"
                              value={editingEgresoData.valor_cop}
                              onFocus={numFocusSelect}
                              onChange={(e) => setEditingEgresoData((d) => ({ ...d, valor_cop: parseInt(e.target.value) || 0 }))}
                              className="text-xs py-1.5 px-2"
                              placeholder="Valor COP"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editingEgresoData.proveedor}
                                onChange={(e) => setEditingEgresoData((d) => ({ ...d, proveedor: e.target.value }))}
                                className="text-xs py-1.5 px-2"
                                placeholder="Proveedor"
                              />
                              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingEgresoData.tiene_recibo}
                                  onChange={(e) => setEditingEgresoData((d) => ({ ...d, tiene_recibo: e.target.checked }))}
                                  className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/30"
                                />
                                Recibo
                              </label>
                            </div>
                            <input
                              type="text"
                              value={editingEgresoData.notas}
                              onChange={(e) => setEditingEgresoData((d) => ({ ...d, notas: e.target.value }))}
                              className="text-xs py-1.5 px-2"
                              placeholder="Notas"
                            />
                            <div className="flex gap-2">
                              <button type="button" onClick={saveEditEgreso} className="flex-1 bg-emerald-500/20 text-emerald-400 text-xs py-1.5 rounded-lg hover:bg-emerald-500/30 flex items-center justify-center gap-1 transition-colors">
                                <Check className="w-3 h-3" /> Guardar
                              </button>
                              <button type="button" onClick={cancelEditEgreso} className="flex-1 bg-gray-700/50 text-gray-400 text-xs py-1.5 rounded-lg hover:bg-gray-700/70 flex items-center justify-center gap-1 transition-colors">
                                <XCircle className="w-3 h-3" /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Display Row ── */
                          <div className="flex items-center justify-between text-sm group">
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-400 truncate block">{eg.item}</span>
                              <span className="text-[10px] text-gray-600">
                                {eg.categoria} · {eg.tipo}
                                {eg.tiene_recibo && " · ✓ recibo"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-gray-200 font-mono text-xs">{formatCOP(eg.valor_cop)}</span>
                              <button
                                type="button"
                                onClick={() => startEditEgreso(eg)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-sky-400 p-0.5 transition-all"
                                title="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">Sin egresos registrados</p>
                )}

                {/* Add egreso form */}
                {showEgresoForm ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2 animate-fade-in">
                    <input
                      type="text"
                      value={nuevoEgreso.item}
                      onChange={(e) => setNuevoEgreso((d) => ({ ...d, item: e.target.value }))}
                      className="text-xs py-1.5 px-2"
                      placeholder="Nombre del ítem"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={nuevoEgreso.categoria}
                        onChange={(e) => setNuevoEgreso((d) => ({ ...d, categoria: e.target.value }))}
                        className="text-xs py-1.5 px-2"
                      >
                        {CATEGORIAS_EGRESO.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        value={nuevoEgreso.tipo}
                        onChange={(e) => setNuevoEgreso((d) => ({ ...d, tipo: e.target.value }))}
                        className="text-xs py-1.5 px-2"
                      >
                        <option value="operativo">Operativo</option>
                        <option value="extraordinario">Extraordinario</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      value={nuevoEgreso.valor_cop}
                      onFocus={numFocusSelect}
                      onChange={(e) => setNuevoEgreso((d) => ({ ...d, valor_cop: parseInt(e.target.value) || 0 }))}
                      className="text-xs py-1.5 px-2"
                      placeholder="Valor COP"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={nuevoEgreso.proveedor}
                        onChange={(e) => setNuevoEgreso((d) => ({ ...d, proveedor: e.target.value }))}
                        className="text-xs py-1.5 px-2"
                        placeholder="Proveedor"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nuevoEgreso.tiene_recibo}
                          onChange={(e) => setNuevoEgreso((d) => ({ ...d, tiene_recibo: e.target.checked }))}
                          className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/30"
                        />
                        Recibo
                      </label>
                    </div>
                    <input
                      type="text"
                      value={nuevoEgreso.notas}
                      onChange={(e) => setNuevoEgreso((d) => ({ ...d, notas: e.target.value }))}
                      className="text-xs py-1.5 px-2"
                      placeholder="Notas"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleAddEgreso} className="flex-1 bg-emerald-500/20 text-emerald-400 text-xs py-1.5 rounded-lg hover:bg-emerald-500/30 flex items-center justify-center gap-1 transition-colors">
                        <Check className="w-3 h-3" /> Guardar
                      </button>
                      <button type="button" onClick={() => { setShowEgresoForm(false); setNuevoEgreso({ ...emptyEgreso }); }} className="flex-1 bg-gray-700/50 text-gray-400 text-xs py-1.5 rounded-lg hover:bg-gray-700/70 flex items-center justify-center gap-1 transition-colors">
                        <XCircle className="w-3 h-3" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEgresoForm(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 py-2 border border-dashed border-emerald-500/30 rounded-lg hover:bg-emerald-500/5 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Agregar egreso manual
                  </button>
                )}
              </div>

              {/* Notas */}
              {selectedReserva.notas && (
                <div className="border-t border-gray-800/50 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-gray-400 italic">{selectedReserva.notas}</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-800/50 pt-4 space-y-2">
                <button
                  onClick={() => navigate(`/cocina?reserva_id=${selectedReserva.reserva_id}`)}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <ChefHat className="w-4 h-4" />
                  Ver Cocina
                </button>
                <button
                  onClick={() => navigate(`/hospedaje?reserva_id=${selectedReserva.reserva_id}`)}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <BedDouble className="w-4 h-4" />
                  Ver Hospedaje
                </button>
                <button
                  onClick={() => setConfirmDelete(selectedReserva.reserva_id)}
                  className="btn-danger w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center sticky top-6">
              <CalendarDays className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Selecciona una reserva del calendario o la tabla</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Eliminar reserva"
        message={`¿Seguro que deseas eliminar la reserva ${confirmDelete}? Esta acción también eliminará todos los egresos asociados.`}
      />
    </div>
  );
}
