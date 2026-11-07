# Decisiones importantes

Registro corto del porqué de las cosas. Agrega las nuevas arriba.

- **2026-11 · TikTok como borrador, sin auditoría.** Lu manda cada pieza a la bandeja de TikTok y Oscar publica desde la app, eligiendo el sonido en tendencia. Así se evita la auditoría de TikTok, sin la cual todo lo publicado directo saldría privado.
- **2026-11 · La Oficina como videojuego.** Nivel, XP, monedas, racha y ruta de la semana se calculan del plan real (`contenido_plan`). No se pueden editar a mano. La racha cuenta **semanas** cumpliendo el plan: con 3 o 4 publicaciones por semana, una racha de días se rompería siempre. Las reglas están en `src/modulos/marketing/oficina/juego.js`. Las compras se guardan en la configuración de la oficina (`config_oficina` → `_juego`).
- **2026-10 · Estructura del proyecto.** Carpetas en español (`modulos`, `compartido`, `configuracion`, `servidor`, `base-de-datos`, `cerebro`). Se mantienen `src`, `public` y `tests` porque las herramientas las esperan.
- **2026-10 · Archivos privados fuera de GitHub.** El repositorio es público. Los documentos del negocio van en `privado/` (solo en el PC).
- **2026-10 · Estructura de video en 4 partes.** Gancho → intro (promesa) → desarrollo con bucle abierto → cierre que resuelve el bucle y da el siguiente paso. Está basada en reels de referencia que retienen bien.
- **2026-10 · Español de Colombia con "tú".** Se prohíbe el voseo en guiones y textos.
- **2026-10 · Videos de máximo ~45 MB.** Supabase gratis acepta archivos de hasta 50 MB. El exportador ajusta la calidad a la duración. Pendiente: evaluar Cloudflare R2 para más calidad.
- **2026-10 · Instagram con inicio de sesión de Facebook.** Se publica a través de la página de Facebook vinculada a @earthpark.co. El token dura unos 3 meses: renovarlo a finales de enero de 2027 (ver `docs/instagram.md`).
- **2026-10 · Nada se publica sin aprobación.** Oscar aprueba en la sala de reuniones antes de producir o publicar.
- **2026-10 · Avatares originales.** No se usan personajes ni marcas con derechos de autor.
- **Fotos reales para mostrar el parque.** Las imágenes IA solo se usan para ideas o conceptos, nunca para mostrar Earth Park.
