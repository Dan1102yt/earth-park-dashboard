import React, { useState, useMemo } from 'react';
import {
  DollarSign, ArrowDownCircle, TrendingUp, Percent,
  Calendar, ChevronDown, FileBarChart, PieChart as PieChartIcon,
  Download, BarChart3, Target, AlertTriangle,
  ArrowUpRight, ArrowDownRight, X, Info,
  CheckCircle, AlertCircle, Award, ShoppingBag,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, Label,
  ReferenceLine,
} from 'recharts';

import { useReservas } from '../../context/ReservasContext';
import { formatCOP } from '../../utils/formatCOP';
import {
  calcularIngresos,
  calcularMargen,
  alertaSalud,
} from '../../utils/calcularInsumos';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ExportButton from '../../components/ExportButton';
import { CONFIG } from '../../data/config';
import { COSTOS_PRODUCTOS } from '../../data/costosConfig';
import ReporteEstrategias from './ReporteEstrategias';
import InversionesPanel from './InversionesPanel';
import FinancialAlerts from '../../components/FinancialAlerts';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function getIngresosReserva(r) {
  if (r.es_historico) return r.ingreso_total || 0;
  return calcularIngresos(r).total;
}

function getMonthKey(reserva) {
  const d = reserva.fecha_inicio || reserva.fecha;
  if (!d) return 'sin-fecha';
  return d.substring(0, 7); // "YYYY-MM"
}

function getMonthLabel(key) {
  if (key === 'acumulado') return 'Acumulado';
  if (key === 'sin-fecha') return 'Sin fecha';
  const [y, m] = key.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function getEgresosForReserva(egresos, reservaId) {
  if (!egresos || !Array.isArray(egresos)) return 0;
  return egresos
    .filter((e) => e.reserva_id === reservaId)
    .reduce((sum, e) => sum + (e.valor_cop || 0), 0);
}

function getEgresosByTipo(egresos, filteredIds) {
  const result = { operativo: 0, extraordinario: 0 };
  if (!egresos || !Array.isArray(egresos)) return result;
  egresos
    .filter((e) => !filteredIds || filteredIds.includes(e.reserva_id))
    .forEach((e) => {
      const tipo = (e.tipo || 'operativo').toLowerCase();
      if (tipo === 'extraordinario') {
        result.extraordinario += (e.valor_cop || 0);
      } else {
        result.operativo += (e.valor_cop || 0);
      }
    });
  return result;
}

/** Get all individual egresos filtered by tipo and reserva IDs */
function getEgresosDetalleByTipo(egresos, filteredIds, tipo) {
  if (!egresos || !Array.isArray(egresos)) return [];
  return egresos.filter((e) => {
    const eType = (e.tipo || 'operativo').toLowerCase();
    const matchesTipo = eType === tipo;
    const matchesIds = !filteredIds || filteredIds.includes(e.reserva_id);
    return matchesTipo && matchesIds;
  });
}

const saludVariant = (nivel) => {
  if (nivel === 'ok') return 'earth';
  if (nivel === 'warn') return 'bark';
  return 'danger';
};

const saludBadgeVariant = (nivel) => {
  if (nivel === 'ok') return 'ok';
  if (nivel === 'warn') return 'warn';
  return 'danger';
};

/* ─────────────────────────────────────────────
   Period filter logic
   ───────────────────────────────────────────── */

const PERIOD_TABS = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'año', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
];

const PERIODO_REPORTE_TABS = [
  { key: 'todo',     label: 'Todo' },
  { key: 'mes',      label: 'Por mes' },
  { key: '3meses',   label: 'Últimos 3 meses' },
  { key: 'semestre', label: 'Semestre' },
  { key: 'año',      label: 'Año completo' },
];

