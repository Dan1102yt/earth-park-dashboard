import React, { useState, useMemo } from 'react';
import { FileText, Printer, DollarSign, ArrowDownCircle, TrendingUp, Percent, Users, CalendarDays } from 'lucide-react';

import { useReservas } from '../../context/ReservasContext';
import { formatCOP } from '../../utils/formatCOP';
import { calcularIngresos, calcularMargen } from '../../utils/calcularInsumos';
import PageHeader from '../../components/PageHeader';
import MetricCard from '../../components/MetricCard';

const LOGO_URL = `${import.meta.env.BASE_URL}images/logo.png`;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* InversionesPanel.jsx no exporta INVERSIONES (const local) — se duplica aquí. */
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

/* ─────────────────────────────────────────────
   Helpers de cálculo
   ───────────────────────────────────────────── */

function getMonthKey(fecha) {
  if (!fecha) return null;
  return fecha.substring(0, 7); // "YYYY-MM"
}

function diasEnMes(year, month) {
  return new Date(year, month, 0).getDate();
}

function getIngresoReserva(r) {
  if (r.es_historico) return r.ingreso_total || 0;
  return calcularIngresos(r).total;
}

function clasificarLinea(linea) {
  if (linea === 'HOTELERIA') return 'hospedaje';
  if (linea === 'GASTRONOMIA') return 'gastronomia';
  if (linea === 'ARTESANIA') return 'artesania';
  return 'otros';
}

function calcularIngresosPorLinea(reservas) {
  const totales = { hospedaje: 0, gastronomia: 0, artesania: 0, otros: 0 };
  reservas.forEach((r) => {
    if (r.es_historico && Array.isArray(r.productos) && r.productos.length) {
      r.productos.forEach((p) => {
        totales[clasificarLinea(p.linea_negocio)] += p.subtotal || 0;
      });
    } else {
      const ing = calcularIngresos(r);
      totales.hospedaje += ing.alojamiento || 0;
      totales.gastronomia += ing.alimentacion || 0;
      totales.otros += (ing.experiencias || 0) + (ing.guia || 0);
    }
  });
  return totales;
}

function calcularDatosMes(reservas, egresos, mesKey) {
  const reservasDelMes = (reservas || []).filter(
    (r) => getMonthKey(r.fecha_inicio || r.fecha) === mesKey
  );
  const egresosDelMes = (egresos || []).filter(
    (e) => getMonthKey(e.fecha) === mesKey
  );

  const ingresos_total = reservasDelMes.reduce((s, r) => s + getIngresoReserva(r), 0);
  const egresos_total = egresosDelMes.reduce((s, e) => s + (e.valor_cop || 0), 0);
  const utilidad = ingresos_total - egresos_total;
  const margen = calcularMargen(ingresos_total, egresos_total);

  const total_reservas = reservasDelMes.length;
  const total_huespedes = reservasDelMes.reduce((s, r) => s + (r.total_personas || 0), 0);

  const diasConReserva = new Set(
    reservasDelMes.map((r) => r.fecha_inicio).filter(Boolean)
  ).size;
  const [y, m] = mesKey.split('-').map(Number);
  const dias_mes = diasEnMes(y, m);
  const ocupacion_pct = dias_mes > 0 ? (diasConReserva / dias_mes) * 100 : 0;

  const ingresosPorLinea = calcularIngresosPorLinea(reservasDelMes);

  const egresos_operativos = egresosDelMes
    .filter((e) => (e.tipo || 'operativo').toLowerCase() === 'operativo')
    .reduce((s, e) => s + (e.valor_cop || 0), 0);
  const egresos_extraordinarios = egresosDelMes
    .filter((e) => (e.tipo || '').toLowerCase() === 'extraordinario')
    .reduce((s, e) => s + (e.valor_cop || 0), 0);

  const categoriasMap = {};
  egresosDelMes.forEach((e) => {
    const cat = e.categoria || 'Sin categoría';
    categoriasMap[cat] = (categoriasMap[cat] || 0) + (e.valor_cop || 0);
  });
  const top_categorias = Object.entries(categoriasMap)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  const inversionesDelMes = INVERSIONES.filter((i) => getMonthKey(i.fecha) === mesKey);
  const total_inversiones = inversionesDelMes.reduce((s, i) => s + i.valor, 0);

  return {
    mesKey, reservasDelMes, egresosDelMes,
    ingresos_total, egresos_total, utilidad, margen,
    total_reservas, total_huespedes, diasConReserva, dias_mes, ocupacion_pct,
    ingresosPorLinea, egresos_operativos, egresos_extraordinarios,
    top_categorias, inversionesDelMes, total_inversiones,
  };
}

