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

  // Format A: DD/MM/YYYY  or  D/MM/YYYY
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

// ── Normalise centro_costo ─────────────────────────────────────
const CENTRO_COSTO_MAP = {
  "GASTRONOMÍA_C": "GASTRONOMIA",
  "GASTRONOMIA_C": "GASTRONOMIA",
  "GASTRONOMÍA": "GASTRONOMIA",
  "GASTRONOMIA": "GASTRONOMIA",
  "LANCHAS": "AGENCIA DE TURISMO",
  "LANZAS": "AGENCIA DE TURISMO",
  "AGENCIA DE TURISMO": "AGENCIA DE TURISMO",
  "INGRESO": "ENTRADAS EARTH PARK",
  "ENTRADAS EARTH PARK": "ENTRADAS EARTH PARK",
  "TALLER": "ARTESANIA",
  "ARTESANÍA": "ARTESANIA",
  "ARTESANIA": "ARTESANIA",
  "SOUVENIR": "ARTESANIA",
  "SOUVENIRS": "ARTESANIA",
  "SOUVENIERS": "ARTESANIA",
  "HOTELERÍA": "HOTELERIA",
  "HOTELERIA": "HOTELERIA",
  "PROVEEDORES Y OTROS": "PROVEEDORES Y OTROS",
};

function normalizarCentroCosto(raw) {
  if (!raw || typeof raw !== "string") return "";
  const key = raw.trim().toUpperCase();
  return CENTRO_COSTO_MAP[key] || key;
}

// ── Classify type ──────────────────────────────────────────────
function clasificarTipo(centroCostoNormalizado) {
  if (centroCostoNormalizado === "PROVEEDORES Y OTROS") return "extraordinario";
  return "operativo";
}

// ── Try to link to existing reserva ────────────────────────────
function vincularReserva(proveedor, reservas) {
  if (!proveedor || !reservas || reservas.length === 0) return "SIN_ASIGNAR";

  const proveedorNorm = proveedor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();

  for (const r of reservas) {
    const clienteNorm = (r.cliente || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .trim();

    if (!clienteNorm) continue;

    // Check if provider name contains the client name or vice versa
    if (proveedorNorm.includes(clienteNorm) || clienteNorm.includes(proveedorNorm)) {
      return r.reserva_id;
    }
  }

  return "SIN_ASIGNAR";
}

// ── Main export ────────────────────────────────────────────────
export function procesarEgresosCSV(csvText, reservasExistentes = []) {
  // Parse CSV — papaparse handles quoted fields, embedded commas, etc.
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
    header: false,
  });

  const allRows = result.data;

  // Find the header row: look for row containing "PROVEEDOR" or "CENTRO DE COSTO"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i];
    if (row && row.some(cell =>
      typeof cell === "string" && (
        cell.toUpperCase().includes("PROVEEDOR") ||
        cell.toUpperCase().includes("CENTRO DE COSTO")
      )
    )) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.warn("No se encontró la fila de encabezado en el CSV de egresos");
    return { egresos: [], errores: [] };
  }

  // Map header positions
  const headerRow = allRows[headerIndex].map(c => (c || "").trim().toUpperCase());

  const colMap = {};
  headerRow.forEach((h, idx) => {
    if (h.includes("PROVEEDOR") || h.includes("NOMBRE PROVEEDOR")) colMap.proveedor = idx;
    else if (h === "FECHA") colMap.fecha = idx;
    else if (h === "UNIDADES") colMap.unidades = idx;
    else if (h.includes("CENTRO DE COSTO") || h.includes("CENTRO_COSTO")) colMap.centro_costo = idx;
    else if (h.includes("PRODUCTO") || h.includes("SERVICIO")) colMap.producto = idx;
    else if (h.includes("COSTO UNITARIO") || h.includes("COSTO_UNIT")) colMap.costo_unit = idx;
    else if (h.includes("SUB TOTAL") || h.includes("SUBTOTAL")) colMap.subtotal = idx;
    else if (h.includes("COMENTARIO")) colMap.comentario = idx;
  });

  // Data rows start after the header
  const dataRows = allRows.slice(headerIndex + 1);

  // Parse each data row
  const egresos = [];
  const errores = [];
  let idx = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every(c => !c || !String(c).trim())) continue; // skip fully empty rows

    const proveedor = (row[colMap.proveedor] || "").trim();
    if (!proveedor) continue; // skip rows without provider

    const fechaRaw = (row[colMap.fecha] || "").trim();
    const fecha = normalizarFecha(fechaRaw);
    if (!fecha) {
      errores.push({ fila: headerIndex + 2 + i, proveedor, fechaRaw, razon: "Fecha no reconocida" });
      continue;
    }

    const centroCostoRaw = (row[colMap.centro_costo] || "").trim();
    const centroCosto = normalizarCentroCosto(centroCostoRaw);
    const tipo = clasificarTipo(centroCosto);
    const producto = (row[colMap.producto] || "").trim();
    const subtotal = limpiarValor(row[colMap.subtotal]);
    const costoUnit = limpiarValor(row[colMap.costo_unit]);
    const comentario = (row[colMap.comentario] || "").trim();

    // Try to link to a reservation
    const reserva_id = vincularReserva(proveedor, reservasExistentes);

    idx++;
    const egreso_id = `EG-${String(idx).padStart(3, "0")}`;

    egresos.push({
      egreso_id,
      reserva_id,
      item: producto,
      categoria: centroCosto.toLowerCase(),
      tipo,
      valor_cop: subtotal,
      tiene_recibo: true,
      proveedor,
      notas: comentario,
      fecha,
    });
  }

  if (errores.length > 0) {
    console.warn("Filas de egresos no procesadas:", errores);
  }

  return { egresos, errores };
}
