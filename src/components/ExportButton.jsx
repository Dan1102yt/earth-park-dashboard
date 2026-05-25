import { Download } from "lucide-react";
import { useReservas } from "../context/ReservasContext";

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export default function ExportButton() {
  const { state } = useReservas();

  const handleJSON = () => {
    downloadFile(
      JSON.stringify(state, null, 2),
      `earthpark_export_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  };

  const handleCSV = () => {
    if (state.reservas.length > 0) {
      const rHeaders = Object.keys(state.reservas[0]);
      downloadFile(toCSV(rHeaders, state.reservas), "reservas.csv", "text/csv");
    }
    if (state.egresos.length > 0) {
      const eHeaders = Object.keys(state.egresos[0]);
      downloadFile(toCSV(eHeaders, state.egresos), "egresos.csv", "text/csv");
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleJSON} className="btn-secondary text-xs flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" />
        JSON
      </button>
      <button onClick={handleCSV} className="btn-secondary text-xs flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" />
        CSV
      </button>
    </div>
  );
}
