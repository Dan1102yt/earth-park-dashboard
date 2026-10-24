import { NOMBRES_ICONOS } from "./iconos";

export function promptGuion(tema, estilo = "bosque") {
  return `Crea el guion de un REEL ANIMADO EDUCATIVO para Earth Park (Instagram y TikTok, vertical 9:16) sobre: ${tema || "un tema educativo que tú elijas, que la gente quiera guardar y compartir"}.

ESTILO (como los explainers animados que se vuelven virales):
- Fondo oscuro, dibujos de línea fina que se dibujan solos, un solo color de acento. Nada de fotos.
- Cuenta una MINI HISTORIA con contraste: dos caminos, antes/después, mito/realidad, lo que crees/lo que pasa.
- Cada escena tiene DOS textos:
  · "texto": el titular en pantalla, MUY corto (máximo 8 palabras), con fuerza.
  · "narracion": lo que dice el narrador en esa escena (entre 10 y 26 palabras), en español colombiano natural y hablado,
    cálido, como un buen storyteller de YouTube. Debe sonar bien leído en voz alta: frases cortas, sin listas ni símbolos,
    números escritos como se dicen. La narración amplía el titular, no lo repite palabra por palabra.
- Estructura: 1) gancho en los primeros 2 segundos (pregunta, contraste o dato que sorprende) → 2) problema → 3) giro → 4) lo que enseña (valor real, guardable) → 5) Earth Park aparece natural, no como anuncio → cierre con CTA de comentar una palabra.
- Entre 6 y 9 escenas, duración total entre 25 y 45 segundos (la duración real la marca la voz).
- Dinamismo: en cada escena algo se mueve o cambia (un elemento que se desplaza con mover, un contador que sube,
  una opción que se atenúa para enfocar otra, elementos que entran escalonados). Evita escenas con un solo ícono quieto.
- Marca entre *asteriscos* 1 a 3 palabras clave de cada frase (se pintan del color de acento).
- No inventes cifras: si das un dato, que sea de conocimiento general o de los planes de Earth Park.

LIENZO: piensa la composición en una zona de 1000 × 1000 (x de 0 a 1000, y de 0 a 1000); x,y es el CENTRO del elemento.
El sistema la escala automáticamente para llenar el centro del video, así que importa la composición relativa:
qué va a la izquierda/derecha, arriba/abajo, y el tamaño de cada cosa frente a las demás. Usa elementos GRANDES
(íconos de 250 a 500) y pocos por escena (2 a 4). El titular y los subtítulos los pone el sistema: no los dibujes.

ELEMENTOS disponibles (máximo 6 por escena):
- Íconos de línea: ${NOMBRES_ICONOS.join(", ")}. Campos: tam (250–500), etiqueta (texto corto debajo, opcional).
- "texto": {texto, tam (40–140)} — palabra o cifra grande dentro de la zona de elementos.
- "contador": {desde, hasta, prefijo, sufijo, etiqueta, tam} — número que sube.
- "barras": {valores:[...], etiquetas:[...], ancho, alto, destacar (índice)} — gráfica simple.
- "puntos": {total, activos, columnas} — fila/grilla de círculos que se llenan (progreso, sellos, cupos).
- "caja": {ancho, alto, etiqueta} — recuadro con un nombre adentro (ej. 'CIUDAD', 'EARTH PARK').
- "linea": {x2, y2, punteada, etiqueta} — línea que se traza de (x,y) a (x2,y2) (rutas, divisiones, conexiones).
- "custom": {trazos:["d SVG", ...]} — SOLO si ningún ícono sirve: dibujo simple de línea en una caja de 100×100 (máx 6 trazos).

ANIMACIÓN de cada elemento (todos opcionales):
- inicio: segundo (dentro de la escena) en que aparece. Escalónalos: 0.3, 0.8, 1.3...
- entrada: "dibujar" (se traza solo, ideal para íconos) | "aparecer" | "pop" | "deslizar" | "deslizar_izq" | "deslizar_der".
- efecto: "flotar" | "latir" | "girar" | "temblar" (si no pones nada, el elemento "respira" suave).
- mover: {x, y, inicio, duracion} — se desplaza a otra posición (ej. una persona caminando hacia la cabaña).
- atenuar: segundo en que pasa a segundo plano (para enfocar otra cosa, como comparar dos opciones).
- salir: segundo en que desaparece.
- acento: true para pintarlo del color de acento (úsalo para lo importante, no para todo).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"titulo":"nombre corto del video","tema":"${estilo}","escenas":[{"texto":"titular con *clave*","narracion":"lo que dice el narrador en esta escena","duracion":3.5,"elementos":[{"tipo":"persona","x":300,"y":500,"tam":420,"entrada":"dibujar","inicio":0.3,"etiqueta":"TÚ"}]}],"cta":{"palabra":"UNA PALABRA","texto":"frase final corta que invita a comentar","narracion":"lo que dice el narrador al cierre, invitando a comentar la palabra"},"caption":"texto para publicar con el video","hashtags":["#..."],"musica":"tipo de música de fondo que le queda bien (bajita, debajo de la voz)"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.`;
}
