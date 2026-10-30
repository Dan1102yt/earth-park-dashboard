import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Aviso para instalar el dashboard como app en el celular (Android / Chrome / Edge).
export default function InstalarApp() {
  const [evento, setEvento] = useState(null);
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem("ep_instalar_oculto") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const yaInstalada = window.matchMedia?.("(display-mode: standalone)").matches;
    if (yaInstalada) return;
    const alOfrecer = (e) => { e.preventDefault(); setEvento(e); };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", () => setEvento(null));
    return () => window.removeEventListener("beforeinstallprompt", alOfrecer);
  }, []);

  if (!evento || oculto) return null;

  const instalar = async () => {
    evento.prompt();
    await evento.userChoice;
    setEvento(null);
  };
  const cerrar = () => {
    setOculto(true);
    try { localStorage.setItem("ep_instalar_oculto", "1"); } catch { /* */ }
  };

  return (
    <div className="fixed left-3 right-3 bottom-24 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
      style={{ background: "rgba(10,30,10,0.96)", border: "1px solid rgba(52,211,153,0.35)" }}>
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-10 h-10 rounded-full" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Instalar Earth Park</p>
        <p className="text-[11px] text-gray-400">Ábrelo como app desde tu pantalla de inicio</p>
      </div>
      <button onClick={instalar} className="flex items-center gap-1 text-xs font-semibold text-emerald-950 bg-emerald-400 px-3 py-2 rounded-lg">
        <Download className="w-3.5 h-3.5" /> Instalar
      </button>
      <button onClick={cerrar} className="text-gray-500 p-1" aria-label="Cerrar"><X className="w-4 h-4" /></button>
    </div>
  );
}
