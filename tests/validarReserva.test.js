import { describe, it, expect } from 'vitest';
import { generarReservaId, validarFormReserva, calcularFechaFin } from '../src/utils/validarReserva';

describe('generarReservaId', () => {
  it('should generate ID from name and date', () => {
    expect(generarReservaId('Viviana', '2026-05-17')).toBe('VIVIANA_20260517');
  });

  it('should remove accents', () => {
    expect(generarReservaId('García', '2026-01-01')).toBe('GARCIA_20260101');
  });

  it('should remove special characters', () => {
    expect(generarReservaId('O\'Brien', '2026-06-15')).toBe('OBRIEN_20260615');
  });

  it('should handle spaces', () => {
    expect(generarReservaId('De La Cruz', '2026-03-20')).toBe('DELACRUZ_20260320');
  });
});

describe('calcularFechaFin', () => {
  it('should add 1 day for 2D1N', () => {
    expect(calcularFechaFin('2026-05-17', '2D1N')).toBe('2026-05-18');
  });

  it('should add 2 days for 3D2N', () => {
    expect(calcularFechaFin('2026-05-17', '3D2N')).toBe('2026-05-19');
  });

  it('should return empty for missing inputs', () => {
    expect(calcularFechaFin('', '2D1N')).toBe('');
    expect(calcularFechaFin('2026-05-17', '')).toBe('');
  });
});

describe('validarFormReserva', () => {
  const validForm = {
    cliente: 'Test',
    fecha_inicio: '2026-06-01',
    plan: '2D1N',
    total_personas: 5,
    personas_alimentacion: 5,
    personas_alojamiento: 5,
    n_hamburguesa: 3,
    n_pechuga: 2,
  };

  it('should validate a correct form', () => {
    const result = validarFormReserva(validForm);
    expect(result.valido).toBe(true);
    expect(result.errores).toHaveLength(0);
  });

  it('should reject when hamburguesa + pechuga > total', () => {
    const result = validarFormReserva({ ...validForm, n_hamburguesa: 4, n_pechuga: 3 });
    expect(result.valido).toBe(false);
  });

  it('should reject numbers in name', () => {
    const result = validarFormReserva({ ...validForm, cliente: 'Test123' });
    expect(result.valido).toBe(false);
  });
});
