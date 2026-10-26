// Selector de fotos reales de Earth Park (Drive) en cuadrícula, por carpeta.
// multiple = true → se pueden marcar varias (collage). Se usa en carruseles y donde haga falta elegir foto.
import { useEffect, useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { obtenerCategorias, obtenerFotos } from "../agente/fotosCarrusel";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
export const miniaturaDe = (f) => f.urlMiniatura || `${WORKER_URL}/drive/image?id=${encodeURIComponent(f.id)}`;

function Miniatura({ foto, marcada, orden, onClick }) {
  const [src, setSrc] = useState(miniaturaDe(foto));
  return (
    <button onClick={onClick} className={`relative aspect-[4/5] rounded-lg overflow-hidden bg-black/40 ${marcada ? "ring-2 ring-lime-400" : "hover:ring-2 ring-emerald-500"}`}>
      <img src={src} alt={foto.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover"
        onError={() => setSrc(`${WORKER_URL}/drive/image?id=${encodeURIComponent(foto.id)}`)} />
      {marcada && (
        <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-lime-400 text-emerald-950 text-xs font-bold flex items-center justify-center">
          {orden || <Check className="w-3.5 h-3.5" />}
        </span>
      )}
    </button>
  );
}

export default function SelectorFotos({ titulo = "Elegir foto", categoriaSugerida, multiple = false, max = 4, onElegir, onCerrar }) {
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState(null);
  const [fotos, setFotos] = useState(null);
  const [marcadas, setMarcadas] = useState([]);

  useEffect(() => {
    obtenerCategorias().then((cs) => {
      setCats(cs);
      const n = (categoriaSugerida || "").toLowerCase();
      setCat(cs.find((c) => n && (c.nombre.toLowerCase().includes(n) || n.includes(c.nombre.toLowerCase()))) || cs[0] || null);
    });
  }, [categoriaSugerida]);

  useEffect(() => {
    if (!cat) return undefined;
    let vivo = true;
    setFotos(null);
    obtenerFotos(cat).then((fs) => vivo && setFotos(fs));
    return () => { vivo = false; };
  }, [cat]);

  const tocar = (f) => {
    if (!multiple) { onElegir([f]); return; }
    setMarcadas((m) => (m.some((x) => x.id === f.id) ? m.filter((x) => x.id !== f.id) : m.length >= max ? m : [...m, f]));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-3xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl p-4 gap-3"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{titulo}</p>
            {multiple && <p className="text-[11px] text-gray-400">Marca de 2 a {max} fotos, en el orden en que quieres verlas</p>}
          </div>
          <button onClick={onCerrar} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCat(c)}
              className={`text-[11px] px-2 py-1 rounded-full border ${cat?.id === c.id ? "bg-emerald-700/50 border-emerald-400 text-white" : "border-emerald-800/60 text-emerald-300"}`}>
              {c.nombre}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 min-h-[200px]">
          {!fotos ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-300" /></div>
            : fotos.length ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {fotos.map((f) => {
                  const k = marcadas.findIndex((x) => x.id === f.id);
                  return <Miniatura key={f.id} foto={f} marcada={k >= 0} orden={multiple && k >= 0 ? k + 1 : null} onClick={() => tocar(f)} />;
                })}
              </div>
            ) : <p className="text-xs text-gray-500">Esta carpeta no tiene fotos.</p>}
        </div>
        {multiple && (
          <button onClick={() => onElegir(marcadas)} disabled={marcadas.length < 2}
            className="w-full text-sm font-semibold py-2.5 rounded-xl bg-lime-400 text-emerald-950 disabled:opacity-40">
            Hacer collage con {marcadas.length} foto{marcadas.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>
  );
}
