// Entregarle a Lu algo que ya tienes en el celular o el computador (un video o fotos) para que lo publique.
import { useState } from "react";
import { X, Loader2, Film, Images, Upload } from "lucide-react";
import { enviarALu, aJpegInstagram } from "./instagram";
import { desdeInputLocal } from "./planPrompt";

export default function SubirALu({ nombreLu = "Lu", onListo, onCerrar }) {
  const [tipo, setTipo] = useState("reel");
  const [archivos, setArchivos] = useState([]);
  const [tema, setTema] = useState("");
  const [caption, setCaption] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState(null);

  const elegir = (lista) => {
    const fs = Array.from(lista || []);
    setArchivos(tipo === "reel" ? fs.slice(0, 1) : fs.slice(0, 10));
  };

  const enviar = async () => {
    setEstado({ cargando: true });
    try {
      const listos = tipo === "reel" ? archivos : await Promise.all(archivos.map(aJpegInstagram));
      await enviarALu(null, {
        tipo: tipo === "reel" ? "reel" : "carrusel", archivos: listos, caption,
        tema: tema || (tipo === "reel" ? "Reel" : "Fotos"), fecha: desdeInputLocal(fecha),
      });
      onListo?.();
      onCerrar();
    } catch (e) {
      setEstado({ error: e.message });
    }
  };

  const campo = "w-full bg-black/40 border border-emerald-900/50 rounded-lg text-white text-xs px-2 py-1.5";
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-6" onClick={onCerrar}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
        style={{ background: "#0b1f0b", border: "1px solid rgba(236,72,153,0.4)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Entregarle a {nombreLu} para publicar</p>
          <button onClick={onCerrar} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[["reel", Film, "Video (Reel)"], ["fotos", Images, "Foto o carrusel"]].map(([id, Icono, t]) => (
            <button key={id} onClick={() => { setTipo(id); setArchivos([]); }}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border ${tipo === id ? "bg-pink-500/20 border-pink-400 text-white" : "border-white/15 text-gray-300"}`}>
              <Icono className="w-4 h-4" /> {t}
            </button>
          ))}
        </div>
        <label className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-pink-400/50 py-5 cursor-pointer text-xs text-pink-200">
          <Upload className="w-5 h-5" />
          {archivos.length ? `${archivos.length} archivo${archivos.length > 1 ? "s" : ""}: ${archivos.map((a) => a.name).join(", ").slice(0, 80)}`
            : tipo === "reel" ? "Toca para elegir el video (MP4)" : "Toca para elegir las fotos (hasta 10, en orden)"}
          <input type="file" className="hidden" accept={tipo === "reel" ? "video/mp4" : "image/*"} multiple={tipo !== "reel"} onChange={(e) => elegir(e.target.files)} />
        </label>
        <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Título corto (para reconocerlo en el plan)" className={campo} />
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder="Texto de la publicación (caption) con hashtags" className={campo} />
        <label className="block text-xs text-gray-400 space-y-1">
          <span>¿Cuándo publicar? (vacío = lo decides después)</span>
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </label>
        {estado?.error && <p className="text-xs text-red-300">{estado.error}</p>}
        <button onClick={enviar} disabled={!archivos.length || estado?.cargando}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-pink-400 text-pink-950 disabled:opacity-40">
          {estado?.cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo…</> : fecha ? "Programar" : `Entregar a ${nombreLu}`}
        </button>
      </div>
    </div>
  );
}
