import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Info, CheckCircle } from 'lucide-react';
import { DATOS_HISTORICOS } from '../data/datosHistoricos';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getMonthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1] ?? '?'} ${y}`;
}

function agruparPorMes(reservas, egresos) {
  const map = {};

  reservas.forEach(r => {
    const key = (r.fecha_inicio || r.fecha || '').substring(0, 7);
    if (key.length < 7) return;
    if (!map[key]) map[key] = { ingresos: 0, egresos: 0, insumos: 0 };
    map[key].ingresos += r.ingreso_total || 0;
  });

  egresos.forEach(e => {
    const key = (e.fecha || '').substring(0, 7);
    if (key.length < 7) return;
    if (!map[key]) map[key] = { ingresos: 0, egresos: 0, insumos: 0 };
    map[key].egresos += e.valor_cop || 0;
    const cat = (e.categoria || '').toLowerCase();
    if (cat.includes('gastronomia') || cat.includes('artesania')) {
      map[key].insumos += e.valor_cop || 0;
    }
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}

const SEVERITY = {
  danger:  { border: 'border-red-500/40',     bg: 'bg-red-500/10',     icon: 'text-red-400',     badge: 'bg-red-500/20 text-red-300',     label: 'Crítico'  },
  warning: { border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   icon: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-300', label: 'Atención' },
  info:    { border: 'border-sky-500/40',     bg: 'bg-sky-500/10',     icon: 'text-sky-400',     badge: 'bg-sky-500/20 text-sky-300',     label: 'Info'     },
  ok:      { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300', label: 'OK'   },
};

function AlertCard({ icon: Icon, title, description, label, severity }) {
  const s = SEVERITY[severity] ?? SEVERITY.info;
  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 flex-shrink-0 ${s.icon}`} />
          <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>
          {s.label}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      {label && (
        <div className={`text-sm font-bold tabular-nums ${s.icon}`}>{label}</div>
      )}
    </div>
  );
}

