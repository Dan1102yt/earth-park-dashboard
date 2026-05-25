import { describe, it, expect } from 'vitest';
import { calcularHospedaje } from '../src/utils/calcularHospedaje';

describe('calcularHospedaje', () => {
  it('should fill Mariposa first for 3 people', () => {
    const result = calcularHospedaje(3);
    expect(result.ocu_mariposa).toBe(3);
    expect(result.ocu_ancestros).toBe(0);
    expect(result.personas_externas).toBe(0);
  });

  it('should fill Mariposa then Ancestros for 6 people', () => {
    const result = calcularHospedaje(6);
    expect(result.ocu_mariposa).toBe(5);
    expect(result.ocu_ancestros).toBe(1);
    expect(result.personas_externas).toBe(0);
  });

  it('should fill both rooms for 7 people', () => {
    const result = calcularHospedaje(7);
    expect(result.ocu_mariposa).toBe(5);
    expect(result.ocu_ancestros).toBe(2);
    expect(result.personas_externas).toBe(0);
    expect(result.personas_internas).toBe(7);
  });

  it('should flag external for 10 people', () => {
    const result = calcularHospedaje(10);
    expect(result.personas_internas).toBe(7);
    expect(result.personas_externas).toBe(3);
    expect(result.alerta_externos.activa).toBe(true);
    expect(result.alerta_externos.cantidad).toBe(3);
  });

  it('should mark correct beds as occupied for 5 people', () => {
    const result = calcularHospedaje(5);
    expect(result.camas_mariposa.every(c => c.ocupada)).toBe(true);
    expect(result.camas_ancestros.every(c => !c.ocupada)).toBe(true);
  });

  it('should calculate ingreso_alojamiento correctly', () => {
    const result = calcularHospedaje(10);
    expect(result.ingreso_alojamiento).toBe(10 * 90000);
  });

  it('should handle 1 person', () => {
    const result = calcularHospedaje(1);
    expect(result.ocu_mariposa).toBe(1);
    expect(result.personas_externas).toBe(0);
    expect(result.camas_mariposa[0].ocupada).toBe(true);
    expect(result.camas_mariposa[1].ocupada).toBe(false);
  });

  it('should not have external alert for 7 or fewer', () => {
    for (let i = 1; i <= 7; i++) {
      const result = calcularHospedaje(i);
      expect(result.alerta_externos.activa).toBe(false);
    }
  });
});
