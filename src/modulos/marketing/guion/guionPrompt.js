// Convierte un guion pegado (tabla, texto suelto, Word…) en escenas que el panel entiende.
// La IA NO reescribe: copia la locución y el texto en pantalla tal cual.

export function promptOrdenarGuion(texto) {
  return `Te paso el guion de un video promocional de Earth Park (ecoturismo en Macanal, Boyacá). Puede venir como tabla copiada, con columnas pegadas o desordenado.

Tu trabajo es SOLO ordenarlo en escenas. No reescribas, no resumas, no inventes:
- "locucion": copia exactamente lo que dice el narrador en esa escena (sin comillas).
- "texto": copia exactamente el texto en pantalla de esa escena (con sus emojis).
- "toma": copia la descripción de la toma o imagen sugerida.
- "desde" / "hasta": los tiempos como "00:06". Si no vienen, repártelos según lo largo de cada locución (unas 2,6 palabras por segundo, mínimo 4 s).
- La última escena (logo, contacto, llamada a la acción) lleva "cierre": true.
- "cta": la llamada a la acción corta para el botón final (ej. "Reserva tu cupo"). Si no hay, usa "Reserva tu cupo".
- "musica_sugerida": lo que diga el guion sobre la música, o "".
- Si algo viene en voseo, pásalo a "tú" (español de Colombia).

Responde SOLO con este JSON:
{"titulo":"nombre corto del video","cta":"...","musica_sugerida":"...","escenas":[{"desde":"00:00","hasta":"00:06","toma":"...","locucion":"...","texto":"...","cierre":false}]}

GUION:
${texto}`;
}
