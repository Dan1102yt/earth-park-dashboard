import Papa from "papaparse";

// ── Spanish month map ──────────────────────────────────────────
const MESES = {
  enero: "01", febrero: "02", marzo: "03", abril: "04",
  mayo: "05", junio: "06", julio: "07", agosto: "08",
  septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

// ── Normalise dates ────────────────────────────────────────────
function normalizarFecha(raw) {
  if (!raw || typeof raw !== "string") return null;
  const txt = raw.trim();

  // Format A: DD/MM/YYYY
  if (txt.includes("/")) {
    const parts = txt.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return null;
  }

  // Format B: "Febrero 23 de 2025"  →  pattern: MES DD de YYYY
  const match = txt.match(/^(\w+)\s+(\d{1,2})\s+de\s+(\d{4})$/i);
  if (match) {
    const mesKey = match[1].toLowerCase();
    const mm = MESES[mesKey];
    if (!mm) return null;
    const dd = match[2].padStart(2, "0");
    const yyyy = match[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

// ── Normalise business line ────────────────────────────────────
function normalizarLinea(raw) {
  if (!raw || typeof raw !== "string") return "";
  let linea = raw.trim().toUpperCase();

  // Normalise accented names
  if (linea === "GASTRONOMÍA") linea = "GASTRONOMIA";
  if (linea === "SOUVENIRS" || linea === "SOUVENIERS") linea = "SOUVENIR";
  if (linea === "ARTESANÍA") linea = "ARTESANIA";
  if (linea === "HOTELERÍA" || linea === "HOTELERIA") linea = "HOTELERIA";
  if (linea === "ENTRADAS_EARTH_PARK") linea = "ENTRADAS EARTH PARK";

  return linea;
}

// ── Clean monetary values ──────────────────────────────────────
function limpiarValor(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  const str = String(raw).replace(/\$/g, "").replace(/,/g, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ── Clean units (handle "5,5" as 5.5) ──────────────────────────
function limpiarUnidades(raw) {
  if (raw === null || raw === undefined || raw === "") return 1;
  const str = String(raw).replace(/,/g, ".").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 1 : num;
}

// ── Normalise name for ID generation ───────────────────────────
function normalizarNombre(nombre) {
  if (!nombre) return "SIN_NOMBRE";
  let n = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")    // keep only alphanumeric + spaces
    .trim()
    .replace(/\s+/g, "_");          // spaces → underscores
  if (n.length > 20) n = n.substring(0, 20);
  // Remove trailing underscore if any
  n = n.replace(/_$/, "");
  return n || "SIN_NOMBRE";
}

// ── Main export ────────────────────────────────────────────────
export function procesarCSV(csvText) {
  // Parse CSV — papaparse handles quoted fields, embedded commas, etc.
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
    header: false,
  });

  const allRows = result.data;

  // Find the header row: look for row containing "NOMBRE CLIENTE" or "FECHA"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i];
    if (row && row.some(cell =>
      typeof cell === "string" && (
        cell.toUpperCase().includes("NOMBRE CLIENTE") ||
        cell.toUpperCase().includes("FECHA")
      )
    )) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.warn("No se encontró la fila de encabezado en el CSV");
    return [];
  }

  // Map header positions (the CSV has an empty first column)
  const headerRow = allRows[headerIndex].map(c => (c || "").trim().toUpperCase());

  // Find column indices dynamically
  const colMap = {};
  headerRow.forEach((h, idx) => {
    if (h.includes("NOMBRE CLIENTE") || h === "CLIENTE") colMap.cliente = idx;
    else if (h === "FECHA") colMap.fecha = idx;
    else if (h === "UNIDADES") colMap.unidades = idx;
    else if (h.includes("NEGOCIO")) colMap.linea = idx;
    else if (h.includes("PRODUCTO") || h.includes("SERVICIO")) colMap.producto = idx;
    else if (h.includes("VALOR UNITARIO")) colMap.valor_unitario = idx;
    else if (h.includes("SUB TOTAL") || h.includes("SUBTOTAL")) colMap.subtotal = idx;
    else if (h.includes("COMENTARIO")) colMap.comentario = idx;
    else if (h.includes("TIPO")) colMap.tipo_reserva = idx;
  });

  // Data rows start after the header
  const dataRows = allRows.slice(headerIndex + 1);

  // Parse each data row into a flat record
  const registros = [];
  const errores = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every(c => !c || !String(c).trim())) continue; // skip fully empty rows

    const cliente = (row[colMap.cliente] || "").trim();
    if (!cliente) continue; // skip rows without client

    const fechaRaw = (row[colMap.fecha] || "").trim();
    const fecha = normalizarFecha(fechaRaw);
    if (!fecha) {
      errores.push({ fila: headerIndex + 2 + i, cliente, fechaRaw, razon: "Fecha no reconocida" });
      continue;
    }

    const unidades = limpiarUnidades(row[colMap.unidades]);
    const lineaNegocio = normalizarLinea(row[colMap.linea] || "");
    const producto = (row[colMap.producto] || "").trim();
    const valorUnitario = limpiarValor(row[colMap.valor_unitario]);
    const subtotal = limpiarValor(row[colMap.subtotal]);
    const comentario = (row[colMap.comentario] || "").trim();

    registros.push({
      cliente,
      fecha,
      unidades,
      linea_negocio: lineaNegocio,
      producto,
      valor_unitario: valorUnitario,
      subtotal,
      comentario,
    });
  }

  if (errores.length > 0) {
    console.warn("Filas no procesadas:", errores);
  }

  // ── Group by client + date ──────────────────────────────────
  const groups = {};
  registros.forEach(r => {
    const key = `${r.cliente}|||${r.fecha}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  // ── Build reserva objects ───────────────────────────────────
  const now = new Date().toISOString();
  const idCount = {}; // track duplicated IDs

  const reservas = Object.entries(groups).map(([key, items]) => {
    const { cliente, fecha } = items[0];
    const fechaCompact = fecha.replace(/-/g, "");

    // Generate base reserva_id
    const nombreNorm = normalizarNombre(cliente);
    let baseId = `${nombreNorm}_${fechaCompact}`;

    // Handle duplicate IDs
    if (idCount[baseId] === undefined) {
      idCount[baseId] = 1;
    } else {
      idCount[baseId]++;
      baseId = `${baseId}_${idCount[baseId]}`;
    }

    // Collect unique business lines (non-empty)
    const lineasSet = new Set();
    items.forEach(it => {
      if (it.linea_negocio) lineasSet.add(it.linea_negocio);
    });

    // Sum subtotals
    const ingresoTotal = items.reduce((sum, it) => sum + it.subtotal, 0);

    // Products detail
    const productos = items.map(it => ({
      nombre: it.producto || "(sin nombre)",
      unidades: it.unidades,
      valor_unitario: it.valor_unitario,
      subtotal: it.subtotal,
      linea_negocio: it.linea_negocio,
    }));

    // Collect comments (non-empty, non-N/A)
    const comentarios = items
      .map(it => it.comentario)
      .filter(c => c && c.toUpperCase() !== "N/A");
    const notasUnicas = [...new Set(comentarios)];

    return {
      reserva_id: baseId,
      cliente,
      fecha_inicio: fecha,
      fecha_fin: fecha,
      plan: "visita",
      total_personas: 1,
      personas_alimentacion: 0,
      personas_alojamiento: 0,
      n_hamburguesa: 0,
      n_pechuga: 0,
      estado_pago: "pagado",
      anticipo_cop: 0,
      saldo_cop: 0,
      notas: notasUnicas.join(" | ") || "",
      created_at: now,
      es_historico: true,
      ingreso_total: ingresoTotal,
      lineas_negocio: [...lineasSet],
      productos,
    };
  });

  // Sort by date ascending
  reservas.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));

  return { reservas, errores };
}
