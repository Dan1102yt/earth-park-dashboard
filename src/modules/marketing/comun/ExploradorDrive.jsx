// Explorador de las fotos de Earth Park en Drive: categorías arriba (deslizables), subcarpetas como
// tarjetas y una ruta para volver (ej. Fotos Experiencias › Senderismo). Se usa en todos los selectores de foto.
import { useEffect, useRef, useState } from "react";
import { Loader2, Folder, ChevronRight, Check } from "lucide-react";
import { obtenerCategorias, obtenerContenido } from "../agente/fotosCarrusel";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://earth-park-proxy.davidroa1102.workers.dev";
const fotoGrande = (f) => `${WORKER_URL}/drive/image?id=${encodeURIComponent(f.id)}`;

function Miniatura({ foto, marcada, orden, onClick }) {
  const [src, setSrc] = useState(foto.urlMiniatura || fotoGrande(foto));
  return (
    <button onClick={onClick} className={`relative aspect-square rounded-lg overflow-hidden bg-black/40 ${marcada ? "ring-2 ring-lime-400" : "active:ring-2 ring-emerald-500"}`}>
      <img src={src} alt={foto.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover"
        onError={() => setSrc(fotoGrande(foto))} />
      {marcada && (
        <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-lime-400 text-emerald-950 text-xs font-bold flex items-center justify-center">
          {orden || <Check className="w-3.5 h-3.5" />}
        </span>
      )}
    </button>
  );
}

/**
 * categoriaSugerida: nombre de carpeta para abrir de una vez
 * esMarcada(foto) → número de orden o true · onTocar(foto)
 */
export default function ExploradorDrive({ categoriaSugerida, esMarcada = () => false, onTocar }) {
  const [cats, setCats] = useState(null);
  const [ruta, setRuta] = useState([]); // [{id, nombre}] desde la categoría hasta la carpeta abierta
  const [contenido, setContenido] = useState(null);

  useEffect(() => {
    obtenerCategorias().then((cs) => {
      setCats(cs);
      const n = (categoriaSugerida || "").toLowerCase();
      const c = cs.find((x) => n && (x.nombre.toLowerCase().includes(n) || n.includes(x.nombre.toLowerCase()))) || cs[0];
      if (c) setRuta([c]);
    });
  }, [categoriaSugerida]);

  const actual = ruta.at(-1);
  const chipActivo = useRef(null);
  useEffect(() => { chipActivo.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [ruta[0]?.id]);
  useEffect(() => {
    if (!actual) return undefined;
    let vivo = true;
    setContenido(null);
    obtenerContenido(actual.id).then((c) => vivo && setContenido(c));
    return () => { vivo = false; };
  }, [actual?.id]);

  if (!cats) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-300" /></div>;

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Categorías: una sola fila deslizable */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 flex-shrink-0">
        {cats.map((c) => (
          <button key={c.id} ref={ruta[0]?.id === c.id ? chipActivo : null} onClick={() => setRuta([c])}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${ruta[0]?.id === c.id ? "bg-emerald-700/60 border-emerald-400 text-white" : "border-emerald-800/60 text-emerald-300"}`}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Ruta dentro de la categoría */}
      {ruta.length > 1 && (
        <div className="flex items-center flex-wrap gap-1 text-xs text-gray-400 pb-2 flex-shrink-0">
          {ruta.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button onClick={() => setRuta(ruta.slice(0, i + 1))} className={i === ruta.length - 1 ? "text-white font-semibold" : "text-emerald-300 underline"}>{c.nombre}</button>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-y-auto flex-1 min-h-0">
        {!contenido ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-300" /></div> : (
          <div className="space-y-3">
            {contenido.carpetas.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {contenido.carpetas.map((c) => (
                  <button key={c.id} onClick={() => setRuta([...ruta, c])}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-white bg-white/5 border border-emerald-900/60 active:bg-emerald-800/40">
                    <Folder className="w-5 h-5 text-amber-300 flex-shrink-0" /> <span className="truncate">{c.nombre}</span>
                  </button>
                ))}
              </div>
            )}
            {contenido.fotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {contenido.fotos.map((f) => {
                  const m = esMarcada(f);
                  return <Miniatura key={f.id} foto={f} marcada={!!m} orden={typeof m === "number" ? m : null} onClick={() => onTocar(f)} />;
                })}
              </div>
            ) : !contenido.carpetas.length && <p className="text-xs text-gray-500 py-6 text-center">Esta carpeta no tiene fotos.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
