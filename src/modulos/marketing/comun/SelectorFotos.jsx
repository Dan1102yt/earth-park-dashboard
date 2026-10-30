// Selector de fotos reales de Earth Park (Drive). En el celular ocupa toda la pantalla.
// multiple = true → se pueden marcar varias (collage), incluso de carpetas distintas.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ExploradorDrive from "./ExploradorDrive";

export default function SelectorFotos({ titulo = "Elegir foto", categoriaSugerida, multiple = false, max = 4, onElegir, onCerrar }) {
  const [marcadas, setMarcadas] = useState([]);

  const tocar = (f) => {
    if (!multiple) { onElegir([f]); return; }
    setMarcadas((m) => (m.some((x) => x.id === f.id) ? m.filter((x) => x.id !== f.id) : m.length >= max ? m : [...m, f]));
  };
  const esMarcada = (f) => { const k = marcadas.findIndex((x) => x.id === f.id); return k >= 0 ? k + 1 : false; };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-3xl h-[100dvh] sm:h-[85vh] flex flex-col sm:rounded-2xl p-4 gap-3 safe-area-top safe-area-bottom"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-base font-bold text-white">{titulo}</p>
            {multiple && <p className="text-xs text-gray-400">Marca de 2 a {max} fotos, en el orden en que quieres verlas</p>}
          </div>
          <button onClick={onCerrar} className="text-gray-300 p-2 -m-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 min-h-0">
          <ExploradorDrive categoriaSugerida={categoriaSugerida} esMarcada={esMarcada} onTocar={tocar} />
        </div>
        {multiple && (
          <button onClick={() => onElegir(marcadas)} disabled={marcadas.length < 2}
            className="flex-shrink-0 w-full text-sm font-semibold py-3 rounded-xl bg-lime-400 text-emerald-950 disabled:opacity-40">
            Hacer collage con {marcadas.length} foto{marcadas.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
