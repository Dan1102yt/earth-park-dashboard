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
  // Fusiona con el estado actual (no reemplaza): agrega reservas/egresos
  // nuevos del Sheet y actualiza los que ya se habían importado antes
  // (prefijo SHEETS_/EG-SHEETS-), sin tocar datos creados localmente
  // (NuevaReserva, devoluciones pagadas, etc.) que no vienen del Sheet.
  const importarDesdeSheets = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${WORKER_URL}/sheets/read`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const filas = data.ingresos || [];

      // Encontrar la fila header (contiene NOMBRE CLIENTE)
      const headerIdx = filas.findIndex(row =>
        row.some(cell => String(cell).includes("NOMBRE CLIENTE"))
      );
      if (headerIdx === -1) throw new Error("No se encontró el header en el Sheet");

      const dataFilas = filas.slice(headerIdx + 1).filter(row =>
        row[1] && row[2] // tiene cliente y fecha
      );

      // Agrupar filas por cliente+fecha para crear reservas
      const gruposMap = new Map();
      for (const row of dataFilas) {
        const cliente = String(row[1] || "").trim();
        const fecha = String(row[2] || "").trim();
        const unidades = parseInt(row[3]) || 1;
        const lineaNegocio = String(row[4] || "OTROS").trim();
        const producto = String(row[5] || "").trim();
        const valorUnitario = parseInt(
          String(row[6] || "0").replace(/[$,. ]/g, "")
        ) || 0;
        const subtotal = parseInt(
          String(row[7] || "0").replace(/[$,. ]/g, "")
        ) || 0;
        const comentario = String(row[8] || "").trim();
        const tipoReserva = String(row[9] || "").trim();

        if (!cliente || !fecha) continue;

        // Normalizar fecha DD/MM/YYYY → YYYY-MM-DD
        let fechaNorm = fecha;
        const partes = fecha.split("/");
        if (partes.length === 3) {
          fechaNorm = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
        }

        const key = `${cliente}__${fechaNorm}`;
        if (!gruposMap.has(key)) {
          gruposMap.set(key, {
            reserva_id: `SHEETS_${cliente.replace(/\s+/g, "_")}_${fechaNorm}`,
            cliente,
            fecha_inicio: fechaNorm,
            fecha_fin: fechaNorm,
            plan: tipoReserva || "visita",
            total_personas: unidades,
            personas_alimentacion: 0,
            personas_alojamiento: 0,
            estado_pago: "pagado",
            anticipo_cop: 0,
            saldo_cop: 0,
            notas: comentario,
            es_historico: true,
            ingreso_total: 0,
            lineas_negocio: [],
            productos: [],
            created_at: new Date().toISOString(),
          });
        }

        const grupo = gruposMap.get(key);
        grupo.ingreso_total += subtotal;
        if (lineaNegocio && !grupo.lineas_negocio.includes(lineaNegocio)) {
          grupo.lineas_negocio.push(lineaNegocio);
        }
        grupo.productos.push({
          nombre: producto,
          unidades,
          valor_unitario: valorUnitario,
          subtotal,
          linea_negocio: lineaNegocio,
        });
        // Actualizar total_personas con el máximo
        if (unidades > grupo.total_personas) {
          grupo.total_personas = unidades;
        }
      }

      const reservasSheet = Array.from(gruposMap.values());

      // Procesar egresos del Sheet
      const filasEgresos = data.egresos || [];
      const headerEgIdx = filasEgresos.findIndex(row =>
        row.some(cell => String(cell).includes("NOMBRE PROVEEDOR") ||
                         String(cell).includes("CENTRO DE COSTO"))
      );

      const egresosSheet = [];
      if (headerEgIdx !== -1) {
        const egData = filasEgresos.slice(headerEgIdx + 1).filter(r => r[1] && r[2]);
        egData.forEach((row, i) => {
          const proveedor = String(row[1] || "").trim();
          const fecha = String(row[2] || "").trim();
          const categoria = String(row[4] || "otros").trim().toLowerCase();
          const item = String(row[5] || "").trim();
          const subtotal = parseInt(
            String(row[7] || "0").replace(/[$,. ]/g, "")
          ) || 0;
          const notas = String(row[8] || "").trim();

          let fechaNorm = fecha;
          const p = fecha.split("/");
          if (p.length === 3) {
            fechaNorm = `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
          }

          // Buscar reserva asociada por proveedor+fecha
          const reservaAsoc = reservasSheet.find(r =>
            r.cliente === proveedor && r.fecha_inicio === fechaNorm
          );

          egresosSheet.push({
            egreso_id: `EG-SHEETS-${String(i + 1).padStart(3, "0")}`,
            reserva_id: reservaAsoc?.reserva_id || "SIN_ASIGNAR",
            item,
            categoria,
            tipo: categoria.includes("proveed") ? "extraordinario" : "operativo",
            valor_cop: subtotal,
            tiene_recibo: true,
            proveedor,
            notas,
            fecha: fechaNorm,
          });
        });
      }

      // Fusionar: lo que ya existe (por ID) se actualiza, lo nuevo se agrega.
      // Nada que no venga del Sheet se toca ni se borra.
      const reservaIds = new Set(state.reservas.map(r => r.reserva_id));
      let nuevas = 0;
      reservasSheet.forEach((r) => {
        if (reservaIds.has(r.reserva_id)) {
          dispatch({ type: "UPDATE_RESERVA", payload: r });
        } else {
          dispatch({ type: "ADD_RESERVA", payload: r });
          nuevas++;
        }
      });

      const egresoIds = new Set(state.egresos.map(e => e.egreso_id));
      egresosSheet.forEach((e) => {
        if (egresoIds.has(e.egreso_id)) {
          dispatch({ type: "UPDATE_EGRESO", payload: e });
        } else {
          dispatch({ type: "ADD_EGRESO", payload: e });
        }
      });

      setLastSync(new Date());
      return { ok: true, nuevas };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setSyncing(false);
    }
  }, [state.reservas, state.egresos, dispatch]);

  // ── REIMPORTAR — vuelve a fusionar todo el Sheet ──────
  const reimportarTodo = useCallback(async () => {
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