function filterReservasByPeriod(reservas, periodo) {
  if (!reservas || !reservas.length) return [];
  if (periodo === 'todo') return reservas;
  const now = new Date();
  return reservas.filter((r) => {
    const fechaStr = r.fecha_inicio || r.fecha;
    if (!fechaStr) return periodo === 'todo';
    const d = new Date(fechaStr + 'T12:00:00');
    if (isNaN(d.getTime())) return false;
    if (periodo === 'semana') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (periodo === 'mes') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (periodo === 'año') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function egresoEnPeriodo(e, periodo) {
  if (periodo === 'todo') return true;
  const now = new Date();
  const fechaStr = e.fecha || '';
  if (!fechaStr) return false;
  const d = new Date(fechaStr + 'T12:00:00');
  if (isNaN(d.getTime())) return false;
  if (periodo === 'semana') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  if (periodo === 'mes') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (periodo === 'año') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

function filterEgresosByPeriod(egresos, periodo) {
  if (!egresos || !Array.isArray(egresos)) return [];
  return egresos.filter((e) => egresoEnPeriodo(e, periodo));
}

/* ─────────────────────────────────────────────
   Chart theme colors
   ───────────────────────────────────────────── */

const CHART_COLORS = {
  experiencias: '#22c55e',
  alimentacion: '#f59e0b',
  alojamiento: '#0ea5e9',
  guia: '#a855f7',
};

const PIE_COLORS = ['#0ea5e9', '#f59e0b'];

/* ─────────────────────────────────────────────
   PeriodoTabs — replaces FiltroMes
   ───────────────────────────────────────────── */

function PeriodoTabs({ periodo, onChange }) {
  return (
    <div className="flex flex-wrap bg-gray-800/70 border border-gray-700/50 rounded-xl p-1 gap-0.5">
      {PERIOD_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200
            ${periodo === tab.key
              ? 'bg-gray-900 text-white shadow-md'
              : 'bg-transparent text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-700/40'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Custom Tooltip for BarChart
   ───────────────────────────────────────────── */

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-gray-700/60 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-gray-300 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400 capitalize">{entry.dataKey}</span>
          </div>
          <span className="font-medium text-gray-200 tabular-nums">
            {formatCOP(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Custom Tooltip for PieChart
   ───────────────────────────────────────────── */

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-gray-900/95 border border-gray-700/60 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-medium text-gray-200">{d.name}</p>
      <p className="text-sm text-gray-400 tabular-nums">{formatCOP(d.value)}</p>
      <p className="text-xs text-gray-500">{(d.payload.pct).toFixed(1)}%</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DetalleReservas  — Table
   ───────────────────────────────────────────── */

function DetalleReservas({ reservas, egresos }) {
  if (!reservas?.length) return null;

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/40 text-gray-300 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Reserva</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 font-semibold">Personas</th>
                <th className="text-right px-4 py-3 font-semibold">Ingresos</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Egresos</th>
                <th className="text-right px-4 py-3 font-semibold">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {reservas.map((r) => {
                const ingTotal = getIngresosReserva(r);
                const egTotal = getEgresosForReserva(egresos, r.reserva_id);
                const margen = calcularMargen(ingTotal, egTotal);
                const salud = alertaSalud(margen);

                return (
                  <tr
                    key={r.reserva_id}
                    className="hover:bg-gray-700/20 transition-colors duration-150 cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-medium text-gray-200 group-hover:text-emerald-400 transition-colors">
                      <div className="flex items-center gap-2">
                        {r.reserva_id}
                        {r.es_historico && (
                          <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">CSV</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      {r.fecha_inicio || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {r.total_personas}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-400 font-medium">
                      {formatCOP(ingTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400 font-medium hidden sm:table-cell">
                      {formatCOP(egTotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={saludBadgeVariant(salud.nivel)}>
                        {(margen * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GraficoIngresos — receives filtered data
   ───────────────────────────────────────────── */

function GraficoIngresos({ reservas }) {
  const { data, promedio } = useMemo(() => {
    const chartData = reservas.map((r) => {
      const isHist = r.es_historico;
      if (isHist) {
        return {
          name: r.reserva_id.length > 12 ? r.reserva_id.substring(0, 12) + '…' : r.reserva_id,
          total: r.ingreso_total || 0,
          experiencias: 0,
          alimentacion: 0,
          alojamiento: 0,
          guia: 0,
          historico: r.ingreso_total || 0,
          es_historico: true,
        };
      }
      const ing = calcularIngresos(r);
      return {
        name: r.reserva_id.length > 12 ? r.reserva_id.substring(0, 12) + '…' : r.reserva_id,
        total: ing.total,
        experiencias: ing.experiencias || 0,
        alimentacion: ing.alimentacion || 0,
        alojamiento: ing.alojamiento || 0,
        guia: ing.guia || 0,
        historico: 0,
        es_historico: false,
      };
    });

    const avg = chartData.length > 0
      ? chartData.reduce((sum, d) => sum + (d.total || d.historico || 0), 0) / chartData.length
      : 0;

    return { data: chartData, promedio: avg };
  }, [reservas]);

  const hasHistorico = data.some((d) => d.es_historico);

  if (!data.length) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 animate-slide-up"
         style={{ animationDelay: '0.2s' }}>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Composición de ingresos
      </h3>

      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
              interval={0}
              angle={data.length > 6 ? -35 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 60 : 30}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={32}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '12px' }}
              formatter={(value) => (
                <span className="text-xs text-gray-400 capitalize">{value}</span>
              )}
            />
            {/* Reference line — average */}
            <ReferenceLine
              y={promedio}
              stroke="#6ee7b7"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Promedio: ${formatCOP(promedio, { short: true })}`,
                position: 'insideTopRight',
                fill: '#6ee7b7',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            {/* Standard reserva bars */}
            <Bar dataKey="experiencias" stackId="a" fill={CHART_COLORS.experiencias} radius={[0, 0, 0, 0]} />
            <Bar dataKey="alimentacion" stackId="a" fill={CHART_COLORS.alimentacion} />
            <Bar dataKey="alojamiento" stackId="a" fill={CHART_COLORS.alojamiento} />
            <Bar dataKey="guia" stackId="a" fill={CHART_COLORS.guia} radius={[6, 6, 0, 0]} />
            {/* Historical reserva bar — different color */}
            {hasHistorico && (
              <Bar
                dataKey="historico"
                stackId="b"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
                name="histórico (CSV)"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PanelDetalleEgresos (slide-in)
   ───────────────────────────────────────────── */

function PanelDetalleEgresos({ tipo, egresos, filteredIds, onClose }) {
  const items = useMemo(
    () => getEgresosDetalleByTipo(egresos, filteredIds, tipo),
    [egresos, filteredIds, tipo],
  );

  const total = items.reduce((sum, e) => sum + (e.valor_cop || 0), 0);

  const isOperativo = tipo === 'operativo';
  const titulo = isOperativo ? 'Costos operativos' : 'Costos extraordinarios';
  const definicion = isOperativo
    ? 'Son los gastos que se repiten cada fin de semana para operar: ingredientes de cocina, bebidas para los visitantes e insumos básicos. Son predecibles y necesarios.'
    : 'Gastos especiales no recurrentes: eventos de cumpleaños, decoraciones, actividades especiales. No deberían calcularse en el benchmark de costos estándar.';

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-gray-900/98 border-l border-gray-700/60
                 shadow-2xl z-50 flex flex-col animate-slide-in-right backdrop-blur-xl"
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-700/40">
        <div>
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${isOperativo ? 'bg-sky-500' : 'bg-amber-500'}`}
            />
            {titulo}
          </h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-sm">{definicion}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No hay egresos {isOperativo ? 'operativos' : 'extraordinarios'} en este período.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((e) => (
              <div
                key={e.egreso_id}
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700/40
                           rounded-xl px-4 py-3 hover:bg-gray-800/80 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-200 truncate">{e.item}</p>
                  <p className="text-xs text-gray-500 truncate">{e.proveedor || 'Sin proveedor'}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-200 tabular-nums">
                    {formatCOP(e.valor_cop)}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      e.tiene_recibo ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    title={e.tiene_recibo ? 'Tiene recibo' : 'Sin recibo'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note for extraordinarios */}
        {!isOperativo && items.length > 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-300 leading-relaxed">
              <strong>Nota:</strong> Estos costos idealmente deben ser cobrados al cliente
              como adicional al plan base.
            </p>
          </div>
        )}
      </div>

      {/* Total footer */}
      <div className="border-t border-gray-700/40 p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 font-medium">Total del segmento</span>
          <span className={`text-2xl font-bold tabular-nums ${isOperativo ? 'text-sky-400' : 'text-amber-400'}`}>
            {formatCOP(total)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> con recibo
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> sin recibo
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GraficoEgresos (clickable PieChart)
   ───────────────────────────────────────────── */

function GraficoEgresos({ egresos, filteredIds }) {
  const [selectedTipo, setSelectedTipo] = useState(null);

  const byTipo = useMemo(() => getEgresosByTipo(egresos, filteredIds), [egresos, filteredIds]);
  const total = byTipo.operativo + byTipo.extraordinario;

  const data = useMemo(() => {
    if (total === 0) return [];
    return [
      { name: 'Operativo', value: byTipo.operativo, pct: (byTipo.operativo / total) * 100, tipo: 'operativo' },
      { name: 'Extraordinario', value: byTipo.extraordinario, pct: (byTipo.extraordinario / total) * 100, tipo: 'extraordinario' },
    ].filter((d) => d.value > 0);
  }, [byTipo, total]);

  const handlePieClick = (entry) => {
    if (entry && entry.tipo) {
      setSelectedTipo(entry.tipo);
    }
  };

  if (!data.length) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          Distribución de egresos
        </h3>
        <div className="h-60 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Sin datos de egresos</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 animate-slide-up"
           style={{ animationDelay: '0.25s' }}>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          Distribución de egresos
        </h3>
        <p className="text-xs text-gray-500 mb-4">Haz clic en un segmento para ver el detalle</p>

        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                label={({ pct }) => `${pct.toFixed(0)}%`}
                labelLine={false}
                onClick={(_, idx) => handlePieClick(data[idx])}
                cursor="pointer"
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
                <Label
                  value={formatCOP(total)}
                  position="center"
                  fill="#e5e7eb"
                  style={{ fontSize: '16px', fontWeight: 'bold' }}
                />
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slide-in panel */}
      {selectedTipo && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedTipo(null)}
          />
          <PanelDetalleEgresos
            tipo={selectedTipo}
            egresos={egresos}
            filteredIds={filteredIds}
            onClose={() => setSelectedTipo(null)}
          />
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   BenchmarkCard (with info + semáforo)
   ───────────────────────────────────────────── */

function BenchmarkCard({ actualPct, egresosOperativosPct }) {
  const [showInfo, setShowInfo] = useState(false);
  const benchmark = (CONFIG.benchmarks.costo_operativo_std * 100); // 6.4
  const exceeds = egresosOperativosPct > benchmark;
  const maxScale = benchmark * 3;
  const ratio = Math.min((egresosOperativosPct / maxScale) * 100, 100);
  const benchmarkPos = Math.min((benchmark / maxScale) * 100, 100);

  // Traffic light ranges for the semáforo
  const semaforoRanges = [
    {
      label: 'Excelente',
      range: '0% – 8%',
      desc: 'Costos bajo control',
      color: 'emerald',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      icon: CheckCircle,
      isActive: egresosOperativosPct <= 8,
    },
    {
      label: 'Moderado',
      range: '8% – 15%',
      desc: 'Revisar qué está subiendo',
      color: 'amber',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      icon: AlertCircle,
      isActive: egresosOperativosPct > 8 && egresosOperativosPct <= 15,
    },
    {
      label: 'Atención',
      range: '>15%',
      desc: 'Costos afectando rentabilidad',
      color: 'red',
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'text-red-400',
      icon: AlertTriangle,
      isActive: egresosOperativosPct > 15,
    },
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 animate-slide-up"
         style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4" />
          Benchmark operativo
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-500 hover:text-emerald-400 transition-all duration-200"
            title="¿Qué es el benchmark operativo?"
          >
            <Info className="w-4 h-4" />
          </button>
        </h3>
        <Badge variant={exceeds ? 'danger' : 'ok'}>
          {exceeds ? 'Por encima' : 'Dentro del objetivo'}
        </Badge>
      </div>

      {/* Expandable info panel */}
      {showInfo && (
        <div className="mb-5 bg-gray-700/30 border border-gray-600/40 rounded-xl p-4 space-y-4 animate-slide-up">
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2">¿Qué es el benchmark operativo?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Es el porcentaje ideal de costos vs ingresos.
              Earth Park tiene un benchmark saludable de 6.4%, lo que
              significa que por cada $100.000 que ingresas, solo $6.400
              deberían irse en compras operativas estándar.
            </p>
          </div>

          {/* Semáforo */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Semáforo de salud</p>
            {semaforoRanges.map((rng) => {
              const Icon = rng.icon;
              return (
                <div
                  key={rng.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all duration-200
                    ${rng.isActive
                      ? `${rng.bg} ${rng.border} ring-1 ring-${rng.color}-500/30`
                      : 'bg-gray-800/40 border-gray-700/30'
                    }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${rng.isActive ? rng.text : 'text-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${rng.isActive ? rng.text : 'text-gray-500'}`}>
                        {rng.label}
                      </span>
                      <span className={`text-xs ${rng.isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                        ({rng.range})
                      </span>
                    </div>
                    <p className={`text-xs ${rng.isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                      {rng.desc}
                    </p>
                  </div>
                  {rng.isActive && (
                    <div className={`text-xs font-bold tabular-nums ${rng.text}`}>
                      Tu valor: {egresosOperativosPct.toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress bars */}
      <div className="space-y-4">
        {/* Standard */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Estándar</span>
            <span className="text-sm font-bold text-sky-400 tabular-nums">{benchmark.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${benchmarkPos}%` }}
            />
          </div>
        </div>

        {/* Actual — now uses operational-only percentage */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Actual (solo operativos)</span>
            <span className={`text-sm font-bold tabular-nums ${exceeds ? 'text-red-400' : 'text-emerald-400'}`}>
              {egresosOperativosPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${exceeds ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Delta */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        {exceeds ? (
          <>
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">
              +{(egresosOperativosPct - benchmark).toFixed(1)} puntos sobre benchmark
            </span>
          </>
        ) : (
          <>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-medium">
              {(benchmark - egresosOperativosPct).toFixed(1)} puntos bajo benchmark
            </span>
          </>
        )}
      </div>

      {exceeds && (
        <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            Los egresos operativos superan el benchmark establecido. Revisa los costos por reserva.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RentabilidadProductos
   ───────────────────────────────────────────── */

function RentabilidadProductos({ reservas }) {
  const rentabilidad = useMemo(() => {
    // Count total units sold per product name (from all reservas' productos)
    const ventasPorProducto = {};
    reservas.forEach((r) => {
      if (!r.productos || !Array.isArray(r.productos)) return;
      r.productos.forEach((p) => {
        const nombre = (p.nombre || '').trim().toUpperCase();
        if (!nombre || nombre === '(SIN NOMBRE)') return;
        if (!ventasPorProducto[nombre]) {
          ventasPorProducto[nombre] = { unidades: 0, ingresoTotal: 0 };
        }
        ventasPorProducto[nombre].unidades += (p.unidades || 1);
        ventasPorProducto[nombre].ingresoTotal += (p.subtotal || 0);
      });
    });

    // Cross with COSTOS_PRODUCTOS
    const rows = [];
    Object.entries(COSTOS_PRODUCTOS).forEach(([categoria, productos]) => {
      Object.entries(productos).forEach(([, prod]) => {
        const nombreUp = prod.nombre.toUpperCase();
        // Try exact match first, then partial
        let ventaData = ventasPorProducto[nombreUp];
        if (!ventaData) {
          // Fuzzy: check if product name is contained in any sold product name
          for (const [soldName, data] of Object.entries(ventasPorProducto)) {
            if (soldName.includes(nombreUp) || nombreUp.includes(soldName)) {
              ventaData = data;
              break;
            }
          }
        }

        const unidadesVendidas = ventaData ? ventaData.unidades : 0;
        const gananciaUnit = prod.venta - prod.costo;
        const gananciaTotal = gananciaUnit * unidadesVendidas;

        rows.push({
          nombre: prod.nombre,
          categoria,
          venta: prod.venta,
          costo: prod.costo,
          margen: prod.margen,
          unidadesVendidas,
          gananciaTotal,
        });
      });
    });

    // Sort by gananciaTotal descending
    rows.sort((a, b) => b.gananciaTotal - a.gananciaTotal);

    return rows;
  }, [reservas]);

  // Top 3 products with sales
  const topProducts = rentabilidad.filter(r => r.unidadesVendidas > 0).slice(0, 3);
  const topNames = new Set(topProducts.map(r => r.nombre));

  // Category display names
  const catLabels = {
    GASTRONOMIA: 'Gastronomía',
    AGENCIA_TURISMO: 'Agencia Turismo',
    ENTRADAS: 'Entradas',
    ARTESANIA: 'Artesanía',
    HOTELERIA: 'Hotelería',
  };

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/40 text-gray-300 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-semibold">Precio venta</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Costo</th>
                <th className="text-right px-4 py-3 font-semibold">Margen %</th>
                <th className="text-right px-4 py-3 font-semibold">Ventas totales</th>
                <th className="text-right px-4 py-3 font-semibold">Ganancia total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {rentabilidad.map((r) => {
                const isTop = topNames.has(r.nombre);
                return (
                  <tr
                    key={`${r.categoria}-${r.nombre}`}
                    className={`hover:bg-gray-700/20 transition-colors duration-150 ${
                      r.unidadesVendidas === 0 ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-200">
                      <div className="flex items-center gap-2">
                        {r.nombre}
                        {isTop && (
                          <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      <span className="text-[10px] bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                        {catLabels[r.categoria] || r.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {formatCOP(r.venta)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-400 hidden sm:table-cell">
                      {formatCOP(r.costo)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={r.margen >= 0.50 ? 'ok' : r.margen >= 0.30 ? 'warn' : 'danger'}>
                        {(r.margen * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {r.unidadesVendidas}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                      r.gananciaTotal > 0 ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      {formatCOP(r.gananciaTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FinancieroPage  — Main
   ───────────────────────────────────────────── */

export default function FinancieroPage() {
  const { state } = useReservas();
  const { reservas, egresos } = state;

  const [periodo, setPeriodo] = useState('mes');
  const [periodoReporte, setPeriodoReporte] = useState('todo');
  const [mesReporte, setMesReporte] = useState('');
  const [openRentabilidad, setOpenRentabilidad] = useState(true);
  const [openDetalleReservas, setOpenDetalleReservas] = useState(true);
  const [openDetalleInversiones, setOpenDetalleInversiones] = useState(true);

  /* ── SINGLE useMemo: all filtered data ── */
  const datosFiltrados = useMemo(() => {
    const filteredReservas = filterReservasByPeriod(reservas, periodo);
    const filteredIds = filteredReservas.map((r) => r.reserva_id);
    const filteredIdSet = new Set(filteredIds);

    // Egresos linked to a reserva in the period travel with that reserva.
    // Unlinked egresos (SIN_ASIGNAR) are filtered by their own date.
    const filteredEgresos = (egresos || []).filter((e) => {
      if (periodo === 'todo') return true;
      const rid = e.reserva_id;
      if (rid && rid !== 'SIN_ASIGNAR') return filteredIdSet.has(rid);
      return egresoEnPeriodo(e, periodo);
    });

    // Aggregate totals
    let ingBrutos = 0;
    let egTotales = 0;

    filteredReservas.forEach((r) => {
      ingBrutos += getIngresosReserva(r);
    });

    egTotales = filteredEgresos.reduce((sum, e) => sum + (e.valor_cop || 0), 0);

    const utilidad = ingBrutos - egTotales;
    const margen = calcularMargen(ingBrutos, egTotales);
    const salud = alertaSalud(margen);

    // Benchmark: operational-only egresos %
    const byTipo = getEgresosByTipo(filteredEgresos, null);
    const egresosOperativosPct = ingBrutos > 0 ? (byTipo.operativo / ingBrutos) * 100 : 0;
    const actualOpPct = ingBrutos > 0 ? (egTotales / ingBrutos) * 100 : 0;

    return {
      reservas: filteredReservas,
      egresos: filteredEgresos,
      filteredIds,
      ingBrutos,
      egTotales,
      utilidad,
      margen,
      salud,
      egresosOperativosPct,
      actualOpPct,
      hayDatos: filteredReservas.length > 0 || filteredEgresos.length > 0,
    };
  }, [periodo, reservas, egresos]);

  const mesesDisponibles = useMemo(() => {
    const keys = new Set();
    datosFiltrados.reservas.forEach(r => {
      const key = (r.fecha_inicio || r.fecha || '').substring(0, 7);
      if (key.length >= 7) keys.add(key);
    });
    return Array.from(keys).sort();
  }, [datosFiltrados.reservas]);

  const reservasParaReporte = useMemo(() => {
    const base = datosFiltrados.reservas;
    if (periodoReporte === 'todo') return base;
    if (periodoReporte === 'mes') {
      if (!mesReporte) return base;
      return base.filter(r => (r.fecha_inicio || r.fecha || '').startsWith(mesReporte));
    }
    const now = new Date();
    const mesesAtras = periodoReporte === '3meses' ? 3 : periodoReporte === 'semestre' ? 6 : null;
    if (mesesAtras !== null) {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - mesesAtras);
      return base.filter(r => {
        const f = r.fecha_inicio || r.fecha || '';
        return f && new Date(f + 'T12:00:00') >= cutoff;
      });
    }
    if (periodoReporte === 'año') {
      return base.filter(r => {
        const f = r.fecha_inicio || r.fecha || '';
        return f && new Date(f + 'T12:00:00').getFullYear() === now.getFullYear();
      });
    }
    return base;
  }, [datosFiltrados.reservas, periodoReporte, mesReporte]);

  const egresosParaReporte = useMemo(() => {
    const base = datosFiltrados.egresos;
    if (periodoReporte === 'todo') return base;
    if (periodoReporte === 'mes') {
      if (!mesReporte) return base;
      return base.filter(e => (e.fecha || '').startsWith(mesReporte));
    }
    const now = new Date();
    const mesesAtras = periodoReporte === '3meses' ? 3 : periodoReporte === 'semestre' ? 6 : null;
    if (mesesAtras !== null) {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - mesesAtras);
      return base.filter(e => {
        const f = e.fecha || '';
        return f && new Date(f + 'T12:00:00') >= cutoff;
      });
    }
    if (periodoReporte === 'año') {
      return base.filter(e => {
        const f = e.fecha || '';
        return f && new Date(f + 'T12:00:00').getFullYear() === now.getFullYear();
      });
    }
    return base;
  }, [datosFiltrados.egresos, periodoReporte, mesReporte]);

  /* ── Empty state (no reservas at all) ── */
  if (!reservas || reservas.length === 0) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in">
        <PageHeader title="Financiero" subtitle="Panel de control financiero" />
        <EmptyState
          icon={DollarSign}
          title="Sin datos financieros"
          message="Crea reservas para visualizar el rendimiento financiero."
        />
      </div>
    );
  }

  const periodoLabel = PERIOD_TABS.find((t) => t.key === periodo)?.label || periodo;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Financiero"
        subtitle={`Panel de control — ${periodoLabel}`}
        action={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <PeriodoTabs periodo={periodo} onChange={setPeriodo} />
            <ExportButton />
          </div>
        }
      />

      {/* Empty period state */}
      {!datosFiltrados.hayDatos ? (
        <EmptyState
          icon={Calendar}
          title="Sin datos para este período"
          message={`No hay reservas ni egresos para "${periodoLabel}". Prueba seleccionando 'Todo'.`}
        />
      ) : (
        <>
          {/* Metric cards */}
          <section className="animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Ingresos Brutos"
                value={formatCOP(datosFiltrados.ingBrutos)}
                sub={`${datosFiltrados.reservas.length} reserva${datosFiltrados.reservas.length !== 1 ? 's' : ''}`}
                icon={DollarSign}
                colorVariant="earth"
              />
              <MetricCard
                label="Egresos Totales"
                value={formatCOP(datosFiltrados.egTotales)}
                sub="costos operativos"
                icon={ArrowDownCircle}
                colorVariant="danger"
              />
              <MetricCard
                label="Utilidad Bruta"
                value={formatCOP(datosFiltrados.utilidad)}
                sub={datosFiltrados.utilidad >= 0 ? 'resultado positivo' : 'resultado negativo'}
                icon={TrendingUp}
                colorVariant="bark"
              />
              <MetricCard
                label="Margen Bruto"
                value={`${(datosFiltrados.margen * 100).toFixed(1)}%`}
                sub={datosFiltrados.salud.mensaje}
                icon={Percent}
                colorVariant={saludVariant(datosFiltrados.salud.nivel)}
              />
            </div>
          </section>

          {/* 1. Alertas financieras */}
          <FinancialAlerts />

          {/* 2. Benchmark */}
          <BenchmarkCard actualPct={datosFiltrados.actualOpPct} egresosOperativosPct={datosFiltrados.egresosOperativosPct} />

          {/* 3. Reporte de estrategias con filtro de período */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {PERIODO_REPORTE_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setPeriodoReporte(tab.key); if (tab.key !== 'mes') setMesReporte(''); }}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    periodoReporte === tab.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {periodoReporte === 'mes' && (
                <select
                  value={mesReporte}
                  onChange={e => setMesReporte(e.target.value)}
                  className="bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">Selecciona un mes</option>
                  {mesesDisponibles.map(key => (
                    <option key={key} value={key}>{getMonthLabel(key)}</option>
                  ))}
                </select>
              )}
            </div>
            <ReporteEstrategias
              reservasFiltradas={reservasParaReporte}
              egresosFiltrados={egresosParaReporte}
            />
          </div>

          {/* 4. Inversiones Earth Park */}
          <InversionesPanel />

          {/* 5. Rentabilidad por producto — colapsable */}
          <section className="animate-slide-up">
            <button
              onClick={() => setOpenRentabilidad(o => !o)}
              className="w-full flex items-center justify-between cursor-pointer mb-4"
            >
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Rentabilidad por producto
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${!openRentabilidad ? 'rotate-180' : ''}`} />
            </button>
            {openRentabilidad && <RentabilidadProductos reservas={datosFiltrados.reservas} />}
          </section>

          {/* 6. Detalle por reserva — colapsable */}
          <section className="animate-slide-up">
            <button
              onClick={() => setOpenDetalleReservas(o => !o)}
              className="w-full flex items-center justify-between cursor-pointer mb-4"
            >
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileBarChart className="w-4 h-4" />
                Detalle por reserva
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${!openDetalleReservas ? 'rotate-180' : ''}`} />
            </button>
            {openDetalleReservas && <DetalleReservas reservas={datosFiltrados.reservas} egresos={datosFiltrados.egresos} />}
          </section>

          {/* 7. Detalle de inversiones — colapsable (gráficos) */}
          <section className="animate-slide-up">
            <button
              onClick={() => setOpenDetalleInversiones(o => !o)}
              className="w-full flex items-center justify-between cursor-pointer mb-4"
            >
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Detalle de inversiones
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${!openDetalleInversiones ? 'rotate-180' : ''}`} />
            </button>
            {openDetalleInversiones && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoIngresos reservas={datosFiltrados.reservas} />
                <GraficoEgresos egresos={datosFiltrados.egresos} filteredIds={null} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
