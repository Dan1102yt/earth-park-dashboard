import { diasDeSemana, ajustarALaSemana } from "../src/modulos/marketing/oficina/planPrompt";

describe("plan de la semana", () => {
  it("esta semana: solo de hoy en adelante", () => {
    expect(diasDeSemana("2026-11-02", "2026-11-04").map((d) => d.fecha)).toEqual(["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
  });
  it("mueve fechas por fuera de la semana y respeta la cantidad", () => {
    const ps = [
      { tema: "a", dia: "2026-11-08", hora: "10:00" }, { tema: "b", dia: "2026-11-11", hora: "18:30" },
      { tema: "c", dia: "2026-11-15", hora: "10:00" }, { tema: "d", dia: "2026-11-08", hora: "18:30" }, { tema: "e", dia: "2026-11-13" },
    ];
    const r = ajustarALaSemana(ps, "2026-11-02", 4, "2026-11-02");
    expect(r).toHaveLength(4);
    r.forEach((p) => { expect(p.dia >= "2026-11-02" && p.dia <= "2026-11-08").toBe(true); });
    expect(new Set(r.map((p) => p.dia)).size).toBe(4);
  });
});
