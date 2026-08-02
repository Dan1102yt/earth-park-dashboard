import { useState, useCallback } from "react";
import { useReservas } from "../context/ReservasContext";

const WORKER_URL = import.meta.env.VITE_WORKER_URL ||
  "https://earth-park-proxy.davidroa1102.workers.dev";

const LAST_ROW_KEY = "ep_sheets_last_row";

export function useGoogleSheets() {
  const { dispatch } = useReservas();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  // ── LEER desde Google Sheets ──────────────────────────
  const importarDesdeSheets = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${WORKER_URL}/sheets/read`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const lastRow = parseInt(localStorage.getItem(LAST_ROW_KEY) || "1");

      // data.ingresos trae el header en la fila 0; el índice real en
      // el Sheet arranca en la fila 2, de ahí el lastRow - 1 al hacer slice.
      const todasLasFilas = data.ingresos.slice(1);
      const filasNuevas = todasLasFilas.slice(lastRow - 1);

      if (filasNuevas.length === 0) {
        setLastSync(new Date());
        return { ok: true, nuevas: 0 };
      }

      let nuevasReservas = 0;

      for (const row of filasNuevas) {
        const [cliente, fecha, unidades, lineaNegocio,
               producto, valorUnitario, subtotal, comentario] = row;
        if (!cliente || !fecha) continue;

        const reservaId = `SHEETS_${cliente?.replace(/\s+/g, "_")}_${fecha}`;

        const valor = parseInt(
          String(subtotal || "0").replace(/[$,.]/g, "")
        ) || 0;

        dispatch({
          type: "ADD_RESERVA",
          payload: {
            reserva_id: reservaId,
            cliente: cliente,
            fecha_inicio: fecha,
            fecha_fin: fecha,
            plan: "visita",
            total_personas: parseInt(unidades) || 1,
            personas_alimentacion: 0,
            personas_alojamiento: 0,
            estado_pago: "pagado",
            anticipo_cop: 0,
            saldo_cop: 0,
            notas: comentario || "",
            es_historico: true,
            ingreso_total: valor,
            lineas_negocio: [lineaNegocio || "OTROS"],
            productos: [{
              nombre: producto || "",
              unidades: parseInt(unidades) || 1,
              valor_unitario: parseInt(
                String(valorUnitario || "0").replace(/[$,.]/g, "")
              ) || 0,
              subtotal: valor,
              linea_negocio: lineaNegocio || "OTROS",
            }],
            created_at: new Date().toISOString(),
          },
        });
        nuevasReservas++;
      }

      localStorage.setItem(LAST_ROW_KEY, String(lastRow + filasNuevas.length));

      setLastSync(new Date());
      return { ok: true, nuevas: nuevasReservas };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setSyncing(false);
    }
  }, [dispatch]);

  // ── REIMPORTAR — limpia el índice y vuelve a traer todo ──
  const reimportarTodo = useCallback(async () => {
    localStorage.removeItem(LAST_ROW_KEY);
    return importarDesdeSheets();
  }, [importarDesdeSheets]);

  // ── ESCRIBIR reserva nueva al Sheet ──────────────────
  const exportarReservaASheets = useCallback(async (reserva) => {
    try {
      const fila = [
        reserva.cliente || "",
        reserva.fecha_inicio || "",
        reserva.total_personas || 1,
        (reserva.lineas_negocio || ["OTROS"]).join(", "),
        reserva.plan || "visita",
        reserva.ingreso_total || 0,
        reserva.ingreso_total || 0,
        reserva.notas || "",
        reserva.plan || "visita",
      ];

      await fetch(`${WORKER_URL}/sheets/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          range: "INGRESOS!A:I",
          values: [fila],
        }),
      });
    } catch (err) {
      console.error("Error exportando a Sheets:", err);
    }
  }, []);

  return {
    syncing,
    lastSync,
    error,
    importarDesdeSheets,
    reimportarTodo,
    exportarReservaASheets,
  };
}
