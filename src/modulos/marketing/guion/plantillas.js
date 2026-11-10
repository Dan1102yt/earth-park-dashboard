// Guiones de ejemplo. El primero es la idea del video promocional para CaviFest, agencias e Instagram.

const f = (k) => `cotizacion/${k}.jpg`;

export const PROMO_HOLLYWOOD = {
  titulo: "Promo Hollywood Boyacense (45 s)",
  estilo: "Dinámico, cinematográfico, aspiracional y alegre",
  musica_sugerida: "Cuerda andina contemporánea (requinto acústico) que evoluciona hacia un beat cinematográfico y fresco",
  cta: "Reserva tu cupo",
  escenas: [
    {
      desde: "00:00", hasta: "00:06",
      toma: "Toma aérea rápida (drone) sobrevolando el embalse La Esmeralda, aguas verde esmeralda y cañones imponentes.",
      locucion: "¿Creías que para ver paisajes de película tenías que salir del país?",
      texto: "El Hollywood Boyacense existe 🎬🌿",
      fotos: [f("paisaje"), f("embalse-kayak")],
    },
    {
      desde: "00:06", hasta: "00:14",
      toma: "Lancha cortando las aguas del embalse; pasajeros sonriendo con chalecos salvavidas y vista a los túneles verdes.",
      locucion: "Bienvenido a Macanal, en el corazón del Valle de Tenza. Navega entre cañones gigantescos…",
      texto: "Navegación en el Embalse La Esmeralda 🚤",
      fotos: [f("lancha"), f("kayak")],
    },
    {
      desde: "00:14", hasta: "00:22",
      toma: "Primer plano de una arepa boyacense caliente y café servido en mug campesino; luego sendero natural de Earth Park.",
      locucion: "…despierta tus sentidos con el mejor café campesino y conecta con la naturaleza viva en Earth Park.",
      texto: "Sabores típicos & Conexión Natural 🍃☕",
      fotos: [f("mesa"), f("grupo-campo")],
    },
    {
      desde: "00:22", hasta: "00:30",
      toma: "Turistas tomándose fotos épicas con brazos abiertos en el Mirador del Cielo, con el abismo y las montañas de fondo.",
      locucion: "Descubre miradores que tocan las nubes, cascadas secretas y la magia de nuestra tierra.",
      texto: "Mirador del Cielo & Cascadas ☁️⛰️",
      fotos: [f("mirador-luna"), f("cascada")],
    },
    {
      desde: "00:30", hasta: "00:38",
      toma: "Rápido destello del Mirador La Mano del Minero y la mesa servida con almuerzo tradicional boyacense.",
      locucion: "Una experiencia completa con guía profesional, gastronomía auténtica y la mejor logística en territorio.",
      texto: "Plan Todo Incluido en Territorio ✅",
      fotos: [f("mineria"), f("comida-montana")],
    },
    {
      desde: "00:38", hasta: "00:45",
      toma: "Logo animado de Earth Park, mariposa volando suavemente, datos de contacto y llamada a la acción.",
      locucion: "Ven a descubrir el Hollywood Boyacense. Reserva hoy con Earth Park o pide tu plan con tu agencia aliada.",
      texto: "O pide tu plan con tu agencia aliada",
      fotos: [f("macanal")],
      cierre: true,
    },
  ],
};

export const PROYECTO_VACIO = {
  titulo: "Nuevo video",
  cta: "Reserva tu cupo",
  escenas: [
    { desde: "00:00", hasta: "00:06", toma: "", locucion: "", texto: "", fotos: [] },
    { desde: "00:06", hasta: "00:12", toma: "", locucion: "", texto: "", fotos: [], cierre: true },
  ],
};
