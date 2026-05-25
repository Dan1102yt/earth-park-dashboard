import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChefHat, Coffee, ChevronDown, ChevronUp,
  ShoppingCart, AlertTriangle, ClipboardList, UtensilsCrossed,
  Package, Plus, Minus, Tag,
} from 'lucide-react';

import { useReservas } from '../../context/ReservasContext';
import { formatCOP } from '../../utils/formatCOP';
import {
  calcularListaCompras,
  totalListaCompras,
} from '../../utils/calcularInsumos';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { MENU } from '../../data/menuConfig';

/* ─────────────────────────────────────────────
   Category display names & styling
   ───────────────────────────────────────────── */

const categoryDisplay = {
  cena_hamburguesa: { label: 'Cena — Hamburguesa', color: 'border-l-amber-500' },
  cena_pechuga:     { label: 'Cena — Pechuga',     color: 'border-l-emerald-500' },
  acompanamiento:   { label: 'Acompañamiento',     color: 'border-l-sky-500' },
  desayuno:         { label: 'Desayuno',            color: 'border-l-orange-400' },
  stock:            { label: 'Stock — Verificar',   color: 'border-l-gray-500' },
};

/* Extras chips disponibles por plato */
const EXTRAS_DISPONIBLES = {
  hamburguesa: ['Extra queso', 'Extra carne', 'Sin lechuga', 'Bebida'],
  pechuga:     ['Extra pollo', 'Ensalada', 'Bebida', 'Postre'],
  desayuno:    ['Extra arepa', 'Extra fruta', 'Café adicional'],
};

/* ─────────────────────────────────────────────
   ReservaSelector
   ───────────────────────────────────────────── */

