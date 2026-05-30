import { useState } from "react";
import {
  Coffee, UtensilsCrossed, ChevronDown, ChevronUp,
  Clock, AlertTriangle, Sparkles, Leaf, Star,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";

/* ─────────────────────────────────────────────
   Datos del menú — hardcodeados en el componente
   ───────────────────────────────────────────── */

const SECCIONES = [
  {
    id: "desayuno",
    titulo: "Desayuno",
    horario: "7:00 AM – 9:00 AM",
    nota: "Incluido en todos los planes de alojamiento",
    Icono: Coffee,
    colorBorder: "border-l-amber-500",
    colorBg: "bg-amber-500/10",
    colorText: "text-amber-400",
    colorRing: "ring-amber-500/30",
    platos: [
      {
        id: "caldo",
        nombre: "Caldo de Costilla Earth Park",
        descripcion:
          "Caldo de costilla de res con papa criolla, arveja verde y cilantro fresco, preparado desde las 6:00 AM. Es el menú único del desayuno.",
        acompanamiento:
          "Bebida caliente a elección (chocolate Colanta o aromática de hierbas), arepa dorada en budare seco y fruta de temporada.",
        estrella: true,
      },
      {
        id: "arepa-queso",
        nombre: "Arepa con Queso y Mantequilla",
        descripcion:
          "Arepa de maíz cocida en budare sin aceite, servida caliente con queso campesino y mantequilla artesanal.",
        acompanamiento: "Tinto o aromática.",
        estrella: false,
      },
      {
        id: "huevos",
        nombre: "Huevos al Gusto",
        descripcion:
          "Revueltos, fritos o pericos con tomate y cebolla cabezona. Preparados al momento.",
        acompanamiento: "Arepa y bebida caliente.",
        estrella: false,
      },
    ],
  },
  {
    id: "cena",
    titulo: "Cena",
    horario: "7:00 PM – 9:00 PM",
    nota: "Incluida en planes 2D1N y 3D2N",
    Icono: UtensilsCrossed,
    colorBorder: "border-l-emerald-500",
    colorBg: "bg-emerald-500/10",
    colorText: "text-emerald-400",
    colorRing: "ring-emerald-500/30",
    platos: [
      {
        id: "hamburguesa",
        nombre: "Hamburguesa Earth Park",
        descripcion:
          "Ranchera 130g a la plancha (4–5 min por lado), pan tostado, queso La Pampa, lechuga fresca y salsas al gusto.",
        acompanamiento: "Papa frita o en cascos.",
        alerta: "Sin tomate",
        estrella: true,
      },
      {
        id: "pechuga",
        nombre: "Pechuga a la Plancha",
        descripcion:
          "Pechuga de pollo marinada 30 min con sal, pimienta, ajo en polvo y limón, cocinada a fuego medio-alto hasta cocción interna completa.",
        acompanamiento: "Papa frita o en cascos.",
        alerta: "Sin tomate",
        estrella: false,
      },
      {
        id: "cena-valle",
        nombre: "Cena del Valle",
        descripcion:
          "Plato especial del chef con ingredientes locales de temporada: carnes al caldero, mazamorra chiquita o proteína del día según mercado.",
        acompanamiento: "Consultar disponibilidad al momento del check-in.",
        temporada: true,
        estrella: false,
      },
    ],
  },
];

/* ─────────────────────────────────────────────
   PlatoCard — tarjeta individual de un plato
   ───────────────────────────────────────────── */

function PlatoCard({ plato, colorText }) {
  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in">
      {/* Nombre + badges */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-display font-semibold text-gray-100 text-base leading-snug flex-1">
          {plato.nombre}
        </h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {plato.estrella && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
              <Star className="w-2.5 h-2.5" />
              Estrella del menú
            </span>
          )}
          {plato.temporada && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 whitespace-nowrap">
              <Leaf className="w-2.5 h-2.5" />
              Temporada
            </span>
          )}
        </div>
      </div>

      {/* Descripción */}
      <p className="text-sm text-gray-400 leading-relaxed mb-3">
        {plato.descripcion}
      </p>

      {/* Acompañamiento */}
      {plato.acompanamiento && (
        <div className="flex items-start gap-1.5 mb-2">
          <Sparkles className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colorText}`} />
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className={`font-medium ${colorText}`}>Acompañamiento: </span>
            {plato.acompanamiento}
          </p>
        </div>
      )}

      {/* Alerta (sin tomate, etc.) */}
      {plato.alerta && (
        <div className="flex items-center gap-1.5 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-xs font-medium text-red-400">{plato.alerta}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SeccionCard — card expandible de cada comida
   ───────────────────────────────────────────── */

function SeccionCard({ seccion }) {
  const [abierta, setAbierta] = useState(false);
  const { Icono } = seccion;

  return (
    <div
      className={`glass-card border-l-4 ${seccion.colorBorder} overflow-hidden transition-all duration-300`}
    >
      {/* ── Cabecera siempre visible ── */}
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-white/[0.03] transition-colors duration-200 group"
        aria-expanded={abierta}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Ícono */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${seccion.colorBg}`}>
            <Icono className={`w-5 h-5 ${seccion.colorText}`} />
          </div>

          {/* Título + meta */}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white leading-tight">
              {seccion.titulo}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {seccion.horario}
              </span>
              <span className="text-xs text-gray-600 hidden sm:inline">·</span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {seccion.nota}
              </span>
            </div>
            {/* Nota visible solo en mobile (en desktop va inline arriba) */}
            <p className="text-xs text-gray-600 mt-0.5 sm:hidden">{seccion.nota}</p>
          </div>
        </div>

        {/* Chevron + contador de platos */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${seccion.colorBg} ${seccion.colorText} hidden sm:inline-block`}>
            {seccion.platos.length} platos
          </span>
          {abierta
            ? <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
            : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
          }
        </div>
      </button>

      {/* ── Cuerpo expandible ── */}
      {abierta && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-3">
          {seccion.platos.map((plato) => (
            <PlatoCard
              key={plato.id}
              plato={plato}
              colorText={seccion.colorText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GastronomiaPage — vista principal
   ───────────────────────────────────────────── */

export default function GastronomiaPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Gastronomía"
        subtitle="Menú Earth Park · Macanal, Boyacá"
      />

      <div className="space-y-4">
        {SECCIONES.map((seccion) => (
          <SeccionCard key={seccion.id} seccion={seccion} />
        ))}
      </div>

      {/* Nota de alérgenos */}
      <div className="mt-6 flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-500/70 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          Si tienes alergias o restricciones alimentarias, infórmanos al momento del registro.
          Todos los platos se preparan en la misma cocina.
        </p>
      </div>
    </div>
  );
}
