# TikTok (Lu)

Lu manda cada publicación como **borrador a la bandeja de TikTok** de Earth Park. Te llega una notificación en la app de TikTok y tú:
1. le pones un sonido en tendencia;
2. pegas el texto (en el panel, el botón "En tu bandeja · copiar texto" lo copia);
3. publicas.

TikTok solo deja publicar directo y en público a las apps que pasaron su auditoría. Por eso usamos la bandeja: no la necesita, y además te deja elegir la música.

**Cuándo se manda:**
- Sola, cuando Lu publica en Instagram (si TikTok está conectado).
- A mano, con el botón **🎵 A TikTok** en "Plan aprobado", en cualquier publicación lista, programada o publicada.

## Configuración (una sola vez)

### 1. App en TikTok for Developers
1. Entra a developers.tiktok.com con la cuenta de TikTok de Earth Park → **Manage apps → Connect an app**.
2. Llena los datos:
   - Nombre "Earth Park Panel", ícono (el logo) y categoría.
   - **Terms of Service URL**: `https://dan1102yt.github.io/earth-park-dashboard/terminos.html`
   - **Privacy Policy URL**: `https://dan1102yt.github.io/earth-park-dashboard/privacidad.html`
   - Plataforma: **Web**, con la URL `https://dan1102yt.github.io/earth-park-dashboard/`
3. **Add products**:
   - **Login Kit**, con este Redirect URI: `https://earth-park-proxy.davidroa1102.workers.dev/tiktok/callback`
   - **Content Posting API**. No hace falta activar "Direct Post".
4. **Scopes**: `user.info.basic` y `video.upload`.
5. Copia el **Client key** y el **Client secret**. Van en Cloudflare (paso 2); nunca en el chat ni en el código.
6. Para usarla de una vez: en **Sandbox**, agrega la cuenta de TikTok de Earth Park como *target user*. Para dejarla en producción, toca **Submit for review**; esa revisión es de la app, no la auditoría de publicación directa.

### 2. Cloudflare (Worker earth-park-proxy)
1. **Storage & Databases → KV → Create namespace**, con el nombre `earth-park`.
2. Worker → **Settings → Bindings → Add → KV namespace**: variable `EP_KV`, namespace `earth-park`.
3. Worker → **Settings → Variables and Secrets**: agrega `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET`, los dos de tipo Secret.
4. Pega la versión nueva de `servidor/worker.js` y toca **Deploy**.

### 3. Supabase
Corre `base-de-datos/07_contenido_plan_tiktok.sql` en el SQL Editor.

### 4. Conectar
En la Oficina IA, toca **Conectar TikTok**, entra con la cuenta de Earth Park y acepta.

### 5. Carruseles (fotos), opcional
Para las fotos, TikTok pide verificar desde dónde las descarga.
1. En la app de TikTok for Developers → **URL properties → Verify → URL prefix**: `https://earth-park-proxy.davidroa1102.workers.dev/tiktok/foto/`
2. TikTok te da un archivo de verificación. En Cloudflare agrega dos variables:
   - `TIKTOK_VERIF_ARCHIVO`: el nombre exacto del archivo;
   - `TIKTOK_VERIF_CONTENIDO`: su contenido.
3. Toca Deploy y luego **Verify** en TikTok.

Los videos (reels) no necesitan este paso.
