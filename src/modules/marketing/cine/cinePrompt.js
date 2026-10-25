import { NOMBRES_ICONOS } from "../animado/iconos";

const ESTILOS = {
  "3d": `MUNDO 3D ESTILIZADO (NO fotografía realista): render 3D de animación de alta gama, como los reels de referencia.
  "estilo_visual" debe describir un mundo CG coherente y llamativo. Ej: "high-end stylized 3D animation render,
  feature-film CG look, clean sculpted shapes with subtle detail, vibrant saturated colors, dramatic rim light and
  volumetric god rays, glowing lime-green and teal accents, miniature diorama feel with tilt-shift depth, crisp and readable".
  Evita la estética de foto macro con bokeh: debe verse como animación 3D, no como foto.`,
  "2d": `MUNDO 2D ILUSTRADO (motion graphics de alta gama): "estilo_visual" debe describir ilustración 2D plana y coherente.
  Ej: "premium 2D flat vector illustration, bold simple shapes, layered parallax depth, subtle paper grain texture,
  limited palette of deep greens and warm earth tones with lime-green highlights, clean hand-drawn line details,
  soft gradients, editorial explainer look". Los "movimiento" deben ser de animación 2D: capas en parallax, elementos que
  entran, giran o se transforman, partículas, líneas que se dibujan; nada de cámara 3D realista.
  En este modo usa MÁS dibujos encima: hasta 4 "datos" por escena, incluidos íconos de línea animados.`,
  doc: `DOCUMENTAL CINEMATOGRÁFICO PINTADO (como los reels de divulgación de wil_lab): "estilo_visual" describe UNA dirección de
  arte de ilustración pintada y cinematográfica, igual en todas las escenas. Ej: "cinematic painterly illustration, like a frame
  from an award-winning animated nature documentary, textured gouache and digital brushwork, visible paper and film grain,
  simplified elegant shapes, strong silhouettes, moody atmospheric light, limited muted palette with one vivid accent color".
  Nada de fotografía ni de 3D plástico: debe parecer una pintura animada.`,
};

// Reglas propias del modo documental: muchos planos cortos, la imagen cuenta la historia sola (sin datos encima)
function reglasDoc(maxVideo) {
  return `
FORMATO DOCUMENTAL (manda sobre lo anterior si hay conflicto):
- Entre 12 y 18 escenas = PLANOS cortos. Cada "narracion" de 6 a 12 palabras (≈ 2,5 a 4 segundos). Un plano por idea:
  cuando la frase cambia de sujeto, cambia el plano. 35 a 60 segundos en total.
- La IMAGEN cuenta la historia sin textos: cada plano muestra literalmente lo que dice su frase (si dice "ven el mundo
  en azul y amarillo", el plano se ve en azul y amarillo). Usa metáforas visuales fuertes, siluetas y contraste.
- "datos" SIEMPRE vacío ([]). Nada de etiquetas, flechas ni contadores: en pantalla solo va una palabra a la vez.
- Continuidad: si dos planos seguidos muestran el mismo sujeto, repite su descripción física exacta en ambos "prompt"
  y cambia solo el plano o la acción (como un documental que corta entre ángulos).
- "transicion": "corte" en todas (corte seco al ritmo de la voz). "clima" solo si suma atmósfera.
- "video" en las ${maxVideo} escenas con más movimiento (vuelo, salto, eclosión, lluvia…); el resto "imagen" con cámara lenta.
- Tono de narrador de documental: pausado, asombro, frases que enganchan ("Pero aquí viene lo increíble…").`;
}

