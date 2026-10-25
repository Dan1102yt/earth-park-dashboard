// Ventana para elegir la imagen de una escena:
//   · "De este video": reutilizar un fotograma (IA o foto) que ya está en otra escena — gratis
//   · "Fotos de Earth Park": escoger a mano una foto real de Drive, por categoría — gratis
import { useEffect, useState } from "react";
import { X, Loader2, Film, Images } from "lucide-react";
import { obtenerCategorias, obtenerFotos } from "../agente/fotosCarrusel";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";

function Miniatura({ foto, onClick }) {
  const [src, setSrc] = useState(foto.urlMiniatura || `${WORKER_URL}/drive/image?id=${encodeURIComponent(foto.id)}`);
  return (
    <button onClick={onClick} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-black/40 hover:ring-2 ring-emerald-400">
      <img src={src} alt={foto.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover"
        onError={() => setSrc(`${WORKER_URL}/drive/image?id=${encodeURIComponent(foto.id)}`)} />
    </button>
  );
}

export default function SelectorImagen({ escenas, indice, categoriaSugerida, onElegirEscena, onElegirFoto, onCerrar }) {
  const [pestana, setPestana] = useState("video");
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState(null);
  const [fotos, setFotos] = useState(null);

  const delVideo = escenas
    .map((e, j) => ({ j, v: e.visual || {} }))
    .filter(({ j, v }) => j !== indice && v.fotograma_url);

  useEffect(() => {
    if (pestana !== "drive" || cats.length) return;
    obtenerCategorias().then((cs) => {
      setCats(cs);
      const n = (categoriaSugerida || "").toLowerCase();
      setCat(cs.find((c) => n && c.nombre.toLowerCase().includes(n)) || cs[0] || null);
    });
  }, [pestana, cats.length, categoriaSugerida]);

  useEffect(() => {
    if (!cat) return;
    let vivo = true;
    setFotos(null);
    obtenerFotos(cat).then((fs) => vivo && setFotos(fs));
    return () => { vivo = false; };
  }, [cat]);

  const tab = (id, Icono, texto) => (
    <button onClick={() => setPestana(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${pestana === id ? "bg-emerald-700/50 text-white" : "text-gray-400"}`}>
      <Icono className="w-3.5 h-3.5" /> {texto}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">Imagen para la escena {indice + 1}</span>
          <button onClick={onCerrar} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1">
          {tab("video", Film, "De este video")}
          {tab("drive", Images, "Fotos de Earth Park")}
        </div>

        <div className="overflow-y-auto flex-1 min-h-[200px]">
          {pestana === "video" && (delVideo.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {delVideo.map(({ j, v }) => (
                <button key={j} onClick={() => onElegirEscena(j)} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black/40 hover:ring-2 ring-emerald-400">
                  <img src={v.fotograma_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 rounded bg-black/70 text-white">Escena {j + 1}</span>
                  {v.video_url && <span className="absolute bottom-1 right-1 text-[10px] px-1.5 rounded bg-fuchsia-700/80 text-white">clip</span>}
                </button>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">Todavía no hay imágenes en otras escenas.</p>)}

          {pestana === "drive" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button key={c.id} onClick={() => setCat(c)}
                    className={`text-[11px] px-2 py-1 rounded-full border ${cat?.id === c.id ? "bg-emerald-700/50 border-emerald-400 text-white" : "border-emerald-800/60 text-emerald-300"}`}>
                    {c.nombre}
                  </button>
                ))}
              </div>
              {!fotos ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-300" /></div>
                : fotos.length ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {fotos.map((f) => <Miniatura key={f.id} foto={f} onClick={() => onElegirFoto(f)} />)}
                  </div>
                ) : <p className="text-xs text-gray-500">Esta carpeta no tiene fotos.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
