import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useGoogleSheets } from "../hooks/useGoogleSheets";

export default function SyncButton() {
  const { syncing, lastSync, error, importarDesdeSheets, reimportarTodo } = useGoogleSheets();
  const [result, setResult] = useState(null);

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
