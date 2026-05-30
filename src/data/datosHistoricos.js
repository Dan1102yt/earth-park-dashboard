// Los CSVs se importan con ?raw: Vite los embebe en el bundle en UTF-8,
// sin necesidad de fetch ni subida manual.
import ingresosRaw from './MAESTRO FINANCIERO E-P - INGRESOS.csv?raw';
import egresosRaw  from './MAESTRO FINANCIERO E-P - EGRESOS.csv?raw';

import { procesarCSV }        from '../utils/importarCSV';
import { procesarEgresosCSV } from '../utils/importarEgresos';

function cargar() {
  try {
    const { reservas }  = procesarCSV(ingresosRaw);
    const { egresos }   = procesarEgresosCSV(egresosRaw, reservas);
    return {
      reservas: reservas ?? [],
      egresos:  egresos  ?? [],
    };
  } catch (e) {
    console.error('[datosHistoricos] Error procesando CSVs:', e);
    return { reservas: [], egresos: [] };
  }
}

// Se calcula UNA sola vez al importar el módulo.
export const DATOS_HISTORICOS = cargar();