export function promptCine(tema, { categorias = [], maxVideo = 3, dimension = "3d" } = {}) {
  return `Crea el guion de un REEL EXPLICATIVO CINEMATOGRÁFICO para Earth Park (Instagram y TikTok, vertical 9:16) sobre: ${tema || "un tema educativo que tú elijas, que la gente quiera guardar y compartir"}.

REFERENCIA DE ESTILO: los reels tipo "nunca te lo explicaron": un mundo visual 3D estilizado y coherente, cámara siempre en
movimiento, narrador que cuenta una curiosidad paso a paso, subtítulos que aparecen al ritmo de la voz con palabras clave
resaltadas, datos que aparecen encima de la imagen (etiquetas, distancias, contadores) y transiciones rápidas.

HISTORIA:
- Gancho en la primera frase (pregunta o dato que sorprende) → explicación paso a paso con un giro → lo que aprende el
  espectador (valor real, guardable) → Earth Park aparece de forma natural, no como anuncio → cierre invitando a comentar.
- Entre 6 y 9 escenas, 25 a 45 segundos en total (la duración real la marca la voz).
- "narracion" de cada escena: 10 a 24 palabras, español colombiano hablado y cálido, frases cortas, números escritos como
  se dicen. Marca entre *asteriscos* 1 o 2 palabras clave por escena (salen resaltadas en los subtítulos).
- No inventes cifras ni datos. Si no estás seguro de un dato, no lo uses.

VISUALES — cada escena tiene "visual":
- "estilo_visual" (uno para todo el video, en inglés). ${ESTILOS[dimension] || ESTILOS["3d"]}
  Si el tema es de naturaleza o del Valle de Tenza, un mundo natural estilizado (montañas, embalse, bosque) le queda bien.
- "modo":
  · "video": la escena se anima con IA (cuesta más). Úsalo SOLO en las ${maxVideo} escenas más importantes
    (siempre la primera, el gancho; y los momentos de mayor impacto o movimiento).
  · "imagen": imagen IA con movimiento de cámara (barata). Para el resto de escenas.
  · "foto": foto REAL de Earth Park. OBLIGATORIO cuando la escena muestra el parque, sus cabañas, su comida, su embalse o
    sus actividades (nunca muestres Earth Park con imágenes inventadas). ${categorias.length ? `Pon en "categoria_foto" uno de: ${categorias.join(" | ")}.` : ""}
- "prompt" (en inglés, para "video" e "imagen"): describe la escena concreta con PRECISIÓN: el sujeto GRANDE y
  protagonista (que ocupe buena parte del cuadro), su aspecto físico EXACTO según los datos de la narración (formas,
  colores, marcas, tamaño relativo), el entorno lleno de detalle y la luz. Sin texto ni letreros. Prohibido el fondo vacío.
- "plano" (para "video" e "imagen"): "macro" | "primer_plano" | "cenital" | "contrapicado" | "isometrico" | "general" |
  "seguimiento". VARÍA el plano: nunca el mismo en dos escenas seguidas, como un documental bien editado.
- "protagonista" (true/false): true SOLO si la escena muestra exactamente lo que se ve en las fotos reales de referencia
  (normalmente el sujeto en su forma final, ej. la mariposa adulta). En escenas de otra etapa o de otro sujeto (huevo,
  oruga, crisálida, planta, paisaje) pon false: si no, la IA dibujaría el sujeto equivocado.
- COHERENCIA IMAGEN–NARRACIÓN (obligatorio): el "prompt" de cada escena muestra SOLO lo que dice la narración en ese
  momento. Si la narración habla del huevo, se ve el huevo (no la oruga ni la mariposa); si habla de la oruga, se ve la
  oruga; nunca adelantes etapas que todavía no se han contado. Un solo protagonista claro por escena.
- "movimiento" (en inglés, solo "video"): el movimiento de cámara y lo que se mueve. Ej: "slow drone descent toward the
  highway while car headlights stream past".
- "camara" (para "imagen" y "foto"): "acercar" | "alejar" | "paneo_izq" | "paneo_der" | "subir" | "bajar" | "orbita".
- "clima" (opcional): "lluvia" | "niebla" | "luciernagas" | "polvo" | "ninguno".
- "transicion" (opcional, desde la escena 2): "glitch" | "zoom" | "corte".

DATOS ENCIMA (opcional, máximo ${dimension === "2d" ? 4 : 3} por escena) — "datos": coordenadas x,y de 0 a 1000 sobre la zona central del video:
- {"tipo":"etiqueta","texto":"88","senala":"el dibujo del número 88 en la cara inferior del ala trasera","inicio":0.8}
  — pastilla con línea guía. "senala" describe con precisión QUÉ parte de la imagen señala: el sistema revisa la imagen y
  ubica ese punto exacto (si no aparece, la etiqueta no se muestra). Úsala solo para cosas que la imagen sí debe mostrar.
- {"tipo":"contador","desde":0,"hasta":88,"sufijo":"%","x":500,"y":500,"tam":180,"inicio":0.5}
- Íconos de línea animados (se dibujan solos, con brillo): ${dimension === "2d" ? NOMBRES_ICONOS.join(", ") : "equis, check, flecha, pin, reloj, corazon"}.
  Ej: {"tipo":"check","x":500,"y":500,"tam":220,"inicio":1,"entrada":"pop"} (entrada: "dibujar" | "pop" | "aparecer"; efecto opcional: "flotar" | "latir").
- {"tipo":"linea","x":300,"y":400,"x2":300,"y2":800,"punteada":true,"etiqueta":"8 km","inicio":0.6}
Úsalos solo cuando refuercen lo que dice el narrador, y con las MISMAS cifras que dice la narración.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"titulo":"nombre corto","estilo_visual":"...","escenas":[{"narracion":"frase con *clave*","visual":{"modo":"video","plano":"macro","protagonista":true,"prompt":"...","movimiento":"...","camara":"acercar","clima":"ninguno"},"transicion":"glitch","datos":[]}],"cta":{"palabra":"UNA PALABRA","texto":"frase corta en pantalla","narracion":"lo que dice el narrador al cierre"},"caption":"texto para publicar","hashtags":["#..."],"musica":"música de fondo sugerida (bajita, debajo de la voz)"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.${dimension === "doc" ? reglasDoc(maxVideo) : ""}`;
}
