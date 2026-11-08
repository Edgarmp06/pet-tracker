import { describe, it, expect } from '@jest/globals';
import { Walk } from '../../src/domain/entities/Walk';
import { Location } from '../../src/domain/value-objects/Location';

describe('Walk', () => {
  it('calcula la distancia recorrida al finalizar el paseo', () => {
    const walk = new Walk({
      id: 'walk-1',
      petIds: ['pet-1'],
      startTime: new Date('2026-01-01T10:00:00Z'),
      route: [],
    });

    walk.addLocation(new Location({ latitude: 0, longitude: 0 }));
    walk.addLocation(new Location({ latitude: 1, longitude: 0 }));

    expect(walk.distanceMeters).toBe(0); // aún no finalizado, no recalculado

    walk.endWalk(new Date('2026-01-01T10:30:00Z'));

    expect(walk.distanceMeters).toBeGreaterThan(110500);
    expect(walk.distanceMeters).toBeLessThan(111500);
    expect(walk.durationMs).toBe(30 * 60 * 1000);
  });

  it('no permite añadir ubicaciones ni finalizar dos veces un paseo ya finalizado', () => {
    const walk = new Walk({
      id: 'walk-2',
      petIds: ['pet-1'],
      startTime: new Date(),
      route: [new Location({ latitude: 0, longitude: 0 })],
    });

    walk.endWalk();

    expect(() => walk.addLocation(new Location({ latitude: 1, longitude: 1 }))).toThrow();
    expect(() => walk.endWalk()).toThrow();
  });
});
