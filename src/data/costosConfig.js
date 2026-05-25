/**
 * costosConfig.js — Fuente de verdad para costos y márgenes por producto.
 * Utilizado para calcular rentabilidad cruzando con datos de ventas.
 */

export const COSTOS_PRODUCTOS = {
  GASTRONOMIA: {
    jugo_tomate_leche:     { nombre: "Jugo de tomate en leche",    venta: 7000,   costo: 3500,  margen: 0.50 },
    sanduche_atun:         { nombre: "Sanduche atún",              venta: 12000,  costo: 7500,  margen: 0.37 },
    aguapanela:            { nombre: "Aguapanela",                 venta: 3000,   costo: 1000,  margen: 0.67 },
    mantecadas:            { nombre: "Mantecadas",                 venta: 3000,   costo: 500,   margen: 0.83 },
    canelazos:             { nombre: "Canelazos",                  venta: 5000,   costo: 2500,  margen: 0.50 },
    desayuno_earthpark:    { nombre: "Desayuno Earth Park",        venta: 15000,  costo: 7390,  margen: 0.51 },
    desayuno_frutas:       { nombre: "Desayuno frutas del campo",  venta: 15000,  costo: 7500,  margen: 0.50 },
    desayuno_campesino:    { nombre: "Desayuno campesino",         venta: 15000,  costo: 8000,  margen: 0.47 },
    refrigerio_tierrita:   { nombre: "Refrigerio Frutos Tierrita", venta: 9000,   costo: 6000,  margen: 0.33 },
    almuerzo_caldero:      { nombre: "Almuerzo carne al caldero",  venta: 25000,  costo: 20000, margen: 0.20 },
    cena_hamburguesa:      { nombre: "Hamburguesa + papa",         venta: 45000,  costo: 15300, margen: 0.66 },
    cena_pechuga:          { nombre: "Pechuga + papa",             venta: 45000,  costo: 9600,  margen: 0.79 },
    chocolate_tinto:       { nombre: "Chocolate / tinto",          venta: 5000,   costo: 1000,  margen: 0.80 },
  },
  AGENCIA_TURISMO: {
    entrada_minero:        { nombre: "Entrada Mano del Minero",    venta: 20000,  costo: 15000, margen: 0.25 },
    tour_lancha:           { nombre: "Tour en lancha",             venta: 30000,  costo: 20000, margen: 0.33 },
    almuerzo_carolina:     { nombre: "Almuerzo Carolina Leg.",     venta: 25000,  costo: 20000, margen: 0.20 },
    guia_turistico:        { nombre: "Servicio de guía",           venta: 120000, costo: 60000, margen: 0.50 },
    transporte:            { nombre: "Servicio de transporte",     venta: 100000, costo: 50000, margen: 0.50 },
    paseo_lancha:          { nombre: "Paseo lancha montañas",      venta: 35000,  costo: 25000, margen: 0.29 },
    caminata_campesina:    { nombre: "Caminata casa campesina",    venta: 20000,  costo: 10000, margen: 0.50 },
    experiencia_pasos:     { nombre: "Experiencia Pasos",          venta: 55000,  costo: 35000, margen: 0.36 },
  },
  ENTRADAS: {
    ingreso_parque_v1:     { nombre: "Ingreso parque (hasta sep 2025)", venta: 12000, costo: 4000,  margen: 0.67 },
    ingreso_parque_v2:     { nombre: "Ingreso parque (oct 2025+)",      venta: 45000, costo: 24000, margen: 0.47 },
  },
  ARTESANIA: {
    mariposa_personalizada:{ nombre: "Mariposa personalizada",     venta: 46000,  costo: 30000, margen: 0.35 },
    servilletero:          { nombre: "Servilletero",               venta: 25000,  costo: 12000, margen: 0.52 },
    recordatorio_piedras:  { nombre: "Recordatorio piedras",       venta: 10000,  costo: 6500,  margen: 0.35 },
    llaveros:              { nombre: "Llaveros",                   venta: 3000,   costo: 1500,  margen: 0.50 },
    posillo_mug:           { nombre: "Posillo mug mariposa",       venta: 15000,  costo: 11000, margen: 0.27 },
  },
  HOTELERIA: {
    habitacion_pareja:     { nombre: "Habitación / noche pareja",  venta: 90000,  costo: 0,     margen: 1.00 },
    cabana_madera:         { nombre: "Cabaña de madera Hugo R",    venta: 250000, costo: 230000, margen: 0.08 },
  },
};
