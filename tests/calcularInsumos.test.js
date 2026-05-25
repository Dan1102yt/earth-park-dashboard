import { describe, it, expect } from 'vitest';
import { calcularIngresos, calcularPagos, calcularListaCompras, totalListaCompras, calcularMargen, alertaSalud } from '../src/utils/calcularInsumos';
import { CONFIG } from '../src/data/config';

describe('calcularIngresos', () => {
  const reserva = {
    total_personas: 10,
    personas_alimentacion: 9,
    personas_alojamiento: 10,
    plan: '2D1N',
  };

  it('should calculate experiencias correctly', () => {
    const result = calcularIngresos(reserva, CONFIG);
    expect(result.experiencias).toBe(10 * 212000);
  });

  it('should calculate alimentacion correctly', () => {
    const result = calcularIngresos(reserva, CONFIG);
    expect(result.alimentacion).toBe(9 * 90000);
  });

  it('should calculate alojamiento correctly', () => {
    const result = calcularIngresos(reserva, CONFIG);
    expect(result.alojamiento).toBe(10 * 90000);
  });

  it('should calculate guia for 2D1N', () => {
    const result = calcularIngresos(reserva, CONFIG);
    expect(result.guia).toBe(1 * 120000);
  });

  it('should calculate guia for 3D2N', () => {
    const result = calcularIngresos({ ...reserva, plan: '3D2N' }, CONFIG);
    expect(result.guia).toBe(2 * 120000);
  });

  it('should calculate total correctly', () => {
    const result = calcularIngresos(reserva, CONFIG);
    expect(result.total).toBe(2120000 + 810000 + 900000 + 120000);
  });
});

describe('calcularPagos', () => {
  it('should split 50/50', () => {
    const result = calcularPagos(3950000);
    expect(result.anticipo).toBe(1975000);
    expect(result.saldo).toBe(1975000);
  });

  it('should handle odd amounts', () => {
    const result = calcularPagos(100001);
    expect(result.anticipo + result.saldo).toBe(100001);
  });
});

describe('calcularListaCompras', () => {
  const reserva = {
    n_hamburguesa: 5,
    n_pechuga: 3,
    total_personas: 10,
  };

  it('should return 16 items', () => {
    const lista = calcularListaCompras(reserva, CONFIG);
    expect(lista).toHaveLength(16);
  });

  it('should calculate hamburguesa quantity correctly', () => {
    const lista = calcularListaCompras(reserva, CONFIG);
    const hamburguesa = lista.find(i => i.item === 'Hamburguesa Ranchera 130g');
    expect(hamburguesa.cantidad).toBe(5);
  });

  it('should calculate cheese packs correctly', () => {
    const lista = calcularListaCompras(reserva, CONFIG);
    const queso = lista.find(i => i.item === 'Queso La Pampa 250g');
    expect(queso.cantidad).toBe(Math.ceil(5 * 30 / 250));
  });

  it('should have 3 stock items', () => {
    const lista = calcularListaCompras(reserva, CONFIG);
    const stock = lista.filter(i => i.es_stock);
    expect(stock).toHaveLength(3);
  });
});

describe('totalListaCompras', () => {
  it('should sum only non-stock items', () => {
    const lista = calcularListaCompras({ n_hamburguesa: 1, n_pechuga: 1, total_personas: 2 }, CONFIG);
    const total = totalListaCompras(lista);
    expect(total).toBeGreaterThan(0);
    // Stock items should not be counted
    const stockItems = lista.filter(i => i.es_stock);
    stockItems.forEach(item => {
      expect(item.costo_total).toBeNull();
    });
  });
});

describe('calcularMargen', () => {
  it('should calculate margin correctly', () => {
    expect(calcularMargen(1000000, 100000)).toBeCloseTo(0.9);
  });

  it('should return 0 for zero ingresos', () => {
    expect(calcularMargen(0, 100000)).toBe(0);
  });
});

describe('alertaSalud', () => {
  it('should return ok for high margin', () => {
    expect(alertaSalud(0.90).nivel).toBe('ok');
  });

  it('should return warn for medium margin', () => {
    expect(alertaSalud(0.75).nivel).toBe('warn');
  });

  it('should return danger for low margin', () => {
    expect(alertaSalud(0.50).nivel).toBe('danger');
  });
});
