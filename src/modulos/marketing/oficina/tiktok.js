// Lu y TikTok: las publicaciones se mandan como BORRADOR a la bandeja de TikTok de Earth Park.
// Oscar recibe la notificación en la app, le pone un sonido y publica (no requiere auditoría de TikTok).
const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

async function llamar(ruta, cuerpo) {
  const res = await fetch(`${WORKER_URL}${ruta}`, cuerpo
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }
    : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/** { conectado, configurado, nombre, foto, error? } */
export const estadoTikTok = () => llamar("/tiktok/estado");
/** Manda una publicación del plan (ya enviada a Lu) a la bandeja de TikTok. */
export const enviarATikTok = (id) => llamar("/tiktok/borrador", { id });
/** Abre la autorización de TikTok (una sola vez, con la cuenta de Earth Park). */
export const conectarTikTok = () => window.open(`${WORKER_URL}/tiktok/conectar`, "_blank", "noopener");
