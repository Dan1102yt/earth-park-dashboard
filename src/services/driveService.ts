const WORKER_URL = import.meta.env.VITE_WORKER_URL ||
  "https://earth-park-proxy.davidroa1102.workers.dev";

export interface FotoDrive {
  id: string;
  nombre: string;
  urlMiniatura: string;
  urlCompleta: string;
  mimeType: string;
}

export interface CarpetaDrive {
  id: string;
  nombre: string;
}

interface DriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  webContentLink?: string;
  mimeType: string;
}

const MIME_CARPETA = "application/vnd.google-apps.folder";

// Lista archivos de una carpeta de Google Drive vía el Worker (Service Account, solo lectura).
export async function listarFotosCarpeta(folderId: string): Promise<FotoDrive[]> {
  const files = await listarHijos(folderId);
  return files
    .filter((f) => f.mimeType !== MIME_CARPETA)
    .map((f) => ({
      id: f.id,
      nombre: f.name,
      urlMiniatura: f.thumbnailLink || "",
      urlCompleta: f.webContentLink || "",
      mimeType: f.mimeType,
    }));
}

// Lista las subcarpetas directas de una carpeta (cada una = una categoría).
export async function listarSubcarpetas(folderId: string): Promise<CarpetaDrive[]> {
  const files = await listarHijos(folderId);
  return files
    .filter((f) => f.mimeType === MIME_CARPETA)
    .map((f) => ({ id: f.id, nombre: f.name }));
}

async function listarHijos(folderId: string): Promise<DriveFile[]> {
  const res = await fetch(`${WORKER_URL}/drive/list?folderId=${encodeURIComponent(folderId)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.files || [];
}
