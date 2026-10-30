# Instagram (Lu)

Lu publica en **@earthpark.co** a través de la página de Facebook **Earth Park Macanal**, que está vinculada a la cuenta de Instagram.

## Cómo publica

1. Desde un carrusel o un video se toca **"Enviar a Lu"**. El archivo sube a Supabase (bucket `videos`) y la publicación queda en el plan como **lista** o **programada**.
2. El servidor (`servidor/worker.js`) revisa **cada 5 minutos** las publicaciones programadas y las sube a Instagram.
3. Al publicar, la publicación pasa a **publicada** con su enlace.

Límites:

- 100 publicaciones al día.
- Videos en MP4 de máximo 50 MB.
- Fotos en JPEG.

## Renovar el token (cada ~3 meses, próximo: finales de enero de 2027)

1. Entra a developers.facebook.com → **Herramientas → Explorador de la API Graph**.
2. Genera un token de usuario con los permisos `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` y `business_management`.
3. Amplíalo a larga duración con el **Depurador de tokens** → "Ampliar token de acceso".
4. En Cloudflare → Worker `earth-park-proxy` → **Settings → Variables and Secrets** → edita `FB_TOKEN` y pega el token nuevo.
5. En la Oficina IA, el estado de Lu debe decir "conectada".

> El token nunca se pega en el chat ni en el código.
