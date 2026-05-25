import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Users, UserX, DollarSign,
  BedDouble, BedSingle, AlertTriangle, Hotel,
  Home, ChevronDown, Pencil, X, Check,
} from 'lucide-react';

import { useReservas } from '../../context/ReservasContext';
import { formatCOP } from '../../utils/formatCOP';
import { calcularHospedaje } from '../../utils/calcularHospedaje';
import { CONFIG } from '../../data/config';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import PageHeader from '../../components/PageHeader';

const TARIFA_STORAGE_KEY = 'earthpark_tarifa_alojamiento';

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const CAPACIDAD_INTERNA = 7;

const ROOMS = [
  {
    id: 'mariposa',
    nombre: 'Mariposa',
    capacidad: 5,
    camas: [
      { id: 'M-D1a', tipo: 'doble', label: 'M-D1a' },
      { id: 'M-D1b', tipo: 'doble', label: 'M-D1b' },
      { id: 'M-D2a', tipo: 'doble', label: 'M-D2a' },
      { id: 'M-D2b', tipo: 'doble', label: 'M-D2b' },
      { id: 'M-S1',  tipo: 'sencilla', label: 'M-S1' },
    ],
  },
  {
    id: 'ancestros',
    nombre: 'Ancestros',
    capacidad: 2,
    camas: [
      { id: 'A-D1a', tipo: 'doble', label: 'A-D1a' },
      { id: 'A-D1b', tipo: 'doble', label: 'A-D1b' },
    ],
  },
];

/* ─────────────────────────────────────────────
   ReservaSelector
   ───────────────────────────────────────────── */

