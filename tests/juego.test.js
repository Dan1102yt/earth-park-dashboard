import { nivelDe, calcularJuego, racha, rutaSemana, misionDeHoy } from "../src/modulos/marketing/oficina/juego";

const hoy = new Date("2026-11-05T15:00:00Z"); // jueves 5 nov (Colombia), semana del lunes 2
const f = (id, semana, estado, fecha, tipo = "carrusel") => ({ id, semana, estado, fecha_publicacion: fecha, tipo, tema: `T${id}` });

describe("juego de la oficina", () => {
  it("niveles: 150 para nivel 2, 450 para nivel 3", () => {
    expect(nivelDe(0).nivel).toBe(1);
    expect(nivelDe(149).nivel).toBe(1);
    expect(nivelDe(150).nivel).toBe(2);
    expect(nivelDe(450)).toMatchObject({ nivel: 3, xpNivel: 0, xpSiguiente: 450 });
  });

  const filas = [
    f(1, "2026-10-19", "publicada", "2026-10-20T17:00:00Z"),
    f(2, "2026-10-26", "publicada", "2026-10-27T17:00:00Z"),
    f(3, "2026-10-26", "publicada", "2026-10-29T17:00:00Z", "reel"),
    f(4, "2026-11-02", "publicada", "2026-11-03T17:00:00Z"),
    f(5, "2026-11-02", "lista", "2026-11-05T23:00:00Z", "reel"),
    f(6, "2026-11-02", "aprobada", "2026-11-04T17:00:00Z"),
    f(7, "2026-11-02", "descartada", "2026-11-06T17:00:00Z"),
  ];

  it("racha de semanas completas (la semana en curso no la rompe)", () => {
    expect(racha(filas, hoy)).toBe(2);
  });

  it("XP, monedas y compras", () => {
    const j = calcularJuego(filas, { hoy, compradas: ["orquidea"] });
    // 6 aprobadas·5 + 5 producidas·15 + 4 publicadas·30 + 2 semanas·50 = 30+75+120+100
    expect(j.xp).toBe(325);
    expect(j.monedas).toBe(4 * 10 + 2 * 40 - 50);
    expect(j.semana).toMatchObject({ total: 3, publicadas: 1, porcentaje: 33 });
  });

  it("ruta de la semana", () => {
    const r = rutaSemana(filas.filter((x) => x.semana === "2026-11-02" && x.estado !== "descartada"), hoy);
    expect(r.map((d) => d.estado)).toEqual(["libre", "hecho", "atrasado", "hoy", "libre", "libre", "libre"]);
  });

  it("misión: primero propuestas, luego programar", () => {
    expect(misionDeHoy([...filas, f(9, "2026-11-09", "propuesta", null)], { hoy }).tipo).toBe("reunion");
    expect(misionDeHoy(filas, { hoy })).toMatchObject({ tipo: "programar", fila: { id: 5 } });
  });
});
