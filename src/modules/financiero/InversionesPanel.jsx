import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Wallet, Calendar, Percent, Plus, X,
} from 'lucide-react';

import { useReservas } from '../../context/ReservasContext';
import { formatCOP } from '../../utils/formatCOP';
import { calcularIngresos } from '../../utils/calcularInsumos';
import Badge from '../../components/Badge';

/* ─────────────────────────────────────────────
   Hardcoded inversiones data
   ───────────────────────────────────────────── */

const INVERSIONES = [
  { id: "INV-001", descripcion: "Vivero café Manuel Acero", valor: 3000000, fecha: "2025-10-20", categoria: "Infraestructura" },
  { id: "INV-002", descripcion: "Segundo pago vivero café", valor: 2800000, fecha: "2025-11-05", categoria: "Infraestructura" },
  { id: "INV-003", descripcion: "Techo PVC", valor: 4000000, fecha: "2025-11-08", categoria: "Construcción" },
  { id: "INV-004", descripcion: "Pago Manuel Acero EP", valor: 3000000, fecha: "2025-11-15", categoria: "Infraestructura" },
  { id: "INV-005", descripcion: "Devolución préstamo", valor: 2000000, fecha: "2025-11-17", categoria: "Financiero" },
  { id: "INV-006", descripcion: "Pago Manuel Acero EP", valor: 3000000, fecha: "2025-11-22", categoria: "Infraestructura" },
  { id: "INV-007", descripcion: "Pago Manuel Acero EP", valor: 3500000, fecha: "2025-11-29", categoria: "Infraestructura" },
  { id: "INV-008", descripcion: "Materiales construcción", valor: 2500000, fecha: "2025-12-01", categoria: "Construcción" },
  { id: "INV-009", descripcion: "Pago Manuel Acero EP", valor: 3000000, fecha: "2025-12-08", categoria: "Infraestructura" },
  { id: "INV-010", descripcion: "Materiales Earth Park", valor: 2735035, fecha: "2025-12-15", categoria: "Construcción" },
  { id: "INV-011", descripcion: "Inversión infraestructura", valor: 2500000, fecha: "2026-01-10", categoria: "Infraestructura" },
  { id: "INV-012", descripcion: "Adecuaciones EP", valor: 3000000, fecha: "2026-01-20", categoria: "Adecuación" },
  { id: "INV-013", descripcion: "Materiales y acabados", valor: 2500000, fecha: "2026-02-05", categoria: "Construcción" },
  { id: "INV-014", descripcion: "Equipamiento EP", valor: 3000000, fecha: "2026-02-20", categoria: "Equipamiento" },
  { id: "INV-015", descripcion: "Adecuación mariposas", valor: 2000000, fecha: "2026-03-10", categoria: "Adecuación" },
  { id: "INV-016", descripcion: "Materiales hospedaje", valor: 2500000, fecha: "2026-03-25", categoria: "Construcción" },
  { id: "INV-017", descripcion: "Equipamiento habitaciones", valor: 2000000, fecha: "2026-04-05", categoria: "Equipamiento" },
  { id: "INV-018", descripcion: "Acabados finales EP", valor: 1500000, fecha: "2026-04-20", categoria: "Construcción" },
  { id: "INV-019", descripcion: "Señalización EP", valor: 1000000, fecha: "2026-05-01", categoria: "Adecuación" },
  { id: "INV-020", descripcion: "Materiales varios EP", valor: 1000000, fecha: "2026-05-15", categoria: "Infraestructura" },
];

const BAR_COLOR = "#1B4332";

