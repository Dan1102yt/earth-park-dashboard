# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio. La explicación para humanos está en `README.md` (Léeme).

## Antes de tocar marketing o agentes de IA

Lee `cerebro/`. Ahí está el conocimiento central: `marca.md`, `ganchos.md`, `estructura-video.md`, `agentes.md` y `decisiones.md`. Los prompts los importan con `@cerebro/<archivo>.md?raw` (alias definido en `vite.config.js`). No dupliques ese texto dentro del código: edítalo en `cerebro/`.

## Comandos

```bash
npm run dev      # servidor local (Vite)
npm run build    # compila a dist/
npm test         # pruebas (Vitest)
```

Deploy: push a `main` → GitHub Actions (`.github/workflows/deploy.yml`) publica en GitHub Pages (`base: "/earth-park-dashboard/"`, HashRouter).

## Estructura

- `src/modulos/<area>/`: reservas, cocina, hospedaje, financiero, asistente, marketing (oficina, agente, cine, animado, editor, galeria, comun).
- `src/compartido/`: componentes, contexto (Auth y Reservas), servicios (Drive), lib (Supabase), hooks (Sheets), utilidades (cálculos puros con pruebas en `tests/`).
- `src/configuracion/`: precios, planes (`planesConfig.js`), menú, costos. Fuente única de precios.
- `servidor/worker.js`: Cloudflare Worker (proxy de Claude, Gemini, ElevenLabs, Drive/Sheets, Instagram y cron cada 5 min). Se despliega a mano en Cloudflare.
- `base-de-datos/NN_*.sql`: tablas de Supabase en orden de creación.
- `docs/`: guías (Instagram, servidor, base de datos).

## Reglas

- Textos de la app y de los agentes en español de Colombia con "tú" (sin voseo).
- El repo es público: nunca subas claves, tokens ni archivos del negocio. Los secretos van en Cloudflare o en GitHub Secrets. Los documentos van en `privado/` (ignorado).
- En celular, los inputs llevan 16 px (evita el zoom) y los modales usan portal a pantalla completa.
- Nada se publica en Instagram sin aprobación (flujo de estados en `cerebro/agentes.md`).
