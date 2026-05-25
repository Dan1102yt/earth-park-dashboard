import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, ArrowRight, FileText,
  TrendingUp, AlertTriangle, Clock,
} from 'lucide-react';
import { calcularIngresos } from '../../utils/calcularInsumos';
import { formatCOP } from '../../utils/formatCOP';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function getIngresosReserva(r) {
  if (r.es_historico) return r.ingreso_total || 0;
  return calcularIngresos(r).total;
}

function getEgresosForReserva(egresos, reservaId) {
  if (!egresos || !Array.isArray(egresos)) return 0;
  return egresos
    .filter((e) => e.reserva_id === reservaId)
    .reduce((sum, e) => sum + (e.valor_cop || 0), 0);
}

function getEgresosOperativos(egresos, reservaIds) {
  if (!egresos || !Array.isArray(egresos)) return 0;
  return egresos
    .filter((e) => reservaIds.includes(e.reserva_id) && (e.tipo || 'operativo').toLowerCase() === 'operativo')
    .reduce((sum, e) => sum + (e.valor_cop || 0), 0);
}

/* ─────────────────────────────────────────────
   Strategy generation
   ───────────────────────────────────────────── */

function generarEstrategias({ margenPct, costoPerPersona, clienteTop, lineaTop, totalReservas }) {
  const m = (margenPct * 100).toFixed(1);

  if (margenPct >= 0.90) {
    return {
      titulo: 'Negocio muy saludable',
      color: 'emerald',
      estrategias: [
        `Tu margen bruto de ${m}% está por encima del promedio del sector de turismo rural en Colombia (65–75%). Esto te da espacio para reinvertir.`,
        clienteTop
          ? `El cliente ${clienteTop.nombre} generó ${formatCOP(clienteTop.monto)} en una sola visita. Considera crear un paquete corporativo o universitario similar con precio especial por volumen.`
          : null,
        lineaTop
          ? `La línea ${lineaTop.nombre} es tu mayor fuente de ingresos. ¿Puedes crear un combo o experiencia premium en esta categoría?`
          : null,
        `Con ${totalReservas} reservas históricas, ya tienes una base de datos valiosa. Considera un programa de referidos: descuento a clientes que traigan nuevos grupos.`,
      ].filter(Boolean),
    };
  }

  if (margenPct >= 0.70) {
    return {
      titulo: 'Margen moderado — hay oportunidad',
      color: 'amber',
      estrategias: [
        `Tu margen de ${m}% tiene espacio para crecer. Revisa si los costos extraordinarios (eventos especiales) están siendo cobrados al cliente como adicional.`,
        `El desayuno cuesta ~$7.390/persona pero se cobra dentro del plan. Considera listarlo como ítem visible en la cotización para que el cliente vea el valor.`,
        costoPerPersona > 0
          ? `Tu costo operativo por persona es de ${formatCOP(costoPerPersona)}. Busca optimizar proveedores o comprar en volumen para reducir este costo.`
          : null,
        clienteTop
          ? `El cliente ${clienteTop.nombre} fue tu mejor ingreso (${formatCOP(clienteTop.monto)}). Invítalo a volver con un descuento del 10% como programa de fidelización.`
          : null,
      ].filter(Boolean),
    };
  }

  return {
    titulo: 'Atención — margen bajo',
    color: 'red',
    estrategias: [
      `Tu margen de ${m}% es crítico. Es urgente revisar la estructura de costos y evaluar si los precios actuales son sostenibles.`,
      `Revisa todos los gastos extraordinarios: si hay eventos especiales (cumpleaños, decoraciones), estos deben cobrarse al cliente como adicional obligatorio.`,
      costoPerPersona > 0
        ? `El costo operativo por persona es ${formatCOP(costoPerPersona)}. Esto es alto. Negocia con proveedores, busca alternativas más económicas, o reduce el menú.`
        : null,
      `Considera aumentar el precio base de las experiencias en un 10-15%. El mercado de turismo rural en Colombia ha subido sus tarifas post-pandemia.`,
      lineaTop
        ? `Enfoca tu marketing en ${lineaTop.nombre}, tu línea más fuerte. Maximiza la conversión en esta categoría.`
        : null,
    ].filter(Boolean),
  };
}

/* ─────────────────────────────────────────────
   Component — now receives filtered data as props
   ───────────────────────────────────────────── */

