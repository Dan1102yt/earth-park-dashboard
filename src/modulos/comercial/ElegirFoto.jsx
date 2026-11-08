// Elegir una foto para la propuesta: las incluidas en el panel, una de Drive o una subida desde el equipo.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, FolderOpen, Upload } from "lucide-react";
import SelectorFotos from "../marketing/comun/SelectorFotos";
import { supabase } from "../../compartido/lib/supabaseClient";
import { FOTOS_INCLUIDAS, urlFoto } from "./datos";

export default function ElegirFoto({ titulo, onElegir, onCerrar }) {
  const [drive, setDrive] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const subir = async (archivo) => {
    if (!archivo || !supabase) return;
    setSubiendo(true);
    setError("");
    const ruta = `cotizaciones/fotos/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error: e } = await supabase.storage.from("videos").upload(ruta, archivo, { contentType: archivo.type || "image/jpeg" });
    setSubiendo(false);
    if (e) { setError(`No se pudo subir: ${e.message}`); return; }
    onElegir(supabase.storage.from("videos").getPublicUrl(ruta).data.publicUrl);
  };

  if (drive) {
    return <SelectorFotos titulo={titulo} onElegir={([f]) => onElegir(`drive:${f.id}`)} onCerrar={() => setDrive(false)} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-stretch sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-3xl h-[100dvh] sm:h-[85vh] flex flex-col sm:rounded-2xl p-4 gap-3 safe-area-top safe-area-bottom"
        style={{ background: "#0b1f0b", border: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-bold text-white">{titulo}</p>
          <button onClick={onCerrar} className="text-gray-300 p-2 -m-2" aria-label="Cerrar"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDrive(true)} className="btn-secondary !py-2 !px-3 text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Buscar en Drive</button>
          <label className="btn-secondary !py-2 !px-3 text-sm flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> {subiendo ? "Subiendo…" : "Subir desde el equipo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-xs text-gray-400">Fotos de la página web:</p>
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 gap-2 content-start">
          {FOTOS_INCLUIDAS.map((ref) => (
            <button key={ref} onClick={() => onElegir(ref)} className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-lime-400">
              <img src={urlFoto(ref)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
