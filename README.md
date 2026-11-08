# Léeme — Panel de Earth Park

Panel interno de **Earth Park** (eco-glamping en Macanal, Boyacá). Sirve para manejar reservas, cocina, hospedaje y finanzas, y tiene un equipo de agentes de IA que hace el marketing: carruseles, videos, plan semanal y publicación en Instagram.

- **App en vivo:** https://dan1102yt.github.io/earth-park-dashboard/
- **Este archivo** explica cómo está organizado el proyecto, para que una persona o una IA pueda entenderlo sin que nadie se lo explique.

---

## Mapa de carpetas

```
earth-park-dashboard/
├─ README.md            ← este archivo (Léeme)
├─ CLAUDE.md            ← instrucciones técnicas para la IA que programa (Claude Code)
├─ cerebro/             ← EL CEREBRO: conocimiento central del proyecto (marca, agentes, reglas)
├─ src/                 ← la app (código fuente)
│  ├─ modulos/          ← una carpeta por área del negocio
│  ├─ compartido/       ← piezas que usan varios módulos
│  └─ configuracion/    ← precios, planes, menú y costos
├─ servidor/            ← el servidor en Cloudflare (Worker)
├─ base-de-datos/       ← tablas de Supabase, numeradas en el orden en que se crearon
├─ docs/                ← guías paso a paso
├─ public/              ← íconos, logo, fotos de las cotizaciones (cotizacion/) y archivos que se publican tal cual
└─ tests/               ← pruebas automáticas
```

### ¿Por qué algunas carpetas están en inglés?

`src`, `public` y `tests` son nombres que las herramientas esperan por convención (Vite, que construye la app, y Vitest, que corre las pruebas). Por eso no conviene cambiarlos.

- **`src`** viene de *source*, "código fuente": todo el código de la app vive ahí.
- **`public`** son archivos que se copian tal cual a la página publicada (íconos, logo).
- **`tests`** son las pruebas que revisan que los cálculos no se dañen.

Lo demás está en español.

---

## `cerebro/` — el conocimiento central

Todo lo que los agentes de IA "saben" de Earth Park está en una sola carpeta. **Si cambias algo ahí, lo aplican todos los agentes** (carruseles, videos, plan semanal, investigador).

| Archivo | Qué contiene | ¿Lo leen los agentes? |
|---|---|---|
| `marca.md` | Quiénes somos, historia, audiencia, tono, reglas (no inventar cifras, etc.) | Sí, todos |
| `ganchos.md` | Cómo escribir ganchos profesionales (la primera frase) | Sí |
| `estructura-video.md` | Las 4 partes de un video: gancho, intro, desarrollo con bucle y cierre | Sí (Videos cine IA) |
| `ivan.md` | Perfil experto de Iván (ecoturismo, Valle de Tenza, solo reservas) | Sí (Iván) |
| `competencia.md` | Cuentas de competencia y referentes que Iván sigue | Sí (Iván) |
| `agentes.md` | Quién es cada agente de la Oficina IA y qué hace | Documentación |
| `decisiones.md` | Por qué se hizo cada cosa importante | Documentación |

Los planes y precios **no** se escriben en `marca.md`. Salen solos de `src/configuracion/planesConfig.js`, para que nunca queden dos precios distintos.

---

## `src/modulos/` — las áreas del negocio

| Carpeta | Pantalla | Para qué |
|---|---|---|
| `reservas/` | Nueva reserva, Reservas | Crear y gestionar reservas |
| `cocina/` | Cocina | Lista de compras y menú según las reservas |
| `hospedaje/` | Hospedaje | Ocupación de las cabañas |
| `financiero/` | Financiero, Informe, Devoluciones | Ingresos, egresos, márgenes, informe mensual |
| `comercial/` | Cotizaciones, Precios | Catálogo de precios y costos, planes, descuentos y propuestas en PDF para el cliente |
| `asistente/` | Asistente | Chat con IA sobre el negocio |
| `marketing/` | Marketing | Todo el marketing con IA (ver abajo) |

### `src/modulos/marketing/`

| Carpeta | Qué hace |
|---|---|
| `oficina/` | La **Oficina IA**: los 6 agentes, plan semanal, sala de reuniones, aprobación y publicación en Instagram (Lu) |
| `agente/` | Agente de contenido: carruseles, historias, estrategia. Aquí están las fotos de Drive para carruseles |
| `cine/` | **Videos cine IA**: guion, imágenes/clips, voz, transiciones y exportación |
| `animado/` | Videos animados con íconos, voz y efectos de sonido |
| `editor/` | Pedidos de edición de video |
| `galeria/` | Qué fotos de Drive salen en la página web pública |
| `cavipetrol/` | Piezas para Cavipetrol (CaviAliados): historias, posts y banner web con su plantilla y lineamientos |
| `comun/` | Piezas que comparten: selector y explorador de fotos de Drive |

### `src/compartido/`

| Carpeta | Qué hay |
|---|---|
| `componentes/` | Botones, tarjetas, menú de navegación, inicio de sesión |
| `contexto/` | Estado global (reservas, egresos, sesión) |
| `servicios/` | Conexión con Google Drive |
| `lib/` | Conexión con Supabase |
| `hooks/` | Sincronización con Google Sheets |
| `utilidades/` | Cálculos: insumos, hospedaje, validaciones, formato de pesos |

---

## Cómo funciona por dentro

```
Celular / PC  ──►  App (GitHub Pages)
                     │
                     ├──►  servidor/worker.js (Cloudflare)  ──►  Claude (IA), Gemini (imágenes/video),
                     │                                            ElevenLabs (voz), Google Drive/Sheets,
                     │                                            Instagram (publicar)
                     └──►  Supabase  (base de datos y archivos: plan de contenido, videos, historial)
```

- Las **claves secretas** (API keys, tokens) viven **solo** en Cloudflare y en GitHub (Settings → Secrets). Nunca van en el código.
- El **Worker** revisa cada 5 minutos si hay publicaciones programadas y las sube a Instagram.

---

## Tareas comunes

| Quiero… | Cómo |
|---|---|
| Ver la app en mi PC | `npm install` y luego `npm run dev` |
| Publicar cambios | `git add -A`, `git commit -m "..."`, `git push` → GitHub la publica sola en ~2 minutos |
| Correr las pruebas | `npm test` |
| Cambiar el tono o las reglas de los agentes | Editar `cerebro/marca.md` |
| Cambiar precios de cotizaciones | Pantalla **Precios** del panel (se guarda en Supabase) |
| Cambiar precios o planes de reservas | Editar `src/configuracion/planesConfig.js` |
| Crear una tabla nueva en Supabase | Agregar `base-de-datos/09_nombre.sql` y correrlo en Supabase → SQL Editor |
| Actualizar el servidor | Copiar `servidor/worker.js` en Cloudflare → Worker → Edit code → Deploy |

Guías detalladas en `docs/`.

---

## Archivos privados

Este repositorio es **público**. Los documentos del negocio (CSV financieros, diagnóstico, plantilla, plan de 90 días) van en la carpeta `privado/`. Esa carpeta solo existe en el PC y **nunca se sube** (está en `.gitignore`).
