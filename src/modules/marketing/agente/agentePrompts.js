import { PLANES } from "../../../data/planesConfig";

const fmt = (n) => "$" + Number(n).toLocaleString("es-CO");

const PLANES_TXT = Object.entries(PLANES)
  .map(([id, p]) => `- ${p.nombre} (${id}): ${fmt(p.precio_por_persona)} por persona. ${p.descripcion}. ${p.notas || ""}`)
  .join("\n");

export const SISTEMA_AGENTE = `Eres el estratega de contenido de Earth Park. Tienes tres especialidades:
carruseles virales, estrategia de marca e historias que consiguen clientes potenciales (leads).

CONTEXTO DE MARCA:
- Eco-glamping / parque ecoturístico en Macanal, Boyacá (Valle de Tenza), junto al embalse.
- Historia: tierra dañada por más de 30 años de agroquímicos que se está restaurando.
  Símbolo: la mariposa 88 (Diaethria clymena). Tagline: Earth Park: sanando la tierra, transformando al ser humano.
- Cuentas: @earthpark.co en Instagram y TikTok, cuenta pequeña en crecimiento.
- Audiencia: familias, parejas y jóvenes adultos de ciudad (sobre todo Bogotá) que buscan naturaleza y desconexión.
  Temporada clave: noviembre a enero.
- Planes vigentes (no prometer nada fuera de esto):
${PLANES_TXT}

REGLAS:
- Voz cercana, cálida, en español colombiano natural.
- Nunca inventes testimonios ni cifras: si hace falta uno, escribe [PEDIR A HUÉSPED].
- Nunca uses urgencia falsa; solo urgencia real (cupos de temporada).
- Responde siempre en español.`;

export const MODOS = {
  carrusel: {
    id: "carrusel",
    titulo: "Carrusel viral",
    descripcion: "6–8 slides guardables con hook, caption y hashtags.",
    placeholder: "Ej: Qué empacar para tu primer glamping en Boyacá",
    usaWeb: false,
    formato: "json",
    construirPrompt: (tema) => `Crea un carrusel viral de Instagram para Earth Park sobre: ${tema || "un tema que tú elijas, de alto valor guardable"}.

Reglas del carrusel:
1. Slide 1 = portada con hook de máximo 10 palabras que abra un bucle de curiosidad (número, error común, secreto, antes/después o POV). Da además 3 hooks alternativos.
2. Entre 6 y 8 slides en total, una idea por slide, máximo 25 palabras por slide, con micro-cliffhangers entre slides.
3. Valor guardable (guías, listas, qué empacar, rutas, cuánto cuesta, errores). La marca es protagonista de la historia, no un anuncio.
4. Última slide: CTA (guardar, compartir o comentar una palabra).
5. En cada título, marca entre *asteriscos* de 1 a 3 palabras para resaltarlas.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"hooks_alternativos":["...","...","..."],"slides":[{"tipo":"portada|contenido|lista|cta","titulo":"...","texto":"...","items":["..."],"foto":"foto sugerida"}],"caption":"...","hashtags":["#..."],"palabra_comentar":"...","mejor_momento":"día y hora sugeridos"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.`,
  },

  historias: {
    id: "historias",
    titulo: "Historias para leads",
    descripcion: "Secuencia de 5–7 stories que termina en DM o WhatsApp.",
    placeholder: "Ej: Llenar cupos del puente festivo de noviembre",
    usaWeb: false,
    formato: "json",
    construirPrompt: (tema) => `Crea una secuencia de historias de Instagram para conseguir leads de Earth Park. Objetivo u oferta: ${tema || "reservas para la temporada de fin de año"}.

Reglas:
1. Entre 5 y 7 historias con este arco: gancho → problema/deseo → valor → prueba social → oferta → CTA.
2. La primera historia lleva encuesta o quiz; incluye una caja de preguntas para resolver objeciones; la captura es con "escribe PALABRA por DM" o sticker de enlace a WhatsApp.
3. Máximo 20 palabras por historia. Urgencia real (cupos de temporada), nunca falsa.
4. La prueba social no se inventa: usa [PEDIR A HUÉSPED] donde haga falta.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"palabraClave":"...","historias":[{"tipo":"gancho|problema|valor|prueba|oferta|cta","texto":"...","subtexto":"...","sticker":"encuesta|quiz|preguntas|enlace|ninguno — con el texto del sticker","foto":"foto sugerida"}],"respuesta_dm":"respuesta automática al DM","seguimientos":["mensaje de seguimiento 1","mensaje de seguimiento 2"],"destacada":"nombre de la historia destacada"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.`,
  },

  estrategia: {
    id: "estrategia",
    titulo: "Estrategia de marca",
    descripcion: "Referentes, gaps del mercado y contenidos top, con investigación web.",
    placeholder: "Ej: Enfócate en familias de Bogotá y en la temporada de diciembre",
    usaWeb: true,
    formato: "markdown",
    construirPrompt: (tema) => `Haz una estrategia de marca para Earth Park usando búsqueda web de los últimos 12 meses.${tema ? `\nEnfoque pedido: ${tema}` : ""}

Investiga: glampings y parques ecoturísticos de Boyacá, Cundinamarca y Colombia con buena presencia en redes; 2 o 3 referentes internacionales; tendencias de turismo de naturaleza y regenerativo; y contenidos virales del nicho.
No inventes cifras de seguidores ni vistas: si no puedes verificarlas, escribe "no verificado".

Entrega en Markdown con estos títulos (##):
## Resumen
## Referentes (5–8: qué hacen bien, formato estrella, debilidad, enlace)
## Gaps del mercado (3–5, con evidencia y cómo los aprovecha Earth Park)
## Contenidos top del nicho (6–10, cada uno con su versión Earth Park)
## Tendencias
## Posicionamiento (propuesta de valor, mensajes clave, tono, qué no hacer)
## Plan de 30 días
## Fuentes (lista de enlaces)`,
  },
};