function ReservaSelector({ reservas, selectedId, onChange }) {
  if (!reservas || reservas.length === 0) return null;

  return (
    <div className="relative w-full sm:w-72">
      <label
        htmlFor="reserva-select-hospedaje"
        className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider"
      >
        Cargar desde reserva
      </label>
      <div className="relative">
        <select
          id="reserva-select-hospedaje"
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-800/70 border border-gray-600/50 text-gray-100
                     rounded-xl px-4 py-2.5 pr-10 text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60
                     transition-all duration-200 backdrop-blur-sm cursor-pointer
                     hover:border-gray-500/70"
        >
          <option value="">— Simular manualmente —</option>
          {reservas.map((r) => (
            <option key={r.reserva_id} value={r.reserva_id}>
              {r.reserva_id} — {r.cliente} ({r.total_personas} pers.)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HospedajeSimulador  — Slider
   ───────────────────────────────────────────── */

function HospedajeSimulador({ personas, onPersonasChange }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 animate-slide-up">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Simulador de ocupación
      </h3>

      <div className="flex flex-col items-center gap-5">
        {/* Current value */}
        <div className="text-center">
          <span className="text-5xl sm:text-6xl font-display font-bold text-emerald-400 tabular-nums leading-none">
            {personas}
          </span>
          <p className="text-sm text-gray-400 mt-2">
            {personas === 1 ? 'persona' : 'personas'}
          </p>
        </div>

        {/* Slider */}
        <div className="w-full max-w-md">
          <input
            type="range"
            min={1}
            max={20}
            value={personas}
            onChange={(e) => onPersonasChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700"
            style={{
              background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((personas - 1) / 19) * 100}%, #374151 ${((personas - 1) / 19) * 100}%, #374151 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-0.5">
            <span>1</span>
            <span>{CAPACIDAD_INTERNA} (cap. interna)</span>
            <span>20</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EditarTarifaModal
   ───────────────────────────────────────────── */

function EditarTarifaModal({ tarifa, onSave, onClose }) {
  const [valor, setValor] = useState(String(tarifa));

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = Number(valor);
    if (!isNaN(n) && n >= 0) {
      onSave(n);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto bg-gray-900 border border-gray-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-100">Editar tarifa</h3>
              <p className="text-xs text-gray-400 mt-1">Precio por persona/noche</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Tarifa COP</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              className="w-full mt-1.5 bg-gray-800/70 border border-gray-600/50 rounded-xl px-4 py-2.5 text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60
                         tabular-nums text-lg font-semibold"
            />
          </label>

          <p className="text-xs text-gray-500 mt-2">
            Tarifa actual: {formatCOP(tarifa)} · Default: {formatCOP(CONFIG.precios.alojamiento)}
          </p>

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700/60 text-gray-300 hover:bg-gray-800/60 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   MetricasHospedaje
   ───────────────────────────────────────────── */

function MetricasHospedaje({ hospedaje, tarifa, onEditarTarifa }) {
  const metrics = [
    {
      label: 'Capacidad interna',
      value: CAPACIDAD_INTERNA,
      sub: 'camas totales',
      icon: Building2,
      colorVariant: 'sky',
    },
    {
      label: 'Personas internas',
      value: hospedaje.personas_internas,
      sub: `de ${CAPACIDAD_INTERNA} disponibles`,
      icon: Users,
      colorVariant: 'earth',
    },
    {
      label: 'Personas externas',
      value: hospedaje.personas_externas,
      sub: hospedaje.personas_externas > 0 ? 'requieren hospedaje externo' : 'todas cubiertas',
      icon: UserX,
      colorVariant: hospedaje.personas_externas > 0 ? 'danger' : 'earth',
    },
  ];

  return (
    <section className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}

        {/* Ingreso alojamiento — with edit tariff button */}
        <div className="relative group">
          <MetricCard
            label="Ingreso alojamiento"
            value={formatCOP(hospedaje.ingreso_alojamiento)}
            sub={`${formatCOP(tarifa)}/persona`}
            icon={DollarSign}
            colorVariant="bark"
          />
          <button
            onClick={onEditarTarifa}
            title="Editar tarifa"
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-900/70 border border-gray-700/50
                       text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40
                       opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HabitacionCard  — Room visualization
   ───────────────────────────────────────────── */

function HabitacionCard({ room, ocupadas }) {
  const occupied = ocupadas ?? 0;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-gray-600/60 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Home className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-gray-100 text-base">
              {room.nombre}
            </h4>
            <p className="text-xs text-gray-400">Capacidad: {room.capacidad} personas</p>
          </div>
        </div>
        <Badge variant={occupied >= room.capacidad ? 'warn' : occupied > 0 ? 'ok' : 'info'}>
          {occupied} / {room.capacidad} ocupadas
        </Badge>
      </div>

      {/* Bed grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {room.camas.map((cama, idx) => {
          const isOccupied = idx < occupied;
          const Icon = cama.tipo === 'doble' ? BedDouble : BedSingle;

          return (
            <div
              key={cama.id}
              className="group relative flex flex-col items-center gap-1.5"
            >
              <div
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center
                  transition-all duration-300 border
                  ${isOccupied
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 shadow-lg shadow-sky-500/10'
                    : 'bg-gray-700/30 border-gray-600/30 text-gray-600'
                  }
                  group-hover:scale-105
                `}
                title={`${cama.label} — ${cama.tipo} — ${isOccupied ? 'Ocupada' : 'Libre'}`}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className={`text-[10px] font-mono tracking-tight ${isOccupied ? 'text-sky-400' : 'text-gray-500'}`}>
                {cama.label}
              </span>

              {/* Hover tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg
                              bg-gray-900/95 text-[10px] text-gray-300 whitespace-nowrap
                              opacity-0 group-hover:opacity-100 transition-opacity duration-200
                              pointer-events-none border border-gray-700/50 z-10">
                {cama.tipo === 'doble' ? 'Cama doble' : 'Cama sencilla'} — {isOccupied ? 'Ocupada' : 'Libre'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AlertaExternos
   ───────────────────────────────────────────── */

function AlertaExternos({ hospedaje }) {
  if (!hospedaje || hospedaje.personas_externas <= 0) return null;

  return (
    <div className="animate-pulse-soft">
      <div className="relative bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 overflow-hidden border-2 border-red-500/40">
        {/* Gradient glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5 pointer-events-none" />

        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-red-400 text-lg">
              ¡Hospedaje externo requerido!
            </h4>
            <p className="text-gray-300 text-sm mt-1">
              <span className="font-bold text-red-300">{hospedaje.personas_externas}</span>
              {hospedaje.personas_externas === 1 ? ' persona debe' : ' personas deben'} hospedarse
              externamente. La capacidad interna de {CAPACIDAD_INTERNA} camas ha sido superada.
            </p>

            {hospedaje.alerta_externos?.costo_referencia != null && (
              <div className="mt-3 inline-flex items-center gap-2 bg-gray-900/50 rounded-xl px-4 py-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-400">Costo referencia/noche:</span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {formatCOP(hospedaje.alerta_externos.costo_referencia)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HospedajePage  — Main
   ───────────────────────────────────────────── */

export default function HospedajePage() {
  const { state } = useReservas();
  const { reservas } = state;
  const [searchParams] = useSearchParams();

  const urlReservaId = searchParams.get('reserva_id') || '';
  const [selectedReservaId, setSelectedReservaId] = useState(urlReservaId);

  /* Derive initial personas from URL reservation if available */
  const urlReserva = useMemo(
    () => reservas?.find((r) => r.reserva_id === urlReservaId),
    [reservas, urlReservaId]
  );

  const [personas, setPersonas] = useState(
    urlReserva?.total_personas ?? 4
  );

  /* Editable tarifa — persisted in localStorage */
  const [tarifa, setTarifa] = useState(() => {
    try {
      const saved = localStorage.getItem(TARIFA_STORAGE_KEY);
      const n = saved != null ? Number(saved) : NaN;
      return !isNaN(n) && n >= 0 ? n : CONFIG.precios.alojamiento;
    } catch (_) {
      return CONFIG.precios.alojamiento;
    }
  });
  const [editandoTarifa, setEditandoTarifa] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(TARIFA_STORAGE_KEY, String(tarifa));
    } catch (_) { /* ignore */ }
  }, [tarifa]);

  /* When user picks a reservation from dropdown, sync slider */
  const handleReservaChange = useCallback(
    (id) => {
      setSelectedReservaId(id);
      if (id) {
        const r = reservas?.find((rv) => rv.reserva_id === id);
        if (r?.total_personas) setPersonas(r.total_personas);
      }
    },
    [reservas]
  );

  /* Real-time hospedaje calculation — override ingreso_alojamiento with editable tarifa */
  const hospedaje = useMemo(() => {
    const base = calcularHospedaje(personas);
    return { ...base, ingreso_alojamiento: personas * tarifa };
  }, [personas, tarifa]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Hospedaje"
        subtitle="Simulador de ocupación y distribución de camas"
        action={
          <ReservaSelector
            reservas={reservas || []}
            selectedId={selectedReservaId}
            onChange={handleReservaChange}
          />
        }
      />

      {/* Simulator slider */}
      <HospedajeSimulador personas={personas} onPersonasChange={setPersonas} />

      {/* Metrics */}
      <MetricasHospedaje
        hospedaje={hospedaje}
        tarifa={tarifa}
        onEditarTarifa={() => setEditandoTarifa(true)}
      />

      {editandoTarifa && (
        <EditarTarifaModal
          tarifa={tarifa}
          onSave={setTarifa}
          onClose={() => setEditandoTarifa(false)}
        />
      )}

      {/* Room cards */}
      <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Hotel className="w-4 h-4" />
          Distribución por habitación
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HabitacionCard
            room={ROOMS[0]}
            ocupadas={hospedaje.ocu_mariposa}
          />
          <HabitacionCard
            room={ROOMS[1]}
            ocupadas={hospedaje.ocu_ancestros}
          />
        </div>
      </section>

      {/* External alert */}
      <AlertaExternos hospedaje={hospedaje} />
    </div>
  );
}