function ReservaSelector({ reservas, selectedId, onChange }) {
  return (
    <div className="relative w-full sm:w-72">
      <label
        htmlFor="reserva-select-cocina"
        className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider"
      >
        Reserva activa
      </label>
      <div className="relative">
        <select
          id="reserva-select-cocina"
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-800/70 border border-gray-600/50 text-gray-100
                     rounded-xl px-4 py-2.5 pr-10 text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60
                     transition-all duration-200 backdrop-blur-sm cursor-pointer
                     hover:border-gray-500/70"
        >
          <option value="">— Seleccionar reserva —</option>
          {reservas.map((r) => (
            <option key={r.reserva_id} value={r.reserva_id}>
              {r.reserva_id} — {r.cliente}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PlatoCounterCard — card con botones +/- y chips
   ───────────────────────────────────────────── */

function PlatoCounterCard({ icon: Icon, colorVariant, label, value, sub, onInc, onDec, extras, extrasSeleccionados, onToggleExtra }) {
  const variantClasses = {
    bark: 'bg-amber-500/20 text-amber-400',
    earth: 'bg-emerald-500/20 text-emerald-400',
    sky: 'bg-sky-500/20 text-sky-400',
  };
  const iconBg = variantClasses[colorVariant] || variantClasses.earth;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 transition-all duration-300 hover:border-gray-600/60">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-gray-100 tabular-nums leading-tight">{value}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDec}
            disabled={value <= 0}
            className="w-8 h-8 rounded-lg bg-gray-700/60 border border-gray-600/50 text-gray-300
                       hover:bg-gray-700 hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center"
            title="Restar"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onInc}
            className="w-8 h-8 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-white transition-colors
                       flex items-center justify-center"
            title="Sumar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{sub}</p>

      {/* Chips de extras */}
      {extras && extras.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Extras
          </p>
          <div className="flex flex-wrap gap-1.5">
            {extras.map((extra) => {
              const activo = extrasSeleccionados.includes(extra);
              return (
                <button
                  key={extra}
                  type="button"
                  onClick={() => onToggleExtra(extra)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-all duration-150
                    ${activo
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-700/40 text-gray-400 border-gray-600/40 hover:bg-gray-700/60 hover:text-gray-300'
                    }`}
                >
                  {extra}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PlatosResumen — con botones +/- y chips
   ───────────────────────────────────────────── */

function PlatosResumen({ counts, setCounts, extras, toggleExtra }) {
  const inc = (key) => setCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
  const dec = (key) => setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) - 1) }));

  return (
    <section className="animate-slide-up">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <ClipboardList className="w-4 h-4" />
        Resumen de platos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PlatoCounterCard
          icon={UtensilsCrossed}
          colorVariant="bark"
          label="Hamburguesas"
          value={counts.n_hamburguesa}
          sub={`${counts.n_hamburguesa} porciones`}
          onInc={() => inc('n_hamburguesa')}
          onDec={() => dec('n_hamburguesa')}
          extras={EXTRAS_DISPONIBLES.hamburguesa}
          extrasSeleccionados={extras.hamburguesa}
          onToggleExtra={(e) => toggleExtra('hamburguesa', e)}
        />
        <PlatoCounterCard
          icon={ChefHat}
          colorVariant="earth"
          label="Pechugas"
          value={counts.n_pechuga}
          sub={`${counts.n_pechuga} porciones`}
          onInc={() => inc('n_pechuga')}
          onDec={() => dec('n_pechuga')}
          extras={EXTRAS_DISPONIBLES.pechuga}
          extrasSeleccionados={extras.pechuga}
          onToggleExtra={(e) => toggleExtra('pechuga', e)}
        />
        <PlatoCounterCard
          icon={Coffee}
          colorVariant="sky"
          label="Desayunos"
          value={counts.total_personas}
          sub={`${counts.total_personas} personas`}
          onInc={() => inc('total_personas')}
          onDec={() => dec('total_personas')}
          extras={EXTRAS_DISPONIBLES.desayuno}
          extrasSeleccionados={extras.desayuno}
          onToggleExtra={(e) => toggleExtra('desayuno', e)}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FichaPlato  — Accordion dish card
   ───────────────────────────────────────────── */

function FichaPlato({ plato }) {
  const [open, setOpen] = useState(false);

  if (!plato) return null;

  const ingredientes = plato.ingredientes_por_porcion || plato.ingredientes_para_10 || [];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-600/60">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left
                   hover:bg-gray-700/20 transition-colors duration-200 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
            <ChefHat className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h4 className="font-display font-semibold text-gray-100 text-base truncate">
              {plato.nombre}
            </h4>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {plato.sin?.length > 0 && (
                <Badge variant="warn">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  SIN {plato.sin.join(', ')}
                </Badge>
              )}
              {plato.acompanamiento && (
                <Badge variant="info">{plato.acompanamiento}</Badge>
              )}
              {plato.es_unico && (
                <Badge variant="ok">Menú único</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {plato.costo_porcion_aprox != null && (
            <span className="text-sm font-medium text-amber-400 hidden sm:block">
              {formatCOP(plato.costo_porcion_aprox)}/porción
            </span>
          )}
          {open ? (
            <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
          )}
        </div>
      </button>

      {/* Body — expandable */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 border-t border-gray-700/30 pt-4 space-y-5">
          {/* Ingredients table */}
          {ingredientes.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {plato.ingredientes_por_porcion ? 'Ingredientes por porción' : 'Ingredientes para 10 personas'}
              </h5>
              <div className="bg-gray-900/40 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-medium">Ingrediente</th>
                      <th className="text-right px-3 py-2 font-medium">Cantidad</th>
                      <th className="text-left px-3 py-2 font-medium">Unidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {ingredientes.map((ing, i) => (
                      <tr key={i} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-2">{ing.item}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{ing.cantidad ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{ing.unidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preparation steps */}
          {plato.preparacion?.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Preparación
              </h5>
              <ol className="space-y-2">
                {plato.preparacion.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Cost per portion */}
          {plato.costo_porcion_aprox != null && (
            <div className="flex items-center justify-between bg-gray-900/40 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-gray-400">Costo aproximado por porción</span>
              <span className="text-lg font-bold text-amber-400 tabular-nums">
                {formatCOP(plato.costo_porcion_aprox)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ListaCompras — con columna "En stock"
   ───────────────────────────────────────────── */

function ListaCompras({ reservaSimulada }) {
  const lista = useMemo(() => calcularListaCompras(reservaSimulada), [reservaSimulada]);

  /* Items marcados como "ya en stock" — excluidos del total */
  const [enStock, setEnStock] = useState(() => new Set());

  /* Reset cuando cambian las cantidades base (nueva reserva o cambio significativo) */
  useEffect(() => {
    setEnStock(new Set());
  }, [reservaSimulada.reserva_id]);

  const toggleStock = (key) => {
    setEnStock((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Total: excluye los items marcados como "en stock" */
  const total = useMemo(() => {
    const filtrada = lista.filter((item) => {
      const key = `${item.categoria}-${item.item}`;
      return !enStock.has(key);
    });
    return totalListaCompras(filtrada);
  }, [lista, enStock]);

  /* Group by categoria code */
  const grouped = useMemo(() => {
    const map = new Map();
    lista.forEach((item) => {
      const cat = item.categoria || 'otros';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    });
    return map;
  }, [lista]);

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4" />
        Lista de compras
      </h3>

      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/40 text-gray-300 text-xs uppercase tracking-wider">
                <th className="text-center px-3 py-3 font-semibold w-16">En stock</th>
                <th className="text-left px-4 py-3 font-semibold">Ítem</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Unidad</th>
                <th className="text-right px-4 py-3 font-semibold">Cantidad</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Costo/Unit</th>
                <th className="text-right px-4 py-3 font-semibold">Costo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {[...grouped.entries()].map(([cat, items]) => {
                const meta = categoryDisplay[cat] || { label: cat, color: 'border-l-gray-500' };
                const isStockCat = cat === 'stock';
                return (
                  <React.Fragment key={cat}>
                    {/* Category header */}
                    <tr className="bg-gray-700/20">
                      <td
                        colSpan={6}
                        className={`px-4 py-2.5 border-l-4 ${meta.color}`}
                      >
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
                          {meta.label}
                        </span>
                      </td>
                    </tr>

                    {/* Items */}
                    {items.map((item, idx) => {
                      const key = `${cat}-${item.item}`;
                      const tieneStock = enStock.has(key);
                      return (
                        <tr
                          key={`${cat}-${idx}`}
                          className={`transition-colors duration-150 hover:bg-gray-700/20
                            ${isStockCat ? 'text-gray-500' : tieneStock ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={tieneStock}
                              onChange={() => toggleStock(key)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500
                                         focus:ring-emerald-500/50 cursor-pointer accent-emerald-500"
                              title={tieneStock ? 'En stock — excluido del total' : 'Marcar como en stock'}
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium">
                            <div className="flex items-center gap-2">
                              {item.item}
                              {isStockCat && <Badge variant="pending">verificar</Badge>}
                              {item.nota && !isStockCat && (
                                <span className="text-[10px] text-amber-400/70 italic hidden sm:inline">
                                  ({item.nota})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell text-gray-400">
                            {item.unidad}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {item.cantidad ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell text-gray-400">
                            {formatCOP(item.costo_unit)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                            {item.es_stock ? '—' : formatCOP(item.costo_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-700/40 border-t-2 border-emerald-500/40">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right text-sm font-bold text-gray-200 uppercase tracking-wider"
                >
                  Total compras {enStock.size > 0 && (
                    <span className="text-xs font-normal text-gray-400 normal-case ml-2">
                      ({enStock.size} excluido{enStock.size !== 1 ? 's' : ''} por stock)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-emerald-400 tabular-nums">
                  {formatCOP(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CocinaPage  — Main page component
   ───────────────────────────────────────────── */

export default function CocinaPage() {
  const { state } = useReservas();
  const { reservas } = state;
  const [searchParams] = useSearchParams();

  const initialId = searchParams.get('reserva_id') || '';
  const [selectedId, setSelectedId] = useState(initialId);

  const selectedReserva = useMemo(
    () => reservas.find((r) => r.reserva_id === selectedId) || null,
    [reservas, selectedId]
  );

  /* Counts locales editables con +/- — se inicializan desde la reserva */
  const [counts, setCounts] = useState({
    n_hamburguesa: 0,
    n_pechuga: 0,
    total_personas: 0,
  });

  /* Extras seleccionados por plato */
  const [extras, setExtras] = useState({
    hamburguesa: [],
    pechuga: [],
    desayuno: [],
  });

  /* Sync counts cuando cambia la reserva seleccionada */
  useEffect(() => {
    if (selectedReserva) {
      setCounts({
        n_hamburguesa: selectedReserva.n_hamburguesa ?? 0,
        n_pechuga: selectedReserva.n_pechuga ?? 0,
        total_personas: selectedReserva.total_personas ?? 0,
      });
      setExtras({ hamburguesa: [], pechuga: [], desayuno: [] });
    }
  }, [selectedReserva?.reserva_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExtra = (plato, extra) => {
    setExtras((prev) => {
      const arr = prev[plato] || [];
      const next = arr.includes(extra)
        ? arr.filter((e) => e !== extra)
        : [...arr, extra];
      return { ...prev, [plato]: next };
    });
  };

  /* Reserva simulada para los cálculos (mezcla la real + counts editados) */
  const reservaSimulada = useMemo(() => {
    if (!selectedReserva) return null;
    return { ...selectedReserva, ...counts };
  }, [selectedReserva, counts]);

  /* ── Empty state ── */
  if (!reservas || reservas.length === 0) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in">
        <PageHeader title="Cocina" subtitle="Gestión de menú e insumos" />
        <EmptyState
          icon={ChefHat}
          title="Sin reservas"
          message="Crea una reserva para ver la planificación de cocina."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Cocina"
        subtitle="Planificación de menú, insumos y lista de compras"
        action={
          <ReservaSelector
            reservas={reservas}
            selectedId={selectedId}
            onChange={setSelectedId}
          />
        }
      />

      {!selectedReserva ? (
        <EmptyState
          icon={ChefHat}
          title="Selecciona una reserva"
          message="Elige una reserva del selector para ver el detalle de cocina."
        />
      ) : (
        <div className="space-y-8">
          {/* 1. Resumen de platos — con +/- y chips */}
          <PlatosResumen
            counts={counts}
            setCounts={setCounts}
            extras={extras}
            toggleExtra={toggleExtra}
          />

          {/* 2. Fichas técnicas de platos */}
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Fichas técnicas de platos
            </h3>
            <div className="space-y-3">
              {Object.entries(MENU).map(([key, plato]) => (
                <FichaPlato key={key} plato={plato} />
              ))}
            </div>
          </section>

          {/* 3. Lista de compras — con columna "En stock" */}
          <ListaCompras reservaSimulada={reservaSimulada} />
        </div>
      )}
    </div>
  );
}
