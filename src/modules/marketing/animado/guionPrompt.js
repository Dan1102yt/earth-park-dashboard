import { NOMBRES_ICONOS } from "./iconos";

export function promptGuion(tema, estilo = "bosque") {
  return `Crea el guion de un REEL ANIMADO EDUCATIVO para Earth Park (Instagram y TikTok, vertical 9:16) sobre: ${tema || "un tema educativo que tú elijas, que la gente quiera guardar y compartir"}.

ESTILO (como los explainers animados que se vuelven virales):
- Fondo oscuro, dibujos de línea fina que se dibujan solos, un solo color de acento. Nada de fotos.
- Cuenta una MINI HISTORIA con contraste: dos caminos, antes/después, mito/realidad, lo que crees/lo que pasa.
- Frases cortas en pantalla (máximo 14 palabras por escena), español colombiano natural, sin voz en off.
- Estructura: 1) gancho en los primeros 2 segundos (pregunta, contraste o dato que sorprende) → 2) problema → 3) giro → 4) lo que enseña (valor real, guardable) → 5) Earth Park aparece natural, no como anuncio → cierre con CTA de comentar una palabra.
- Entre 6 y 9 escenas, duración total entre 22 y 38 segundos. Cada escena dura entre 2.5 y 5 segundos.
- Marca entre *asteriscos* 1 a 3 palabras clave de cada frase (se pintan del color de acento).
- No inventes cifras: si das un dato, que sea de conocimiento general o de los planes de Earth Park.

LIENZO: 1080 de ancho × 1920 de alto. El texto de la escena ocupa arriba (y de 220 a 600) — NO pongas elementos ahí.
Los elementos van en la zona y de 700 a 1650, x de 120 a 960. x,y es el CENTRO del elemento. Deja aire: no los amontones.

ELEMENTOS disponibles (máximo 6 por escena):
- Íconos de línea: ${NOMBRES_ICONOS.join(", ")}. Campos: tam (alto en px, 120–420), etiqueta (texto corto debajo, opcional).
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
- efecto: "flotar" | "latir" | "girar" | "temblar".
- mover: {x, y, inicio, duracion} — se desplaza a otra posición (ej. una persona caminando hacia la cabaña).
- atenuar: segundo en que pasa a segundo plano (para enfocar otra cosa, como comparar dos opciones).
- salir: segundo en que desaparece.
- acento: true para pintarlo del color de acento (úsalo para lo importante, no para todo).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después y sin bloques de código:
{"titulo":"nombre corto del video","tema":"${estilo}","escenas":[{"duracion":3.5,"texto":"frase con *clave*","elementos":[{"tipo":"persona","x":330,"y":1150,"tam":300,"entrada":"dibujar","inicio":0.3,"etiqueta":"TÚ"}]}],"cta":{"palabra":"UNA PALABRA","texto":"frase final que invita a comentar"},"caption":"texto para publicar con el video","hashtags":["#..."],"musica":"tipo de música o audio en tendencia que le queda bien"}
Usa comillas simples dentro de los textos si necesitas citar algo; nunca comillas dobles dentro de los valores.`;
}
