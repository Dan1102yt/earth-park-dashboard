const WORKER_URL = import.meta.env.VITE_WORKER_URL ||
  "https://earth-park-proxy.davidroa1102.workers.dev";

export interface FotoDrive {
  id: string;
  nombre: string;
  urlMiniatura: string;
  urlCompleta: string;
  mimeType: string;
}

export interface VideoDrive {
  id: string;
  nombre: string;
  urlMiniatura: string;
  mimeType: string;
  mb: number;
  segundos: number;
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
  size?: string;
  videoMediaMetadata?: { durationMillis?: string };
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

// Contenido de una carpeta: subcarpetas y archivos (para navegar por carpetas dentro de carpetas).
export async function listarCarpeta(folderId: string): Promise<{ carpetas: CarpetaDrive[]; fotos: FotoDrive[]; videos: VideoDrive[] }> {
  const files = await listarHijos(folderId);
  return {
    carpetas: files.filter((f) => f.mimeType === MIME_CARPETA).map((f) => ({ id: f.id, nombre: f.name })),
    fotos: files
      .filter((f) => f.mimeType !== MIME_CARPETA && f.mimeType?.startsWith("image/"))
      .map((f) => ({ id: f.id, nombre: f.name, urlMiniatura: f.thumbnailLink || "", urlCompleta: f.webContentLink || "", mimeType: f.mimeType })),
    videos: files
      .filter((f) => f.mimeType?.startsWith("video/"))
      .map((f) => ({
        id: f.id, nombre: f.name, urlMiniatura: f.thumbnailLink || "", mimeType: f.mimeType,
        mb: Math.round(Number(f.size || 0) / 1048576), segundos: Math.round(Number(f.videoMediaMetadata?.durationMillis || 0) / 1000),
      })),
  };
}

async function listarHijos(folderId: string): Promise<DriveFile[]> {
  const res = await fetch(`${WORKER_URL}/drive/list?folderId=${encodeURIComponent(folderId)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.files || [];
}
