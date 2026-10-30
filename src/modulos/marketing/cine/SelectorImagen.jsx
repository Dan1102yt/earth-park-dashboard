// Ventana para elegir la imagen de una escena:
//   · "De este video": reutilizar un fotograma (IA o foto) que ya está en otra escena — gratis
//   · "Fotos de Earth Park": escoger a mano una foto real de Drive, navegando por carpetas — gratis
// En el celular ocupa toda la pantalla.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Film, Images } from "lucide-react";
import ExploradorDrive from "../comun/ExploradorDrive";

export default function SelectorImagen({ escenas, indice, categoriaSugerida, onElegirEscena, onElegirFoto, onCerrar }) {
  const [pestana, setPestana] = useState("video");

  const delVideo = escenas
    .map((e, j) => ({ j, v: e.visual || {} }))
    .filter(({ j, v }) => j !== indice && v.fotograma_url);

  const tab = (id, Icono, texto) => (
    <button onClick={() => setPestana(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${pestana === id ? "bg-emerald-700/50 text-white" : "text-gray-400"}`}>
      <Icono className="w-4 h-4" /> {texto}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-2xl h-[100dvh] sm:h-[85vh] flex flex-col sm:rounded-2xl p-4 gap-3 safe-area-top safe-area-bottom"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-base font-bold text-white">Imagen para la escena {indice + 1}</span>
          <button onClick={onCerrar} className="text-gray-300 p-2 -m-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {tab("video", Film, "De este video")}
          {tab("drive", Images, "Fotos de Earth Park")}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {pestana === "video" && (delVideo.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {delVideo.map(({ j, v }) => (
                <button key={j} onClick={() => onElegirEscena(j)} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black/40 active:ring-2 ring-emerald-400">
                  <img src={v.fotograma_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 rounded bg-black/70 text-white">Escena {j + 1}</span>
                  {v.video_url && <span className="absolute bottom-1 right-1 text-[10px] px-1.5 rounded bg-fuchsia-700/80 text-white">clip</span>}
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">Todavía no hay imágenes en otras escenas.</p>)}

          {pestana === "drive" && (
            <div className="h-full">
              <ExploradorDrive categoriaSugerida={categoriaSugerida} onTocar={onElegirFoto} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
