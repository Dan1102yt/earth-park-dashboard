import { CONFIG } from "../data/config";

export function calcularIngresos(reserva, config = CONFIG) {
  const { precios } = config;
  const nochesGuia = reserva.plan === "2D1N" ? 1 : 2;
  return {
    experiencias: reserva.total_personas * precios.experiencias,
    alimentacion: reserva.personas_alimentacion * precios.alimentacion,
    alojamiento:  reserva.personas_alojamiento * precios.alojamiento,
    guia:         nochesGuia * (reserva.plan === "2D1N"
                    ? precios.guia_2D1N
                    : precios.guia_3D2N),
    get total() {
      return this.experiencias + this.alimentacion +
             this.alojamiento + this.guia;
    },
  };
}

export function calcularPagos(totalIngresos) {
  const anticipo = Math.round(totalIngresos * 0.5);
  const saldo    = totalIngresos - anticipo;
  return { anticipo, saldo };
}

export function calcularListaCompras(reserva, config = CONFIG) {
  const { n_hamburguesa: nh, n_pechuga: np,
          total_personas: td } = reserva;
  const { costos_cena: cc, costos_desayuno: cd } = config;

  return [
    {
      categoria: "cena_hamburguesa",
      item: "Hamburguesa Ranchera 130g",
      unidad: "und",
      cantidad: nh,
      costo_unit: cc.ranchera_130g,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "cena_hamburguesa",
      item: "Pan de hamburguesa",
      unidad: "und",
      cantidad: nh,
      costo_unit: cc.pan_hamburguesa,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "cena_hamburguesa",
      item: "Queso La Pampa 250g",
      unidad: "paquete",
      cantidad: Math.ceil(nh * 30 / 250),
      costo_unit: cc.queso_250g,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "cena_hamburguesa",
      item: "Lechuga",
      unidad: "und",
      cantidad: Math.ceil(nh / 6),
      costo_unit: cc.lechuga,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "cena_pechuga",
      item: "Pechuga de pollo",
      unidad: "und",
      cantidad: np,
      costo_unit: cc.pechuga,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
      nota: "Verificar stock en restaurante antes de comprar",
    },
    {
      categoria: "acompanamiento",
      item: "Papa criolla/pastusa (cenas)",
      unidad: "kg",
      cantidad: parseFloat(((nh + np) * 0.15).toFixed(2)),
      costo_unit: cc.papa_kg,
      get costo_total() {
        return Math.round(this.cantidad * this.costo_unit);
      },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Costilla de res",
      unidad: "kg",
      cantidad: parseFloat((td * 0.05).toFixed(2)),
      costo_unit: cd.costilla_kg,
      get costo_total() {
        return Math.round(this.cantidad * this.costo_unit);
      },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Papa para caldo",
      unidad: "kg",
      cantidad: parseFloat((td * 0.25).toFixed(2)),
      costo_unit: cd.papa_caldo_kg,
      get costo_total() {
        return Math.round(this.cantidad * this.costo_unit);
      },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Arveja verde",
      unidad: "g",
      cantidad: td * 50,
      costo_unit: cd.arveja_g,
      get costo_total() {
        return Math.round(this.cantidad * this.costo_unit);
      },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Leche Colanta (pacas 6L)",
      unidad: "paca",
      cantidad: Math.ceil(td * 0.6 / 6),
      costo_unit: cd.leche_paca6L,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Arepas",
      unidad: "und",
      cantidad: td,
      costo_unit: Math.round(cd.arepa_paquete / 10),
      get costo_total() { return Math.round(td * this.costo_unit); },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Fruta de temporada",
      unidad: "porción",
      cantidad: td,
      costo_unit: cd.fruta_porcion,
      get costo_total() { return this.cantidad * this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "desayuno",
      item: "Chocolate (pastillas/polvo)",
      unidad: "paquete",
      cantidad: 1,
      costo_unit: cd.chocolate,
      get costo_total() { return this.costo_unit; },
      es_stock: false,
    },
    {
      categoria: "stock",
      item: "Aceite Oliosoya",
      unidad: "und",
      cantidad: null,
      costo_unit: null,
      costo_total: null,
      es_stock: true,
      nota: "Verificar nivel antes del fin de semana",
    },
    {
      categoria: "stock",
      item: "Salsas (mayo / mostaza / ketchup)",
      unidad: "set",
      cantidad: null,
      costo_unit: null,
      costo_total: null,
      es_stock: true,
    },
    {
      categoria: "stock",
      item: "Sal / pimienta / condimentos",
      unidad: "—",
      cantidad: null,
      costo_unit: null,
      costo_total: null,
      es_stock: true,
    },
  ];
}

export function totalListaCompras(lista) {
  return lista
    .filter(i => !i.es_stock && typeof i.costo_total === "number")
    .reduce((sum, i) => sum + i.costo_total, 0);
}

export function calcularMargen(ingresos_total, egresos_total) {
  if (ingresos_total === 0) return 0;
  return (ingresos_total - egresos_total) / ingresos_total;
}

export function alertaSalud(margen) {
  if (margen >= CONFIG.benchmarks.margen_minimo_pct) {
    return { nivel: "ok",   mensaje: "Margen saludable" };
  }
  if (margen >= 0.70) {
    return { nivel: "warn", mensaje: "Margen bajo — revisar egresos" };
  }
  return { nivel: "danger", mensaje: "Margen crítico — acción urgente" };
}