const CATEGORIA_COLORS = {
  "Infraestructura": "info",
  "Construcción": "warn",
  "Equipamiento": "ok",
  "Adecuación": "pending",
  "Financiero": "danger",
  "Otro": "info",
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMonthKey(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  if (isNaN(d.getTime())) return 'sin-fecha';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelFromMonthKey(key) {
  const [y, m] = key.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

/* ─────────────────────────────────────────────
   InversionesPanel
   ───────────────────────────────────────────── */

export default function InversionesPanel() {
  const { state } = useReservas();
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [showForm, setShowForm] = useState(false);
  const [extraInversiones, setExtraInversiones] = useState([]);
  const [form, setForm] = useState({
    descripcion: '',
    valor: '',
    fecha: '',
    categoria: 'Infraestructura',
  });

  // Combine hardcoded + extra
  const inversiones = useMemo(
    () => [...INVERSIONES, ...extraInversiones],
    [extraInversiones],
  );

  const totalInvertido = useMemo(
    () => inversiones.reduce((sum, i) => sum + i.valor, 0),
    [inversiones],
  );

  const { periodoLabel, periodoMeses } = useMemo(() => {
    const dates = inversiones.map((i) => i.fecha).filter(Boolean).sort();
    if (!dates.length) return { periodoLabel: '—', periodoMeses: 0 };
    const d1 = new Date(dates[0] + 'T12:00:00');
    const d2 = new Date(dates[dates.length - 1] + 'T12:00:00');
    const fmt = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const l1 = fmt(d1);
    const l2 = fmt(d2);
    const meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
    return { periodoLabel: l1 === l2 ? l1 : `${l1} – ${l2}`, periodoMeses: meses };
  }, [inversiones]);

  // ROI dinámico desde el contexto
  const roi = useMemo(() => {
    const ingresos = (state.reservas || []).reduce((sum, r) => {
      if (r.es_historico) return sum + (r.ingreso_total || 0);
      return sum + calcularIngresos(r).total;
    }, 0);
    if (totalInvertido <= 0) return 0;
    return ((ingresos - totalInvertido) / totalInvertido) * 100;
  }, [state.reservas, totalInvertido]);

  // Categorías únicas para filtro
  const categorias = useMemo(() => {
    const set = new Set(inversiones.map((i) => i.categoria));
    return ['todas', ...Array.from(set).sort()];
  }, [inversiones]);

  // Filtrado
  const inversionesFiltradas = useMemo(() => {
    if (filtroCategoria === 'todas') return inversiones;
    return inversiones.filter((i) => i.categoria === filtroCategoria);
  }, [inversiones, filtroCategoria]);

  // BarChart data — agrupado por mes
  const chartData = useMemo(() => {
    const byMonth = {};
    inversiones.forEach((inv) => {
      const key = formatMonthKey(inv.fecha);
      if (!byMonth[key]) byMonth[key] = 0;
      byMonth[key] += inv.valor;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({
        mes: labelFromMonthKey(key),
        total,
      }));
  }, [inversiones]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.descripcion || !form.valor || !form.fecha) return;
    const nueva = {
      id: `INV-EXT-${Date.now()}`,
      descripcion: form.descripcion,
      valor: Number(form.valor),
      fecha: form.fecha,
      categoria: form.categoria,
    };
    setExtraInversiones((prev) => [...prev, nueva]);
    setForm({ descripcion: '', valor: '', fecha: '', categoria: 'Infraestructura' });
    setShowForm(false);
  };

  return (
    <section className="animate-slide-up space-y-6" style={{ animationDelay: '0.35s' }}>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Wallet className="w-4 h-4" />
        Inversiones Earth Park
      </h3>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total invertido</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-gray-100 tabular-nums">
            {formatCOP(totalInvertido)}
          </p>
          <p className="text-xs text-gray-500 mt-1">capital total</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Inversiones</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-gray-100 tabular-nums">{inversiones.length}</p>
          <p className="text-xs text-gray-500 mt-1">operaciones</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Período</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-gray-100">{periodoLabel}</p>
          <p className="text-xs text-gray-500 mt-1">{periodoMeses} {periodoMeses === 1 ? 'mes' : 'meses'}</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">ROI</span>
            <Percent className="w-4 h-4 text-violet-400" />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {roi.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">ingresos vs inversión</p>
        </div>
      </div>

      {/* BarChart por mes */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">
          Inversión por mes
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#4b5563' }}
                tickLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#4b5563' }}
                tickLine={{ stroke: '#4b5563' }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#e5e7eb',
                }}
                formatter={(v) => formatCOP(v)}
              />
              <Bar dataKey="total" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla con filtro */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-300">Detalle de inversiones</h4>
          <div className="flex items-center gap-3">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-gray-900/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c === 'todas' ? 'Todas las categorías' : c}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/40 text-gray-300 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">ID</th>
                <th className="text-left px-4 py-3 font-semibold">Descripción</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold">Categoría</th>
                <th className="text-right px-4 py-3 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {inversionesFiltradas.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-700/20 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <code className="text-xs text-emerald-400 font-mono">{inv.id}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{inv.descripcion}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">
                    {inv.fecha}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={CATEGORIA_COLORS[inv.categoria] || 'info'}>
                      {inv.categoria}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-200">
                    {formatCOP(inv.valor)}
                  </td>
                </tr>
              ))}
              {inversionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No hay inversiones en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de inversión manual */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                          w-full max-w-md bg-gray-900 border border-gray-700/60 rounded-2xl
                          shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-100">Nueva inversión</h4>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  required
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Valor COP</label>
                  <input
                    type="number"
                    min="0"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    required
                    className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                    className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {Object.keys(CATEGORIA_COLORS).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
