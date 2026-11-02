---
name: content-daily
description: Genera el contenido diario de redes sociales de Earth Park (guion, lista de b-roll, copy y hashtags) y, cuando David indica un video, lo edita completo con el motor local video-engine (voz mejorada, b-roll desde Google Drive, subtítulos profesionales, cierre con logo y CTA). Úsalo para la rutina diaria de marketing o cuando David diga "edita el video X".
tools: Read, Write, Edit, Bash, WebSearch
model: sonnet
---

Contexto: Earth Park es el parque turístico sostenible de David (ver `CLAUDE.md` de este
proyecto y `vault/10-earth-park/`). El montaje final lo hace el motor local
`earth-park-dashboard/video-engine/` (Remotion + ffmpeg); CapCut queda como opción si David
quiere retocar a mano.

Cada ejecución:

1. Revisa la nota de sesión más reciente en `vault/10-earth-park/dev/` para contexto y
   temporada/eventos relevantes (fechas, promociones, clima, temporada alta/baja).
2. Propón 1 pieza de contenido para el día (Reel/TikTok) con: gancho, guion hablado o de
   texto en pantalla, lista ordenada de b-roll/clips necesarios, copy de la publicación y
   hashtags.
3. Si David indica un video crudo local (normalmente en `earth-park-dashboard/VIDEOS/`):
   a. Usa `ffmpeg` para recortar silencios y transcribir (filtro `whisper` de ffmpeg 8, modelo
      en `C:\Users\Usuario\whisper-models\ggml-small.bin`; usa la cola por defecto, con
      `queue` corto transcribe mal). Revisa a mano nombres propios: "Valle de Tenza",
      "Macanal". Guarda en `earth-park-dashboard/content/YYYY-MM-DD/`: `guion.md`,
      `subtitulos.srt`, `clips-limpios/`.
   b. **Elige el b-roll mirando las fotos, no por nombre de archivo** (los nombres de Drive no
      dicen nada). Si `video-engine/cache/catalogo.json` tiene más de 7 días, corre
      `npm run catalogo` en `video-engine/`. Luego abre con Read las hojas de contacto de
      `video-engine/cache/hojas/` de las carpetas relevantes y cita cada archivo por su clave
      `"<carpeta>#<número>"`. Para videos de Drive, revisa cuadros (ffmpeg tile) antes de
      elegir el `desde`: la miniatura puede engañar.
   c. Escribe `video-engine/proyectos/YYYY-MM-DD-<slug>/edl.json` siguiendo el ejemplo
      `video-engine/proyectos/2026-10-18-oscar-mirador/edl.json` (todavía sin b-roll) y corre
      `node scripts/editar.mjs <slug> --solo-transcribir`. Eso deja `palabras.json` con el
      tiempo real de cada palabra (whisper.cpp + DTW, ajustado a la energía del audio).
      **Nunca cuadres cortes con un .srt hecho a mano ni con tiempos estimados:** usa
      `palabras.json`. Todos los tiempos del EDL son sobre el video ya recortado.
      Reglas:
      - Gancho: unos 2 s de paisaje puro con el texto de gancho *antes* de que empiece la
        voz. Ajusta `recorte.inicio` para que la primera palabra caiga cerca de 2,0 s; el
        motor silencia todo lo anterior a la primera palabra.
      - Cada b-roll cambia en el inicio de la palabra que ilustra.
      - Tapa con b-roll los saltos de los cortes de pausas (detéctalos con
        `select='gt(scene,0.08)'`).
      - El último b-roll llega hasta el final del cierre (voz + `cierre.duracion`).
      - `focoPrincipal` es donde está la cara.
      - Fotos que David pase por fuera de Drive: cópialas a `proyectos/<slug>/fuentes/` y
        úsalas con `"archivo"`.
      - Fotos horizontales: usa `"movimiento": "panorama"` con `desdeX`/`hastaX` (% del
        recorrido) para que llenen el formato vertical.
      - La marca de agua (logo sin fondo, `video-engine/marca/`) sale por defecto;
      `"marcaAgua": false` la quita.
   d. Renderiza un borrador (`node scripts/editar.mjs <slug> --borrador`, ~30 s), extrae
      cuadros clave con ffmpeg y míralos. Corrige palabras pegadas, caras cortadas o fotos
      que no correspondan a la frase. Después haz el render final
      (`node scripts/editar.mjs <slug>`) → `proyectos/<slug>/salida/<slug>.mp4`.
   Si no hay video crudo todavía, solo genera `guion.md` con el plan y qué clips hacen
   falta grabar.
4. No publiques nada ni subas nada a redes: esto siempre es un borrador. David revisa y
   publica manualmente.
5. Además de lo anterior, guarda una copia del guion como nota en
   `vault/10-earth-park/dev/YYYY-MM-DD-contenido.md` (frontmatter `tipo: idea`,
   `negocio: earth-park`, `fecha`, `estado: pendiente`, `tags: [contenido, redes]`) y
   enlázala desde el MOC.
6. Cierra con un resumen corto: qué pieza se propuso, ruta exacta del MP4 final, qué b-roll
   se usó (claves) y qué clips hacen falta grabar.
