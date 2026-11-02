# Subir videos desde el celular o el PC (Editar mis videos)

El editor toma el video de una carpeta dentro de **CONTENIDO** en Google Drive. Con este botón la app crea la carpeta y sube el video por ti, aunque pese mucho (sube por partes).

Para que funcione, la app necesita un permiso de Google. Se configura **una sola vez** (unos 10 minutos):

1. Entra a console.cloud.google.com con tu cuenta y elige el **mismo proyecto** donde está la cuenta de servicio de Earth Park.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - tipo **Externo**;
   - nombre "Earth Park Panel";
   - tu correo como soporte;
   - en **Usuarios de prueba**, agrega los correos que van a subir videos (el tuyo y el de quien más use el panel).
3. **APIs y servicios → Biblioteca**: busca **Google Drive API** y actívala, si no lo está.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - tipo **Aplicación web**;
   - en **Orígenes de JavaScript autorizados** agrega `https://dan1102yt.github.io` y `http://localhost:5173`;
   - crea y copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). No es secreto, pero tampoco hace falta pegarlo en el chat.
5. En GitHub → el repositorio → **Settings → Secrets and variables → Actions → New repository secret**:
   - nombre `VITE_GOOGLE_CLIENT_ID`;
   - valor: el ID de cliente.
6. Haz cualquier `git push`, o vuelve a correr el último despliegue en **Actions**.

La primera vez que subas un video, Google muestra "Google no ha verificado esta app". Es normal porque la app es tuya: toca **Avanzado → Ir a Earth Park Panel** y acepta.

Usa la cuenta de Google **dueña de la carpeta CONTENIDO**, o una que tenga permiso de editor en ella.
