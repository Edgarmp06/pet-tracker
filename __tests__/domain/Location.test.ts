import { describe, it, expect } from '@jest/globals';
import { Location } from '../../src/domain/value-objects/Location';

describe('Location.distanceTo', () => {
  it('debe ser 0 para el mismo punto', () => {
    const a = new Location({ latitude: 39.4699, longitude: -0.3763 });
    expect(a.distanceTo(a)).toBe(0);
  });

  it('debe aproximar ~111 km por cada grado de latitud', () => {
    const a = new Location({ latitude: 0, longitude: 0 });
    const b = new Location({ latitude: 1, longitude: 0 });

    const distance = a.distanceTo(b);

    expect(distance).toBeGreaterThan(110500);
    expect(distance).toBeLessThan(111500);
  });

  it('debe ser simétrica', () => {
    const a = new Location({ latitude: 39.47, longitude: -0.37 });
    const b = new Location({ latitude: 39.48, longitude: -0.38 });

    expect(a.distanceTo(b)).toBeCloseTo(b.distanceTo(a), 6);
  });
});
