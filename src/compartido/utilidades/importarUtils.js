// Deduplica una lista de nuevos items contra los existentes usando una keyFn.
// Devuelve un resumen con nuevos, duplicados, total y porcentaje_nuevos.
export function importarConDeduplicacion(nuevosItems, itemsExistentes, keyFn) {
  const existingKeys = new Set(itemsExistentes.map(keyFn));
  const soloNuevos = nuevosItems.filter(
    (item) => !existingKeys.has(keyFn(item))
  );
  const total = nuevosItems.length;
  return {
    nuevos: soloNuevos,
    duplicados: total - soloNuevos.length,
    total,
    porcentaje_nuevos:
      total > 0 ? Math.round((soloNuevos.length / total) * 100) : 0,
  };
}
