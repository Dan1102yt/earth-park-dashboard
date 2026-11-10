import { describe, it, expect } from "vitest";
import { aSegundos, aReloj, armarLinea, vozVigente, indiceEn, gruposDePalabras, RETRASO_VOZ, COLA_VOZ } from "../src/modulos/marketing/guion/linea";
import { PROMO_HOLLYWOOD } from "../src/modulos/marketing/guion/plantillas";

describe("video con guion propio", () => {
  it("lee tiempos", () => {
    expect(aSegundos("00:06")).toBe(6);
    expect(aSegundos("1:05")).toBe(65);
    expect(aSegundos("7")).toBe(7);
    expect(aReloj(45)).toBe("00:45");
  });

  it("respeta los tiempos del guion cuando no hay voz: 45 s", () => {
    const l = armarLinea(PROMO_HOLLYWOOD);
    expect(l.total).toBe(45);
    expect(l.escenas.map((e) => e.inicio)).toEqual([0, 6, 14, 22, 30, 38]);
    expect(l.planos).toHaveLength(11);
    expect(l.planos[1]).toMatchObject({ escena: 0, inicio: 3, duracion: 3 });
  });

  it("alarga la escena si la voz no cabe y corre las siguientes", () => {
    const voces = [{ dur: 7 }];
    const l = armarLinea(PROMO_HOLLYWOOD, voces);
    expect(l.escenas[0].duracion).toBeCloseTo(7 + RETRASO_VOZ + COLA_VOZ);
    expect(l.escenas[1].inicio).toBeCloseTo(l.escenas[0].duracion);
  });

  it("la voz deja de servir si cambia el texto o la voz", () => {
    const e = { locucion: "Hola" };
    expect(vozVigente(e, { texto: "Hola", voiceId: "a" }, "a")).toBeTruthy();
    expect(vozVigente(e, { texto: "Hola", voiceId: "a" }, "b")).toBeNull();
    expect(vozVigente({ locucion: "Chao" }, { texto: "Hola", voiceId: "a" }, "a")).toBeNull();
  });

  it("encuentra la escena en pantalla y arma subtítulos", () => {
    const l = armarLinea(PROMO_HOLLYWOOD);
    expect(indiceEn(l.escenas, 15)).toBe(2);
    const g = gruposDePalabras([{ w: "Hola,", ini: 0, fin: 0.3 }, { w: "bienvenido", ini: 0.3, fin: 0.8 }], 6);
    expect(g).toHaveLength(2);
  });
});
