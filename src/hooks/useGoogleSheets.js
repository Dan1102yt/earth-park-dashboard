import { useState, useCallback } from "react";
import { useReservas } from "../context/ReservasContext";

const WORKER_URL = import.meta.env.VITE_WORKER_URL ||
  "https://earth-park-proxy.davidroa1102.workers.dev";

export function useGoogleSheets() {
  const { state, dispatch } = useReservas();
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

      // Procesar filas de ingresos (saltar header)
      const rows = data.ingresos.slice(1);
      let nuevasReservas = 0;

      for (const row of rows) {
        const [cliente, fecha, unidades, lineaNegocio,
               producto, valorUnitario, subtotal, comentario] = row;
        if (!cliente || !fecha) continue;

        const reservaId = `SHEETS_${cliente?.replace(/\s+/g, "_")}_${fecha}`;
        const yaExiste = state.reservas.some(r => r.reserva_id === reservaId);
        if (yaExiste) continue;

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

      setLastSync(new Date());
      return { ok: true, nuevas: nuevasReservas };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setSyncing(false);
    }
  }, [state.reservas, dispatch]);

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
    exportarReservaASheets,
  };
}
