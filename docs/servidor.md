# Servidor (Cloudflare Worker)

Archivo: `servidor/worker.js` · Worker: `earth-park-proxy`.

## Qué hace

| Ruta | Para qué |
|---|---|
| `/` (por defecto) | Habla con Claude (IA) sin exponer la clave |
| `/sheets/read`, `/sheets/write`, `/sheets/read-corprr` | Google Sheets |
| `/drive/list`, `/drive/image` | Carpetas y fotos de Google Drive |
| `/image/generate` | Imágenes con IA (Gemini) |
| `/visual/video` | Clips de video con IA |
| `/tts`, `/tts/voices` | Voz (ElevenLabs) |
| `/ig/estado`, `/ig/procesar`, `/ig/publicar-ahora` | Instagram (Lu). `/ig/estado` también da los seguidores para los indicadores de la Oficina |

Además tiene un **cron cada 5 minutos** (Settings → Triggers) que publica lo programado.

## Secretos (Settings → Variables and Secrets)

`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `FB_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY` y la cuenta de servicio de Google.

## Actualizarlo

1. Abre Cloudflare → Workers → `earth-park-proxy` → **Edit code**.
2. Reemplaza todo con el contenido de `servidor/worker.js`.
3. Toca **Deploy**.
