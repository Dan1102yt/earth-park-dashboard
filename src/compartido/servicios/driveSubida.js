// Subir archivos desde el celular o el PC a Google Drive con la cuenta de Google de quien usa el panel.
// (La cuenta de servicio del servidor no tiene espacio propio en Drive, por eso se sube con tu sesión.)
// Requiere VITE_GOOGLE_CLIENT_ID (ver docs/subir-videos.md).

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALCANCE = "https://www.googleapis.com/auth/drive";
const TROZO = 8 * 1024 * 1024; // múltiplo de 256 KB, como pide Google

export const subidaDisponible = () => !!CLIENT_ID;

let token = null; // { valor, vence }

function cargarGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("No se pudo cargar el inicio de sesión de Google"));
    document.head.appendChild(s);
  });
}

/** Pide permiso a Google (la primera vez abre una ventana para elegir la cuenta). */
export async function sesionGoogle() {
  if (!CLIENT_ID) throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID (ver docs/subir-videos.md)");
  if (token && token.vence > Date.now() + 60_000) return token.valor;
  await cargarGoogle();
  return new Promise((res, rej) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ALCANCE,
      callback: (r) => {
        if (r.error) { rej(new Error(`Google: ${r.error_description || r.error}`)); return; }
        token = { valor: r.access_token, vence: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
        res(token.valor);
      },
      error_callback: (e) => rej(new Error(e?.type === "popup_closed" ? "Cerraste la ventana de Google" : "Google no dio permiso")),
    });
    cliente.requestAccessToken({ prompt: token ? "" : "consent" });
  });
}

async function api(url, opciones = {}) {
  const t = await sesionGoogle();
  const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${t}`, ...(opciones.headers || {}) } });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error?.message || `Google Drive respondió ${r.status}`);
  }
  return r;
}

/** Crea una carpeta dentro de otra → { id, nombre } */
export async function crearCarpeta(nombre, padreId) {
  const r = await api("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nombre, mimeType: "application/vnd.google-apps.folder", parents: [padreId] }),
  });
  const d = await r.json();
  return { id: d.id, nombre: d.name };
}

/** Sube un archivo (aunque pese mucho: va por partes). onProgreso(0–1) */
export async function subirArchivo(archivo, carpetaId, onProgreso = () => {}) {
  const tipo = archivo.type || "application/octet-stream";
  const inicio = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": tipo, "X-Upload-Content-Length": String(archivo.size) },
    body: JSON.stringify({ name: archivo.name, parents: [carpetaId] }),
  });
  const sesion = inicio.headers.get("Location");
  if (!sesion) throw new Error("Google Drive no abrió la subida");

  let enviado = 0;
  while (enviado < archivo.size) {
    const fin = Math.min(enviado + TROZO, archivo.size);
    const r = await fetch(sesion, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${enviado}-${fin - 1}/${archivo.size}` },
      body: archivo.slice(enviado, fin),
    });
    if (r.status === 308) {
      const rango = r.headers.get("Range"); // "bytes=0-1234"
      enviado = rango ? Number(rango.split("-")[1]) + 1 : fin;
    } else if (r.ok) {
      enviado = archivo.size;
    } else {
      throw new Error(`No se pudo subir ${archivo.name} (Drive ${r.status})`);
    }
    onProgreso(enviado / archivo.size);
  }
}
