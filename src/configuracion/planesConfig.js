export const PLANES = {
  "2D1N": {
    nombre: "Conoce y descansa en Macanal",
    precio_por_persona: 340000,
    descripcion: "Escapada al corazón del Valle de Tenza",
    incluye: [
      { item: "Desayuno Earth Park", cantidad: 2, costo_unit: 7390 },
      { item: "Tour en lancha", cantidad: 1, costo_unit: 25000 },
      { item: "Entrada Earth Park", cantidad: 1, costo_unit: 15000 },
      { item: "Visita Mirador del Cielo", cantidad: 1, costo_unit: 0 },
      { item: "Visita Mirador Mano del Minero", cantidad: 1, costo_unit: 0 },
      { item: "Almuerzo local", cantidad: 1, costo_unit: 25000 },
      { item: "Visita Cascada La 70", cantidad: 1, costo_unit: 15000 },
      { item: "Alojamiento Earth Park", cantidad: 1, costo_unit: 10000 },
      { item: "Caminata Casa Campesina + refrigerio", cantidad: 1, costo_unit: 0 },
      { item: "Seguro turístico", cantidad: 1, costo_unit: 0 },
    ],
    notas: "Transporte y guía NO incluidos en precio base"
  },
  "3D2N": {
    nombre: "Tesoros del Valle de Tenza",
    precio_por_persona: 870000,
    descripcion: "Un viaje que trasciende lo turístico",
    incluye: [
      { item: "Desayuno Earth Park", cantidad: 3, costo_unit: 7390 },
      { item: "Almuerzo típico carne al caldero", cantidad: 3, costo_unit: 25000 },
      { item: "Cena Earth Park", cantidad: 2, costo_unit: 12450 },
      { item: "Refrigerio Frutos Tierrita", cantidad: 2, costo_unit: 6000 },
      { item: "Taller Cestería Sutatenza", cantidad: 1, costo_unit: 15500 },
      { item: "Taller Chicharrones y Molienda", cantidad: 1, costo_unit: 20000 },
      { item: "Paseo lancha entre montañas", cantidad: 1, costo_unit: 25000 },
      { item: "Recorrido 4 miradores", cantidad: 1, costo_unit: 0 },
      { item: "Visita casa campesina y aprisco", cantidad: 1, costo_unit: 0 },
      { item: "Alojamiento 2 noches Earth Park", cantidad: 2, costo_unit: 10000 },
      { item: "Helado local", cantidad: 1, costo_unit: 0 },
      { item: "Recorrido pueblos Sutatenza/Somondoco", cantidad: 1, costo_unit: 0 },
      { item: "Seguro turístico", cantidad: 1, costo_unit: 0 },
    ],
    notas: "Transporte y guía NO incluidos en precio base"
  },
  "visita": {
    nombre: "Visita Earth Park",
    precio_por_persona: 45000,
    descripcion: "Entrada y experiencia en el parque",
    incluye: [
      { item: "Entrada Earth Park", cantidad: 1, costo_unit: 24000 },
    ],
    notas: "Incluye recorrido por el parque"
  }
};

// Función que calcula costo operativo total de una reserva
export function calcularCostoOperativoPlan(plan, totalPersonas) {
  const planConfig = PLANES[plan];
  if (!planConfig) return 0;
  return planConfig.incluye.reduce((total, item) => {
    return total + (item.costo_unit * item.cantidad * totalPersonas);
  }, 0);
}

// Función que retorna precio de venta total de una reserva
export function calcularIngresoEsperado(plan, totalPersonas) {
  const planConfig = PLANES[plan];
  if (!planConfig) return 0;
  return planConfig.precio_por_persona * totalPersonas;
}