/* ─────────────────────────────────────────────
   Sub-componentes de impresión
   ───────────────────────────────────────────── */

function StatBox({ label, value }) {
  return (
    <div className="stat-box">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

function BarraProporcional({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="barra-track">
      <div className="barra-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function PrintFooter({ pagina, total }) {
  return (
    <div className="informe-footer">
      <span>Earth Park · Macanal, Boyacá · Confidencial</span>
      <span>Página {pagina} de {total}</span>
    </div>
  );
}

const TOTAL_PAGINAS = 6;

/* ─────────────────────────────────────────────
   InformeMensual
   ───────────────────────────────────────────── */

export default function InformeMensual() {
  const { state } = useReservas();
  const [mesSeleccionado, setMesSeleccionado] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );

  const [yy, mm] = mesSeleccionado.split('-');
  const year = parseInt(yy, 10);
  const mesLabel = `${MESES[parseInt(mm, 10) - 1]} ${yy}`;

  const datos = useMemo(
    () => calcularDatosMes(state.reservas, state.egresos, mesSeleccionado),
    [state.reservas, state.egresos, mesSeleccionado]
  );

  const comparativoAnual = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      return calcularDatosMes(state.reservas, state.egresos, key);
    });
  }, [state.reservas, state.egresos, year]);

  const totalInversionesAnio = useMemo(
    () =>
      INVERSIONES.filter((i) => i.fecha.startsWith(String(year)))
        .reduce((s, i) => s + i.valor, 0),
    [year]
  );

  const totalLineas =
    datos.ingresosPorLinea.hospedaje +
    datos.ingresosPorLinea.gastronomia +
    datos.ingresosPorLinea.artesania +
    datos.ingresosPorLinea.otros;

  const pctLinea = (valor) => (totalLineas > 0 ? (valor / totalLineas) * 100 : 0);

  const handlePrint = () => window.print();

  return (
    <div>
      {/* ─────────────── Pantalla (no imprime) ─────────────── */}
      <div className="no-print">
        <PageHeader
          title="Informe Mensual"
          subtitle="Genera el reporte financiero corporativo en PDF"
          action={
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              Generar PDF
            </button>
          }
        />

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Mes a reportar
          </label>
          <input
            type="month"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="bg-gray-900/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <span className="text-gray-500 text-sm sm:ml-auto">{mesLabel}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Ingresos" value={formatCOP(datos.ingresos_total)} icon={DollarSign} colorVariant="earth" />
          <MetricCard label="Egresos" value={formatCOP(datos.egresos_total)} icon={ArrowDownCircle} colorVariant="danger" />
          <MetricCard label="Utilidad" value={formatCOP(datos.utilidad)} icon={TrendingUp} colorVariant="sky" />
          <MetricCard label="Margen" value={`${(datos.margen * 100).toFixed(1)}%`} icon={Percent} colorVariant="bark" />
          <MetricCard label="Reservas" value={datos.total_reservas} icon={FileText} colorVariant="earth" />
          <MetricCard label="Huéspedes" value={`${datos.total_huespedes} pers.`} icon={Users} colorVariant="sky" />
          <MetricCard
            label="Ocupación"
            value={`${datos.ocupacion_pct.toFixed(1)}%`}
            sub={`${datos.diasConReserva} de ${datos.dias_mes} días`}
            icon={CalendarDays}
            colorVariant="bark"
          />
          <MetricCard label="Inversiones del mes" value={formatCOP(datos.total_inversiones)} icon={DollarSign} colorVariant="earth" />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Vista previa del informe imprimible — al hacer clic en "Generar PDF" se abrirá el diálogo de impresión del navegador (elige "Guardar como PDF" como destino).
        </p>
      </div>

      {/* ─────────────── Informe imprimible ─────────────── */}
      <div className="informe-print">

        {/* Página 1 — Portada y resumen ejecutivo */}
        <section className="informe-page">
          <div className="informe-content">
            <div className="portada-header">
              <img src={LOGO_URL} alt="Earth Park" className="portada-logo" />
              <div className="portada-titulo">
                <h1>Earth Park</h1>
                <h2>Informe Mensual</h2>
                <h3>{mesLabel}</h3>
              </div>
            </div>
            <hr className="informe-divider" />

            <h4 className="informe-seccion-titulo">Resumen ejecutivo</h4>
            <div className="stat-grid">
              <StatBox label="Ingresos" value={formatCOP(datos.ingresos_total)} />
              <StatBox label="Egresos" value={formatCOP(datos.egresos_total)} />
              <StatBox label="Utilidad" value={formatCOP(datos.utilidad)} />
              <StatBox label="Margen" value={`${(datos.margen * 100).toFixed(1)}%`} />
              <StatBox label="Reservas" value={datos.total_reservas} />
              <StatBox label="Huéspedes" value={`${datos.total_huespedes} personas`} />
            </div>
            <p className="informe-nota">
              Ocupación del mes: {datos.ocupacion_pct.toFixed(1)}% ({datos.diasConReserva} de {datos.dias_mes} días con reserva)
            </p>
          </div>
          <PrintFooter pagina={1} total={TOTAL_PAGINAS} />
        </section>

        {/* Página 2 — Ingresos por área */}
        <section className="informe-page">
          <div className="informe-content">
            <h4 className="informe-seccion-titulo">Ingresos por área</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>Línea de negocio</th>
                  <th className="col-right">Ingresos</th>
                  <th className="col-right">% del total</th>
                  <th>Proporción</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hospedaje', datos.ingresosPorLinea.hospedaje],
                  ['Gastronomía', datos.ingresosPorLinea.gastronomia],
                  ['Artesanía', datos.ingresosPorLinea.artesania],
                  ['Otros', datos.ingresosPorLinea.otros],
                ].map(([nombre, valor]) => (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td className="col-right">{formatCOP(valor)}</td>
                    <td className="col-right">{pctLinea(valor).toFixed(1)}%</td>
                    <td className="col-barra"><BarraProporcional pct={pctLinea(valor)} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="col-right">{formatCOP(totalLineas)}</td>
                  <td className="col-right">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <PrintFooter pagina={2} total={TOTAL_PAGINAS} />
        </section>

        {/* Página 3 — Egresos y gastos */}
        <section className="informe-page">
          <div className="informe-content">
            <h4 className="informe-seccion-titulo">Egresos y gastos</h4>
            <div className="stat-grid stat-grid-2">
              <StatBox label="Egresos operativos" value={formatCOP(datos.egresos_operativos)} />
              <StatBox label="Egresos extraordinarios" value={formatCOP(datos.egresos_extraordinarios)} />
            </div>

            <h4 className="informe-seccion-titulo informe-seccion-titulo-sm">Top categorías de gasto</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="col-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {datos.top_categorias.length === 0 && (
                  <tr><td colSpan={2} className="col-empty">Sin egresos registrados este mes.</td></tr>
                )}
                {datos.top_categorias.map((c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td className="col-right">{formatCOP(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="informe-seccion-titulo informe-seccion-titulo-sm">Detalle de egresos del mes</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ítem</th>
                  <th>Categoría</th>
                  <th className="col-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {datos.egresosDelMes.length === 0 && (
                  <tr><td colSpan={4} className="col-empty">Sin egresos registrados este mes.</td></tr>
                )}
                {datos.egresosDelMes.map((e) => (
                  <tr key={e.egreso_id}>
                    <td>{e.fecha}</td>
                    <td>{e.item}</td>
                    <td>{e.categoria}</td>
                    <td className="col-right">{formatCOP(e.valor_cop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PrintFooter pagina={3} total={TOTAL_PAGINAS} />
        </section>

        {/* Página 4 — Reservas del mes */}
        <section className="informe-page">
          <div className="informe-content">
            <h4 className="informe-seccion-titulo">Reservas del mes</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Plan</th>
                  <th className="col-right">Personas</th>
                  <th className="col-right">Ingreso</th>
                  <th>Estado pago</th>
                </tr>
              </thead>
              <tbody>
                {datos.reservasDelMes.length === 0 && (
                  <tr><td colSpan={7} className="col-empty">Sin reservas registradas este mes.</td></tr>
                )}
                {datos.reservasDelMes.map((r) => (
                  <tr key={r.reserva_id}>
                    <td>{r.reserva_id}</td>
                    <td>{r.cliente || '—'}</td>
                    <td>{r.fecha_inicio}</td>
                    <td>{r.plan}</td>
                    <td className="col-right">{r.total_personas}</td>
                    <td className="col-right">{formatCOP(getIngresoReserva(r))}</td>
                    <td>{r.estado_pago || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PrintFooter pagina={4} total={TOTAL_PAGINAS} />
        </section>

        {/* Página 5 — Inversiones */}
        <section className="informe-page">
          <div className="informe-content">
            <h4 className="informe-seccion-titulo">Inversiones</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descripción</th>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th className="col-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {datos.inversionesDelMes.length === 0 && (
                  <tr><td colSpan={5} className="col-empty">Sin inversiones registradas este mes.</td></tr>
                )}
                {datos.inversionesDelMes.map((i) => (
                  <tr key={i.id}>
                    <td>{i.id}</td>
                    <td>{i.descripcion}</td>
                    <td>{i.fecha}</td>
                    <td>{i.categoria}</td>
                    <td className="col-right">{formatCOP(i.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total invertido en {mesLabel}</td>
                  <td className="col-right">{formatCOP(datos.total_inversiones)}</td>
                </tr>
                <tr>
                  <td colSpan={4}>Total acumulado {year}</td>
                  <td className="col-right">{formatCOP(totalInversionesAnio)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <PrintFooter pagina={5} total={TOTAL_PAGINAS} />
        </section>

        {/* Página 6 — Comparativo anual */}
        <section className="informe-page">
          <div className="informe-content">
            <h4 className="informe-seccion-titulo">Comparativo anual {year}</h4>
            <table className="tabla-informe">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="col-right">Ingresos</th>
                  <th className="col-right">Egresos</th>
                  <th className="col-right">Utilidad</th>
                  <th className="col-right">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {comparativoAnual.map((d, i) => (
                  <tr key={d.mesKey} className={d.mesKey === mesSeleccionado ? 'fila-actual' : ''}>
                    <td>{MESES_CORTOS[i]} {year}</td>
                    <td className="col-right">{formatCOP(d.ingresos_total)}</td>
                    <td className="col-right">{formatCOP(d.egresos_total)}</td>
                    <td className="col-right">{formatCOP(d.utilidad)}</td>
                    <td className="col-right">{(d.margen * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PrintFooter pagina={6} total={TOTAL_PAGINAS} />
        </section>
      </div>

      <style>{`
        .informe-print {
          background: #e5e7eb;
          padding: 24px 0;
          margin-top: 24px;
        }
        .informe-page {
          background: #ffffff;
          color: #111827;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 24px;
          padding: 16mm 14mm;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          font-family: Arial, Helvetica, sans-serif;
          box-sizing: border-box;
        }
        .informe-content { flex: 1; }

        .portada-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .portada-logo { width: 96px; height: auto; object-fit: contain; }
        .portada-titulo { text-align: right; }
        .portada-titulo h1 { font-size: 24px; font-weight: 700; color: #2D5016; margin: 0; }
        .portada-titulo h2 { font-size: 16px; font-weight: 600; color: #111827; margin: 2px 0 0; }
        .portada-titulo h3 { font-size: 14px; font-weight: 400; color: #6b7280; margin: 2px 0 0; }
        .informe-divider { border: none; border-top: 2px solid #2D5016; margin: 16px 0 20px; }

        .informe-seccion-titulo {
          font-size: 14px;
          font-weight: 700;
          color: #2D5016;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin: 0 0 12px;
        }
        .informe-seccion-titulo-sm { margin-top: 24px; }

        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .stat-grid-2 { grid-template-columns: 1fr 1fr; }
        .stat-box {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 10px 14px;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #6b7280;
          margin: 0 0 4px;
        }
        .stat-value { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
        .informe-nota { font-size: 11px; color: #6b7280; margin-top: 16px; }

        .tabla-informe {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .tabla-informe th {
          background: #2D5016;
          color: #ffffff;
          text-align: left;
          padding: 6px 8px;
          font-weight: 600;
        }
        .tabla-informe td {
          padding: 6px 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .tabla-informe tbody tr:nth-child(even) { background: #f9fafb; }
        .tabla-informe tfoot td { font-weight: 700; border-top: 2px solid #2D5016; }
        .tabla-informe .col-right { text-align: right; }
        .tabla-informe .col-barra { width: 120px; }
        .tabla-informe .col-empty { text-align: center; color: #9ca3af; padding: 16px 8px; }
        .tabla-informe .fila-actual td { background: #dcfce7; font-weight: 700; }

        .barra-track {
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          height: 8px;
          width: 100%;
        }
        .barra-fill { background: #2D5016; height: 100%; }

        .informe-footer {
          margin-top: 16px;
          padding-top: 8px;
          border-top: 1px solid #d1d5db;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #6b7280;
        }

        @media print {
          .no-print { display: none !important; }
          .glass-nav { display: none !important; }
          .main-content { padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
          .informe-print { background: #fff; padding: 0; margin: 0; }
          .informe-page {
            box-shadow: none;
            margin: 0;
            width: auto;
            min-height: 0;
            page-break-after: always;
          }
          .informe-page:last-child { page-break-after: auto; }
        }

        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
