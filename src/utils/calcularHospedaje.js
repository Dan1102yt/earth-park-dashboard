import { CONFIG } from "../data/config";

export function calcularHospedaje(totalPersonas) {
  const { mariposa, ancestros, capacidad_total_interna } = CONFIG.habitaciones;

  const personas_internas = Math.min(totalPersonas, capacidad_total_interna);
  const personas_externas = Math.max(0, totalPersonas - capacidad_total_interna);

  const ocu_mariposa  = Math.min(personas_internas, mariposa.capacidad_max);
  const ocu_ancestros = Math.max(0, personas_internas - mariposa.capacidad_max);

  const camas_mariposa = [
    { id: "M-D1a", tipo: "doble", ocupada: ocu_mariposa >= 1 },
    { id: "M-D1b", tipo: "doble", ocupada: ocu_mariposa >= 2 },
    { id: "M-D2a", tipo: "doble", ocupada: ocu_mariposa >= 3 },
    { id: "M-D2b", tipo: "doble", ocupada: ocu_mariposa >= 4 },
    { id: "M-S1",  tipo: "sencilla", ocupada: ocu_mariposa >= 5 },
  ];

  const camas_ancestros = [
    { id: "A-D1a", tipo: "doble", ocupada: ocu_ancestros >= 1 },
    { id: "A-D1b", tipo: "doble", ocupada: ocu_ancestros >= 2 },
  ];

  const alerta_externos = personas_externas > 0
    ? {
        activa: true,
        cantidad: personas_externas,
        costo_referencia: personas_externas * CONFIG.precios.externo_noche,
        mensaje: `${personas_externas} persona${personas_externas > 1 ? "s" : ""} deben hospedarse externamente. Costo de referencia: $${(personas_externas * CONFIG.precios.externo_noche).toLocaleString("es-CO")}/noche.`,
      }
    : { activa: false };

  return {
    personas_internas,
    personas_externas,
    ocu_mariposa,
    ocu_ancestros,
    camas_mariposa,
    camas_ancestros,
    alerta_externos,
    ingreso_alojamiento: totalPersonas * CONFIG.precios.alojamiento,
  };
}