export default function FinancialAlerts() {
  const { reservas, egresos } = DATOS_HISTORICOS;

  const alerts = useMemo(() => {
    const meses = agruparPorMes(reservas, egresos);
    const results = [];

    // 1. Concentración de ingresos por línea de negocio
    const lineasMap = {};
    let totalIngresosLineas = 0;
    reservas.forEach(r => {
      (r.productos || []).forEach(p => {
        const linea = p.linea_negocio || 'SIN_LINEA';
        lineasMap[linea] = (lineasMap[linea] || 0) + (p.subtotal || 0);
        totalIngresosLineas += p.subtotal || 0;
      });
    });

    if (totalIngresosLineas > 0 && Object.keys(lineasMap).length > 0) {
      const [topLinea, topVal] = Object.entries(lineasMap).sort(([, a], [, b]) => b - a)[0];
      const pct = (topVal / totalIngresosLineas) * 100;
      results.push({
        icon: AlertTriangle,
        title: 'Concentración de ingresos',
        description: `La línea "${topLinea}" concentra la mayor parte de los ingresos históricos. Alta dependencia de una sola fuente aumenta el riesgo operativo.`,
        label: `${pct.toFixed(1)}% — ${topLinea}`,
        severity: pct >= 45 ? 'danger' : 'warning',
      });
    }

    // 2. Caída mensual pronunciada
    if (meses.length >= 2) {
      let maxCaida = 0;
      let maxCaidaMes = null;

      for (let i = 1; i < meses.length; i++) {
        const prev = meses[i - 1].ingresos;
        const curr = meses[i].ingresos;
        if (prev > 0 && curr < prev) {
          const caida = ((prev - curr) / prev) * 100;
          if (caida > maxCaida) {
            maxCaida = caida;
            maxCaidaMes = meses[i].month;
          }
        }
      }

      if (maxCaida > 10 && maxCaidaMes) {
        results.push({
          icon: TrendingDown,
          title: 'Caída mensual pronunciada',
          description: `Se detectó la caída mensual más grande en ${getMonthLabel(maxCaidaMes)}. Evalúa si fue estacional o requiere acción correctiva.`,
          label: `−${maxCaida.toFixed(1)}% en ${getMonthLabel(maxCaidaMes)}`,
          severity: 'warning',
        });
      }
    }

    // 3. Presión en insumos (gastronomía + artesanía vs total egresos)
    if (meses.length >= 2) {
      const first = meses[0];
      const last = meses[meses.length - 1];
      const ratioFirst = first.egresos > 0 ? (first.insumos / first.egresos) * 100 : 0;
      const ratioLast  = last.egresos  > 0 ? (last.insumos  / last.egresos)  * 100 : 0;
      const delta = ratioLast - ratioFirst;

      results.push({
        icon: delta > 2 ? AlertTriangle : Info,
        title: 'Presión en insumos',
        description: `Proporción de egresos en insumos (gastronomía + artesanía) entre ${getMonthLabel(first.month)} y ${getMonthLabel(last.month)}. ${delta > 2 ? 'Ha aumentado significativamente.' : 'Se mantiene estable.'}`,
        label: `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pp respecto al primer mes`,
        severity: delta > 2 ? 'warning' : 'info',
      });
    }

    // 4. Eficiencia operacional (último mes)
    if (meses.length >= 1) {
      const last = meses[meses.length - 1];
      const ratio = last.ingresos > 0 ? last.egresos / last.ingresos : 0;
      const isOk = ratio < 0.83;

      results.push({
        icon: isOk ? CheckCircle : AlertTriangle,
        title: 'Eficiencia operacional',
        description: `Ratio egresos/ingresos del último mes (${getMonthLabel(last.month)}). ${isOk ? 'Los costos están dentro del rango saludable (< 83%).' : 'Los egresos superan el umbral recomendado del 83%.'}`,
        label: `${(ratio * 100).toFixed(1)}% egresos / ingresos`,
        severity: isOk ? 'ok' : 'info',
      });
    }

    // 5. Crecimiento de nómina
    const NOMINA_KW = ['nomina', 'nómina', 'salario', 'personal', 'empleado', 'sueldo'];
    const esNomina = (e) => {
      const campos = [e.categoria, e.item, e.proveedor, e.notas].map(f => (f || '').toLowerCase());
      return campos.some(f => NOMINA_KW.some(kw => f.includes(kw)));
    };
    const nominaPorMes = {};
    egresos.forEach(e => {
      if (!esNomina(e)) return;
      const key = (e.fecha || '').substring(0, 7);
      if (key.length < 7) return;
      nominaPorMes[key] = (nominaPorMes[key] || 0) + (e.valor_cop || 0);
    });
    const nominaMeses = Object.entries(nominaPorMes).sort(([a], [b]) => a.localeCompare(b));
    if (nominaMeses.length === 0) {
      results.push({
        icon: Info,
        title: 'Crecimiento de nómina',
        description: 'No se encontraron registros de nómina o personal en los egresos históricos.',
        label: 'Sin datos de nómina',
        severity: 'info',
      });
    } else if (nominaMeses.length >= 2) {
      const [primerKey, primerVal] = nominaMeses[0];
      const [ultimoKey, ultimoVal] = nominaMeses[nominaMeses.length - 1];
      const crecimiento = primerVal > 0 ? ((ultimoVal - primerVal) / primerVal) * 100 : 0;
      results.push({
        icon: Info,
        title: 'Crecimiento de nómina',
        description: `Comparando ${getMonthLabel(primerKey)} con ${getMonthLabel(ultimoKey)}. ${crecimiento > 15 ? 'El gasto en personal ha crecido significativamente.' : 'El gasto en personal se mantiene estable.'}`,
        label: `${crecimiento > 0 ? '+' : ''}${crecimiento.toFixed(1)}%`,
        severity: crecimiento > 15 ? 'warning' : 'info',
      });
    }

    // 6. Recuperación sostenida
    if (meses.length >= 3) {
      const [m1, m2, m3] = meses.slice(-3);
      const isSostenida = m2.ingresos > m1.ingresos && m3.ingresos > m2.ingresos;
      const label3 = [m1, m2, m3]
        .map(m => MONTH_NAMES[parseInt(m.month.split('-')[1], 10) - 1] ?? '?')
        .join(' → ') + (isSostenida ? ' ✓' : ' ✗');
      results.push({
        icon: isSostenida ? TrendingUp : TrendingDown,
        title: isSostenida ? 'Recuperación sostenida' : 'Sin tendencia sostenida',
        description: isSostenida
          ? 'Los últimos 3 meses muestran crecimiento consecutivo'
          : 'Los ingresos no muestran crecimiento en los últimos 3 meses',
        label: label3,
        severity: isSostenida ? 'ok' : 'warning',
      });
    }

    return results;
  }, [reservas, egresos]);

  if (!alerts.length) return null;

  return (
    <section className="animate-slide-up">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alertas financieras
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {alerts.map((alert, i) => (
          <AlertCard key={i} {...alert} />
        ))}
      </div>
    </section>
  );
}
