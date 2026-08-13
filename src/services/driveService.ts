const WORKER_URL = import.meta.env.VITE_WORKER_URL ||
  "https://earth-park-proxy.davidroa1102.workers.dev";

export interface FotoDrive {
  id: string;
  nombre: string;
  urlMiniatura: string;
  urlCompleta: string;
  mimeType: string;
}

interface DriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  webContentLink?: string;
  mimeType: string;
}

// Lista archivos de una carpeta de Google Drive vía el Worker (Service Account, solo lectura).
export async function listarFotosCarpeta(folderId: string): Promise<FotoDrive[]> {
  const res = await fetch(`${WORKER_URL}/drive/list?folderId=${encodeURIComponent(folderId)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const files: DriveFile[] = data.files || [];
  return files.map((f) => ({
    id: f.id,
    nombre: f.name,
    urlMiniatura: f.thumbnailLink || "",
    urlCompleta: f.webContentLink || "",
    mimeType: f.mimeType,
  }));
}
