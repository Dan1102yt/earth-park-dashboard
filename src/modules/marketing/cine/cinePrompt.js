import { NOMBRES_ICONOS } from "../animado/iconos";

const ESTILOS = {
  "3d": `MUNDO 3D: "estilo_visual" debe describir un mundo 3D estilizado y coherente. Ej: "stylized 3D isometric diorama,
  soft volumetric light, night scene with glowing lime-green accents, clean low-poly shapes, cinematic depth of field".`,
  "2d": `MUNDO 2D ILUSTRADO (motion graphics de alta gama): "estilo_visual" debe describir ilustración 2D plana y coherente.
  Ej: "premium 2D flat vector illustration, bold simple shapes, layered parallax depth, subtle paper grain texture,
  limited palette of deep greens and warm earth tones with lime-green highlights, clean hand-drawn line details,
  soft gradients, editorial explainer look". Los "movimiento" deben ser de animación 2D: capas en parallax, elementos que
  entran, giran o se transforman, partículas, líneas que se dibujan; nada de cámara 3D realista.
  En este modo usa MÁS dibujos encima: hasta 4 "datos" por escena, incluidos íconos de línea animados.`,
};

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
- "prompt" (en inglés, para "video" e "imagen"): describe la escena concreta: sujeto, lugar, composición, luz. Sin texto
  ni letreros legibles. El sujeto principal en el centro/abajo; arriba debe quedar espacio oscuro para los subtítulos.
- "movimiento" (en inglés, solo "video"): el movimiento de cámara y lo que se mueve. Ej: "slow drone descent toward the
  highway while car headlights stream past".
- "camara" (para "imagen" y "foto"): "acercar" | "alejar" | "paneo_izq" | "paneo_der" | "subir" | "bajar" | "orbita".
- "clima" (opcional): "lluvia" | "niebla" | "luciernagas" | "polvo" | "ninguno".
- "transicion" (opcional, desde la escena 2): "glitch" | "zoom".

DATOS ENCIMA (opcional, máximo ${dimension === "2d" ? 4 : 3} por escena) — "datos": coordenadas x,y de 0 a 1000 sobre la zona central del video:
- {"tipo":"etiqueta","texto":"30 m","x":700,"y":300,"apunta":{"x":500,"y":520},"inicio":0.8} — pastilla con línea guía.
- {"tipo":"contador","desde":0,"hasta":88,"sufijo":"%","x":500,"y":500,"tam":180,"inicio":0.5}
- Íconos de línea animados (se dibujan solos, con brillo): ${dimension === "2d" ? NOMBRES_ICONOS.join(", ") : "equis, check, flecha, pin, reloj, corazon"}.
  Ej: {"tipo":"check","x":500,"y":500,"tam":220,"inicio":1,"entrada":"pop"} (entrada: "dibujar" | "pop" | "aparecer"; efecto opcional: "flotar" | "latir").
- {"tipo":"linea","x":300,"y":400,"x2":300,"y2":800,"punteada":true,"etiqueta":"8 km","inicio":0.6}
Úsalos solo cuando refuercen lo que dice el narrador.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"titulo":"nombre corto","estilo_visual":"...","escenas":[{"narracion":"frase con *clave*","visual":{"modo":"video","prompt":"...","movimiento":"...","camara":"acercar","clima":"ninguno"},"transicion":"glitch","datos":[]}],"cta":{"palabra":"UNA PALABRA","texto":"frase corta en pantalla","narracion":"lo que dice el narrador al cierre"},"caption":"texto para publicar","hashtags":["#..."],"musica":"música de fondo sugerida (bajita, debajo de la voz)"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.`;
}
