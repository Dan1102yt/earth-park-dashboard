export function generarReservaId(apellido, fechaInicio) {
  const nombre = apellido
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
  const fecha = fechaInicio.replace(/-/g, "");
  return `${nombre}_${fecha}`;
}

export function validarFormReserva(form) {
  const errores = [];
  
  if (!form.cliente || form.cliente.trim().length === 0) {
    errores.push("El nombre del grupo es obligatorio");
  }
  if (form.cliente && /[0-9]/.test(form.cliente)) {
    errores.push("El nombre no debe contener números");
  }
  if (!form.fecha_inicio) {
    errores.push("La fecha de inicio es obligatoria");
  }
  if (!form.plan) {
    errores.push("Seleccione un plan");
  }
  if (!form.total_personas || form.total_personas < 1 || form.total_personas > 20) {
    errores.push("Total de personas debe ser entre 1 y 20");
  }
  if (form.personas_alimentacion > form.total_personas) {
    errores.push("Personas alimentación no puede superar total personas");
  }
  if (form.personas_alojamiento > form.total_personas) {
    errores.push("Personas alojamiento no puede superar total personas");
  }
  if ((form.n_hamburguesa || 0) + (form.n_pechuga || 0) > form.total_personas) {
    errores.push("Hamburguesas + pechugas no puede superar total personas");
  }
  
  return { valido: errores.length === 0, errores };
}

export function calcularFechaFin(fechaInicio, plan) {
  if (!fechaInicio || !plan) return "";
  const fecha = new Date(fechaInicio + "T12:00:00");
  const dias = plan === "3D2N" ? 2 : plan === "2D1N" ? 1 : 0;
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().split("T")[0];
}
