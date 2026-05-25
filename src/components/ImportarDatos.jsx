import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useReservas } from "../context/ReservasContext";
import { procesarCSV } from "../utils/importarCSV";
import { procesarEgresosCSV } from "../utils/importarEgresos";
import { importarConDeduplicacion } from "../utils/importarUtils";
import { formatCOP } from "../utils/formatCOP";
import Badge from "./Badge";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Receipt,
} from "lucide-react";

export default function ImportarDatos() {
  const { state, dispatch } = useReservas();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const fileInputEgresosRef = useRef(null);

  const [collapsed, setCollapsed] = useState(true);
  const [step, setStep] = useState("idle"); // idle | preview | done
  const [preview, setPreview] = useState([]);
  const [errores, setErrores] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  // â”€â”€ Egresos state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [collapsedEgresos, setCollapsedEgresos] = useState(true);
  const [stepEgresos, setStepEgresos] = useState("idle");
  const [previewEgresos, setPreviewEgresos] = useState([]);
  const [erroresEgresos, setErroresEgresos] = useState([]);
  const [resultadoEgresos, setResultadoEgresos] = useState(null);
  const [loadingEgresos, setLoadingEgresos] = useState(false);

  // â”€â”€ Detect existing IDs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const existingIds = new Set(state.reservas.map((r) => r.reserva_id));
  const existingEgresoIds = new Set(state.egresos.map((e) => e.egreso_id));

  // â”€â”€ File handler (ingresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { reservas, errores: errs } = procesarCSV(evt.target.result);
        setPreview(reservas);
        setErrores(errs || []);
        setStep("preview");
      } catch (err) {
        console.error("Error procesando CSV:", err);
        setErrores([{ razon: err.message }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // â”€â”€ Confirm import (ingresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleConfirm = () => {
    const resumen = importarConDeduplicacion(
      preview,
      state.reservas,
      (r) => r.reserva_id
    );

    resumen.nuevos.forEach((reserva) => {
      dispatch({ type: "ADD_RESERVA", payload: reserva });
    });

    setResultado({
      importadas: resumen.nuevos.length,
      omitidas: resumen.duplicados,
      total: resumen.total,
    });
    setStep("done");
  };

  // â”€â”€ Reset (ingresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReset = () => {
    setStep("idle");
    setPreview([]);
    setErrores([]);
    setResultado(null);
  };

  // â”€â”€ File handler (egresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileEgresos = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingEgresos(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { egresos, errores: errs } = procesarEgresosCSV(
          evt.target.result,
          state.reservas
        );
        setPreviewEgresos(egresos);
        setErroresEgresos(errs || []);
        setStepEgresos("preview");
      } catch (err) {
        console.error("Error procesando CSV de egresos:", err);
        setErroresEgresos([{ razon: err.message }]);
      } finally {
        setLoadingEgresos(false);
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // â”€â”€ Confirm import (egresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleConfirmEgresos = () => {
    const resumen = importarConDeduplicacion(
      previewEgresos,
      state.egresos,
      (eg) => eg.egreso_id
    );

    dispatch({ type: "LOAD_EGRESOS_HISTORICOS", payload: resumen.nuevos });

    setResultadoEgresos({
      importados: resumen.nuevos.length,
      omitidos: resumen.duplicados,
      total: resumen.total,
    });
    setStepEgresos("done");
  };

  // â”€â”€ Reset (egresos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleResetEgresos = () => {
    setStepEgresos("idle");
    setPreviewEgresos([]);
    setErroresEgresos([]);
    setResultadoEgresos(null);
  };

  // â”€â”€ Count duplicates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const duplicados = preview.filter((r) => existingIds.has(r.reserva_id)).length;
  const nuevas = preview.length - duplicados;

  const duplicadosEgresos = previewEgresos.filter((eg) =>
    existingEgresoIds.has(eg.egreso_id)
  ).length;
  const nuevosEgresos = previewEgresos.length - duplicadosEgresos;
  const vinculados = previewEgresos.filter(
    (eg) => eg.reserva_id !== "SIN_ASIGNAR"
  ).length;

  return (
    <div className="space-y-4">
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         SECCIÃ“N 1 â€” Importar ingresos histÃ³ricos
         â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="glass-card overflow-hidden">
        {/* â”€â”€ Header (always visible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Upload className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Importar ingresos histÃ³ricos
              </h3>
              <p className="text-xs text-gray-500">
                Carga el CSV maestro de ingresos
              </p>
            </div>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* â”€â”€ Collapsible body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!collapsed && (
          <div className="px-6 pb-6 border-t border-gray-800/50 pt-4 space-y-4 animate-slide-in-right">
            {/* â”€â”€â”€ STEP: Idle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === "idle" && (
              <div className="text-center py-6 space-y-4">
                <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Selecciona el archivo{" "}
                  <code className="text-violet-400 text-xs">
                    MAESTRO FINANCIERO E-P - INGRESOS.csv
                  </code>{" "}
                  para importar el historial de clientes.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesandoâ€¦
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar historial CSV
                    </>
                  )}
                </button>
              </div>
            )}

            {/* â”€â”€â”€ STEP: Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === "preview" && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge variant="info">
                    {preview.length} reservas encontradas
                  </Badge>
                  {nuevas > 0 && (
                    <Badge variant="ok">{nuevas} nuevas</Badge>
                  )}
                  {duplicados > 0 && (
                    <Badge variant="warn">
                      {duplicados} ya existen
                    </Badge>
                  )}
                </div>

                {/* Errors */}
                {errores.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.length} fila(s) no procesada(s)
                    </p>
                    <div className="max-h-20 overflow-y-auto text-xs text-amber-400/70 space-y-0.5">
                      {errores.slice(0, 5).map((e, i) => (
                        <p key={i}>
                          Fila {e.fila}: {e.cliente} â€” {e.razon}
                          {e.fechaRaw ? ` (${e.fechaRaw})` : ""}
                        </p>
                      ))}
                      {errores.length > 5 && (
                        <p>â€¦y {errores.length - 5} mÃ¡s</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview table */}
                <div className="overflow-x-auto rounded-xl border border-gray-800/50 max-h-[400px] overflow-y-auto">
                  <table className="table-dark">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th>ID Reserva</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th className="text-right">Total COP</th>
                        <th className="text-center">Productos</th>
                        <th>LÃ­neas de negocio</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r) => {
                        const isDuplicate = existingIds.has(r.reserva_id);
                        return (
                          <tr
                            key={r.reserva_id}
                            className={isDuplicate ? "opacity-50" : ""}
                          >
                            <td>
                              <code className="text-xs text-violet-400 font-mono">
                                {r.reserva_id}
                              </code>
                            </td>
                            <td className="text-xs text-gray-300">
                              {r.cliente}
                            </td>
                            <td className="text-xs text-gray-400 whitespace-nowrap">
                              {r.fecha_inicio}
                            </td>
                            <td className="text-right font-mono text-sm text-gray-200">
                              {formatCOP(r.ingreso_total)}
                            </td>
                            <td className="text-center text-xs text-gray-400">
                              {r.productos.length}
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {r.lineas_negocio.map((ln) => (
                                  <span
                                    key={ln}
                                    className="text-[10px] bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded"
                                  >
                                    {ln}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {isDuplicate && (
                                <Badge variant="warn">Ya existe</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={nuevas === 0}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar importaciÃ³n ({nuevas})
                  </button>
                </div>
              </div>
            )}

            {/* â”€â”€â”€ STEP: Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === "done" && resultado && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    ImportaciÃ³n completada
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    ✅{" "}
                    <span className="text-emerald-400 font-medium">
                      {resultado.importadas}
                    </span>{" "}
                    nuevos agregados. ⏭️{" "}
                    <span className="text-amber-400 font-medium">
                      {resultado.omitidas}
                    </span>{" "}
                    duplicados ignorados. 📊{" "}
                    <span className="text-gray-200 font-medium">
                      {resultado.total}
                    </span>{" "}
                    analizados en total.
                  </p>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="btn-secondary text-sm"
                  >
                    Importar otro
                  </button>
                  <button
                    onClick={() => navigate("/reservas")}
                    className="btn-primary text-sm"
                  >
                    Ver en dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         SECCIÃ“N 2 â€” Importar egresos histÃ³ricos
         â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="glass-card overflow-hidden">
        {/* â”€â”€ Header (always visible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <button
          onClick={() => setCollapsedEgresos(!collapsedEgresos)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Importar egresos histÃ³ricos
              </h3>
              <p className="text-xs text-gray-500">
                Carga el CSV maestro de egresos
              </p>
            </div>
          </div>
          {collapsedEgresos ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* â”€â”€ Collapsible body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!collapsedEgresos && (
          <div className="px-6 pb-6 border-t border-gray-800/50 pt-4 space-y-4 animate-slide-in-right">
            {/* â”€â”€â”€ STEP: Idle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {stepEgresos === "idle" && (
              <div className="text-center py-6 space-y-4">
                <Receipt className="w-12 h-12 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Selecciona el archivo{" "}
                  <code className="text-rose-400 text-xs">
                    MAESTRO FINANCIERO E-P - EGRESOS.csv
                  </code>{" "}
                  para importar los costos histÃ³ricos.
                </p>
                <input
                  ref={fileInputEgresosRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileEgresos}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputEgresosRef.current?.click()}
                  disabled={loadingEgresos}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  {loadingEgresos ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesandoâ€¦
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar egresos CSV
                    </>
                  )}
                </button>
              </div>
            )}

            {/* â”€â”€â”€ STEP: Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {stepEgresos === "preview" && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge variant="info">
                    {previewEgresos.length} egresos encontrados
                  </Badge>
                  <Badge variant="ok">
                    {vinculados} vinculados a reservas
                  </Badge>
                  {duplicadosEgresos > 0 && (
                    <Badge variant="warn">
                      {duplicadosEgresos} ya existen
                    </Badge>
                  )}
                </div>

                {/* Errors */}
                {erroresEgresos.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {erroresEgresos.length} fila(s) no procesada(s)
                    </p>
                    <div className="max-h-20 overflow-y-auto text-xs text-amber-400/70 space-y-0.5">
                      {erroresEgresos.slice(0, 5).map((e, i) => (
                        <p key={i}>
                          Fila {e.fila}: {e.proveedor} â€” {e.razon}
                          {e.fechaRaw ? ` (${e.fechaRaw})` : ""}
                        </p>
                      ))}
                      {erroresEgresos.length > 5 && (
                        <p>â€¦y {erroresEgresos.length - 5} mÃ¡s</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview table */}
                <div className="overflow-x-auto rounded-xl border border-gray-800/50 max-h-[400px] overflow-y-auto">
                  <table className="table-dark">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th>ID Egreso</th>
                        <th>Proveedor</th>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th className="text-right">Valor COP</th>
                        <th>Centro de costo</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewEgresos.map((eg) => {
                        const isDuplicate = existingEgresoIds.has(eg.egreso_id);
                        return (
                          <tr
                            key={eg.egreso_id}
                            className={isDuplicate ? "opacity-50" : ""}
                          >
                            <td>
                              <code className="text-xs text-rose-400 font-mono">
                                {eg.egreso_id}
                              </code>
                            </td>
                            <td className="text-xs text-gray-300">
                              {eg.proveedor}
                            </td>
                            <td className="text-xs text-gray-400 whitespace-nowrap">
                              {eg.fecha}
                            </td>
                            <td className="text-xs text-gray-300 max-w-[180px] truncate">
                              {eg.item}
                            </td>
                            <td className="text-right font-mono text-sm text-gray-200">
                              {formatCOP(eg.valor_cop)}
                            </td>
                            <td>
                              <span className="text-[10px] bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                                {eg.categoria}
                              </span>
                            </td>
                            <td>
                              <Badge
                                variant={
                                  eg.tipo === "operativo" ? "ok" : "warn"
                                }
                              >
                                {eg.tipo}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleResetEgresos}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmEgresos}
                    disabled={nuevosEgresos === 0}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar importaciÃ³n ({nuevosEgresos})
                  </button>
                </div>
              </div>
            )}

            {/* â”€â”€â”€ STEP: Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {stepEgresos === "done" && resultadoEgresos && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    Egresos importados
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    ✅{" "}
                    <span className="text-emerald-400 font-medium">
                      {resultadoEgresos.importados}
                    </span>{" "}
                    nuevos agregados. ⏭️{" "}
                    <span className="text-amber-400 font-medium">
                      {resultadoEgresos.omitidos}
                    </span>{" "}
                    duplicados ignorados. 📊{" "}
                    <span className="text-gray-200 font-medium">
                      {resultadoEgresos.total}
                    </span>{" "}
                    analizados en total.
                  </p>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={handleResetEgresos}
                    className="btn-secondary text-sm"
                  >
                    Importar otro
                  </button>
                  <button
                    onClick={() => navigate("/financiero")}
                    className="btn-primary text-sm"
                  >
                    Ver financiero
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
