import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useGoogleSheets } from "../hooks/useGoogleSheets";

// NavBar monta SyncButton dos veces a la vez (sidebar desktop + header
// móvil, ambos en el DOM simultáneamente, solo ocultos por CSS). Este flag
// evita que las dos instancias disparen el auto-sync en paralelo y dupliquen
// reservas al fusionar contra el mismo estado desactualizado.
let autoSyncDisparado = false;

export default function SyncButton({ compacto = false }) {
  const { syncing, lastSync, error, importarDesdeSheets, reimportarTodo } = useGoogleSheets();
  const [result, setResult] = useState(null);

  // Si no hay datos guardados localmente, cargar automáticamente desde el Sheet.
  useEffect(() => {
    if (autoSyncDisparado) return;
    autoSyncDisparado = true;

    const saved = localStorage.getItem("earthpark_v1");
    const parsed = saved ? JSON.parse(saved) : null;
    const sinDatos = !parsed ||
      (parsed.reservas?.length === 0 && parsed.egresos?.length === 0);
    if (sinDatos) {
      importarDesdeSheets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    const res = await importarDesdeSheets();
    setResult(res);
    setTimeout(() => setResult(null), 4000);
  };

  const handleReimportar = async () => {
    const res = await reimportarTodo();
    setResult(res);
    setTimeout(() => setResult(null), 4000);
  };

  if (compacto) {
    // Versión para el encabezado del celular: solo el ícono
    return (
      <button onClick={handleSync} disabled={syncing} title="Sincronizar con Drive"
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white">
        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
        {result?.ok && <CheckCircle size={12} className="absolute -top-1 -right-1 text-green-400 bg-gray-900 rounded-full" />}
        {(result?.error || error) && <AlertCircle size={12} className="absolute -top-1 -right-1 text-red-400 bg-gray-900 rounded-full" />}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
            disabled:opacity-50 text-white text-xs font-medium
            rounded-lg px-3 py-1.5 transition"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sync Drive"}
        </button>

        {result?.ok && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle size={12} />
            {result.nuevas > 0
              ? `${result.nuevas} nuevas importadas`
              : "Todo actualizado"}
          </span>
        )}

        {(result?.error || error) && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle size={12} />
            Error de sincronización
          </span>
        )}

        {lastSync && !result && (
          <span className="text-xs text-gray-500">
            Última sync: {lastSync.toLocaleTimeString("es-CO")}
          </span>
        )}
      </div>

      <button
        onClick={handleReimportar}
        disabled={syncing}
        className="text-xs text-gray-500 hover:text-gray-300 underline mt-1"
      >
        Reimportar todo
      </button>
    </div>
  );
}