export default function ReporteEstrategias({ reservasFiltradas, egresosFiltrados }) {
  const reservas = reservasFiltradas;
  const egresos = egresosFiltrados;

  const [expanded, setExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  /* Compute all KPIs — regenerates when filtered data changes */
  const reporte = useMemo(() => {
    if (!reservas || reservas.length === 0) return null;

    const reservaIds = reservas.map((r) => r.reserva_id);

    let ingresosTotal = 0;
    let egresosTotal = 0;
    let totalPersonas = 0;

    reservas.forEach((r) => {
      ingresosTotal += getIngresosReserva(r);
      egresosTotal += getEgresosForReserva(egresos, r.reserva_id);
      totalPersonas += r.total_personas || 0;
    });

    const margen = ingresosTotal > 0 ? (ingresosTotal - egresosTotal) / ingresosTotal : 0;
    const egresosOp = getEgresosOperativos(egresos, reservaIds);
    const costoPerPersona = totalPersonas > 0 ? egresosOp / totalPersonas : 0;

    // Top client
    let clienteTop = null;
    reservas.forEach((r) => {
      const ing = getIngresosReserva(r);
      if (!clienteTop || ing > clienteTop.monto) {
        clienteTop = { nombre: r.cliente, monto: ing };
      }
    });

    // Top business line
    let lineaTop = null;
    const lineaMap = {};
    reservas.forEach((r) => {
      if (r.lineas_negocio && Array.isArray(r.lineas_negocio)) {
        const ingReserva = getIngresosReserva(r);
        const share = r.lineas_negocio.length > 0 ? ingReserva / r.lineas_negocio.length : 0;
        r.lineas_negocio.forEach((ln) => {
          lineaMap[ln] = (lineaMap[ln] || 0) + share;
        });
      }
    });
    const lineaEntries = Object.entries(lineaMap);
    if (lineaEntries.length > 0) {
      lineaEntries.sort((a, b) => b[1] - a[1]);
      lineaTop = { nombre: lineaEntries[0][0], monto: lineaEntries[0][1] };
    }

    const estrategias = generarEstrategias({
      margenPct: margen,
      costoPerPersona,
      clienteTop,
      lineaTop,
      totalReservas: reservas.length,
    });

    return {
      ...estrategias,
      margen,
      ingresosTotal,
      egresosTotal,
    };
  }, [reservas, egresos]);

  /* Update timestamp on data change */
  useEffect(() => {
    if (reporte) {
      setLastUpdated(new Date());
    }
  }, [reporte]);

  if (!reporte) return null;

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300',
      icon: TrendingUp,
      cardBg: 'bg-emerald-500/5 border-emerald-500/20',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300',
      icon: AlertTriangle,
      cardBg: 'bg-amber-500/5 border-amber-500/20',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      badge: 'bg-red-500/20 text-red-300',
      icon: AlertTriangle,
      cardBg: 'bg-red-500/5 border-red-500/20',
    },
  };

  const theme = colorMap[reporte.color];
  const StatusIcon = theme.icon;

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden animate-slide-up`}
      style={{ animationDelay: '0.35s' }}
    >
      {/* Header — collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700/20 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${theme.bg}`}>
            <FileText className={`w-4 h-4 ${theme.text}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              Reporte de Estrategias
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${theme.badge}`}>
                {reporte.titulo}
              </span>
            </h3>
            {lastUpdated && (
              <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Actualizado: {lastUpdated.toLocaleString('es-CO', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-gray-400" />
          : <ChevronDown className="w-5 h-5 text-gray-400" />
        }
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Status banner */}
          <div className={`flex items-center gap-3 ${theme.bg} border ${theme.border} rounded-xl px-4 py-3`}>
            <StatusIcon className={`w-5 h-5 ${theme.text} flex-shrink-0`} />
            <div>
              <p className={`text-sm font-semibold ${theme.text}`}>{reporte.titulo}</p>
              <p className="text-xs text-gray-400">
                Margen bruto: {(reporte.margen * 100).toFixed(1)}% · 
                Ingresos: {formatCOP(reporte.ingresosTotal)} · 
                Egresos: {formatCOP(reporte.egresosTotal)}
              </p>
            </div>
          </div>

          {/* Strategy cards */}
          <div className="space-y-3">
            {reporte.estrategias.map((estrategia, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 transition-all duration-200 hover:bg-gray-700/20 ${theme.cardBg}`}
              >
                <ArrowRight className={`w-4 h-4 ${theme.text} flex-shrink-0 mt-0.5`} />
                <p className="text-sm text-gray-300 leading-relaxed">{estrategia}</p>
              </div>
            ))}
          </div>

          {/* Export button */}
          <div className="pt-2">
            <button
              onClick={() => {
                console.log('[ReporteEstrategias] Exportar PDF — implementación futura', {
                  titulo: reporte.titulo,
                  margen: reporte.margen,
                  estrategias: reporte.estrategias,
                  fecha: lastUpdated?.toISOString(),
                });
                alert('Exportación PDF próximamente. Ver console para datos del reporte.');
              }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200
                         bg-gray-700/40 hover:bg-gray-700/60 border border-gray-600/40
                         rounded-xl px-4 py-2.5 transition-all duration-200"
            >
              <FileText className="w-4 h-4" />
              Exportar reporte PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
