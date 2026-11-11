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

import { tiempoEnClip, revisarTramo, normalizarMedio } from "../src/modulos/marketing/guion/linea";

describe("videos en las escenas", () => {
  const proyecto = { escenas: [{ desde: "00:00", hasta: "00:08", fotos: [{ tipo: "video", ref: "v.mp4", inicio: 12, dur: 30 }] }] };

  it("el plano de video usa el tramo elegido y dura lo que pide la escena", () => {
    const l = armarLinea(proyecto);
    const p = l.planos[0];
    expect(p.video.ref).toBe("v.mp4");
    expect(p.duracion).toBe(8);
    expect(tiempoEnClip(p, 0)).toBe(12);
    expect(tiempoEnClip(p, 5)).toBe(17);
    expect(tiempoEnClip(p, 8)).toBe(20);
  });

  it("si el clip no alcanza, va más lento y luego se congela", () => {
    const l = armarLinea({ escenas: [{ desde: 0, hasta: 8, fotos: [{ tipo: "video", ref: "c.mp4", inicio: 0, dur: 4 }] }] });
    const p = l.planos[0];
    expect(tiempoEnClip(p, 4)).toBeCloseTo(2.8); // 0,7x
    expect(tiempoEnClip(p, 8)).toBeCloseTo(3.95); // congelado al final
    expect(revisarTramo(4, 0, 8)).toEqual({ alcanza: false, falta: 4 });
    expect(revisarTramo(30, 12, 8).alcanza).toBe(true);
  });

  it("fotos y videos se mezclan en una escena", () => {
    const l = armarLinea({ escenas: [{ desde: 0, hasta: 9, fotos: ["a.jpg", { tipo: "video", ref: "v.mp4", inicio: 2, dur: 20 }] }] });
    expect(l.planos.map((p) => [p.foto, p.video?.ref ?? null, p.duracion])).toEqual([["a.jpg", null, 4.5], [null, "v.mp4", 4.5]]);
    expect(normalizarMedio("x.jpg")).toEqual({ tipo: "foto", ref: "x.jpg" });
  });
});

import { yTexto, ySubtitulos } from "../src/modulos/marketing/guion/motorGuion";

describe("posición de textos", () => {
  const V = { W: 1080, H: 1920, tam: 76 };
  it("arriba, centro y abajo quedan en orden y dentro de la zona segura", () => {
    const a = yTexto({ ...V, pos: "arriba" });
    const c = yTexto({ ...V, pos: "centro" });
    const b = yTexto({ ...V, pos: "abajo" });
    expect(a).toBeLessThan(c);
    expect(c).toBeLessThan(b);
    expect(a - 76).toBeGreaterThan(250);   // no lo tapa el nombre de la cuenta
    expect(b).toBeLessThan(1920 - 340);    // no lo tapan los botones
  });
  it("si los subtítulos van arriba, el texto de arriba baja", () => {
    expect(yTexto({ ...V, pos: "arriba", posSubs: "arriba", conSubs: true })).toBeGreaterThan(yTexto({ ...V, pos: "arriba" }));
    expect(ySubtitulos({ W: 1080, H: 1920, posSubs: "arriba" })).toBeLessThan(ySubtitulos({ W: 1080, H: 1920, posSubs: "abajo" }));
  });
});
