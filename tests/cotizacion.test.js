import { describe, it, expect } from "vitest";
import { calcularCotizacion, itemsDesdePlan, quienesVienen, tituloDia, fechasTexto, pesos } from "../src/modulos/comercial/calculo";

const catalogo = [
  ["DES", 20000, 12000], ["EXP", 40000, 27000], ["LAN", 30000, 25000], ["MIR", 0, 0], ["ALM", 30000, 25000], ["POS", 10000, 9000],
  ["CAS", 0, 0], ["CEN", 25000, 12450], ["AVE", 0, 0], ["TAL", 75000, null], ["CAM", 10000, 0],
].map(([codigo, precio, costo]) => ({ codigo, actividad: codigo, unidad: "persona", precio, costo }))
  .concat([
    { codigo: "HOS", actividad: "Noche", unidad: "persona_noche", precio: 100000, costo: null },
    { codigo: "SEG", actividad: "Asistencia al viajero", unidad: "persona_dia", precio: 3000, costo: 3000 },
    { codigo: "GUI", actividad: "Guía", unidad: "grupo_dia", precio: 200000, costo: 200000 },
  ]);
const plan = { itinerario: [["DES", "EXP", "LAN", "MIR", "ALM", "POS", "CAS", "CEN", "HOS", "SEG"], ["DES", "AVE", "TAL", "ALM", "CAM", "SEG", "GUI"]] };
const guia = catalogo.find((c) => c.codigo === "GUI");

describe("cotización", () => {
  const items = itemsDesdePlan(plan, catalogo);

  it("arma los ítems del plan sin el guía (va aparte)", () => {
    expect(items).toHaveLength(16);
    expect(items.some((i) => i.codigo === "GUI")).toBe(false);
    expect(items.filter((i) => i.dia === 2)).toHaveLength(6);
  });

  it("calcula el ejemplo aprobado: 2 adultos, 1 niño de 5+, 1 menor de 5", () => {
    const t = calcularCotizacion({ items, adultos: 2, ninos5: 1, menores5: 1, incluirGuia: true, diasGuia: 2, guia });
    expect(t.pagan).toBe(3);
    expect(t.subtotal).toBe(1188000);
    expect(t.guia).toBe(400000);
    expect(t.total).toBe(1588000);
    expect(t.porPersona).toBe(529333);
    expect(t.anticipo).toBe(794000);
    expect(t.totalSinGuia).toBe(1188000);
    expect(t.extras).toHaveLength(1);
    expect(t.extras[0]).toMatchObject({ actividad: "Asistencia al viajero (2 días)", precio: 6000, total: 18000 });
    expect(t.porDia[0].lineas).toHaveLength(9);
    expect(t.faltanCostos).toBe(true);
  });

  it("aplica el descuento a las actividades y no al guía", () => {
    const t = calcularCotizacion({ items, adultos: 10, descuento: 0.1, incluirGuia: true, diasGuia: 2, guia });
    expect(t.subtotal).toBe(3960000);
    expect(t.descuentoValor).toBe(396000);
    expect(t.total).toBe(3960000 - 396000 + 400000);
  });

  it("sin guía el total es solo actividades", () => {
    const t = calcularCotizacion({ items, adultos: 2, incluirGuia: false, diasGuia: 2, guia });
    expect(t.guia).toBe(0);
    expect(t.total).toBe(t.totalSinGuia);
  });

  it("textos", () => {
    expect(quienesVienen({ adultos: 2, ninos5: 1, menores5: 1 })).toBe("2 adultos · 1 niño de 5+ años · 1 menor de 5 (no paga)");
    expect(tituloDia("2027-01-15", 0)).toBe("Día 1 · Viernes 15 de enero");
    expect(fechasTexto("2027-01-15", 2)).toBe("15 y 16 de enero");
    expect(fechasTexto("2027-01-31", 2)).toBe("31 de enero y 1 de febrero");
    expect(fechasTexto("2027-01-15", 3)).toBe("15, 16 y 17 de enero");
    expect(pesos(1588000)).toBe("$1.588.000");
  });
});
