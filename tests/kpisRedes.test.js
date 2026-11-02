import { cuentasSeguidas, conVariacion, kpisParaIvan } from "../src/modulos/marketing/oficina/kpisRedes";

describe("KPIs de redes", () => {
  it("lee la lista de cerebro/competencia.md", () => {
    const cs = cuentasSeguidas();
    expect(cs.length).toBe(8);
    expect(cs.find((c) => c.usuario === "lamochiladelore").tipo).toBe("referente");
    expect(cs.find((c) => c.usuario === "macanaventuras.oficial").tipo).toBe("competencia");
  });
  it("calcula el crecimiento frente a la foto anterior", () => {
    const a = { fecha: "2026-11-09T00:00:00Z", cuentas: [{ usuario: "x", seguidores: 120 }, { usuario: "y", error: "personal" }] };
    const b = { fecha: "2026-11-02T00:00:00Z", cuentas: [{ usuario: "x", seguidores: 100 }] };
    const v = conVariacion(a, b);
    expect(v.dias).toBe(7);
    expect(v.cuentas[0].crecimiento).toBe(20);
    expect(v.cuentas[1].crecimiento).toBeNull();
    expect(kpisParaIvan(v)).toContain("+20 en 7 días");
  });
});
