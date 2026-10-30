// Verifica que los agentes lean el conocimiento central de cerebro/
import { SISTEMA_AGENTE } from "../src/modulos/marketing/agente/agentePrompts";
import { GUIA_GANCHOS } from "../src/modulos/marketing/agente/ganchos";
import { PLANES } from "../src/configuracion/planesConfig";

describe("cerebro", () => {
  it("la marca incluye los planes vigentes", () => {
    expect(SISTEMA_AGENTE).toContain("Earth Park");
    expect(SISTEMA_AGENTE).not.toContain("{{PLANES}}");
    expect(SISTEMA_AGENTE).toContain(Object.values(PLANES)[0].nombre);
  });
  it("la guía de ganchos se carga", () => {
    expect(GUIA_GANCHOS.startsWith("GANCHOS")).toBe(true);
  });
});
