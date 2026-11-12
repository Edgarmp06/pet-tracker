import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageWalkRepository } from '../../src/infrastructure/adapters/AsyncStorageWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';
import { Location } from '../../src/domain/value-objects/Location';

describe('AsyncStorageWalkRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda un paseo nuevo y lo encuentra como activo', async () => {
    const repository = new AsyncStorageWalkRepository();
    const walk = new Walk({
      id: 'walk-1',
      petIds: ['pet-A'],
      startTime: new Date(),
      route: [],
    });

    await repository.save(walk);

    const active = await repository.findActiveByPetId('pet-A');
    expect(active?.id).toBe('walk-1');
    expect(active?.endTime).toBeUndefined();
  });

  it('actualiza el mismo paseo al finalizarlo (no crea uno nuevo) y deja de estar activo', async () => {
    const repository = new AsyncStorageWalkRepository();
    const walk = new Walk({
      id: 'walk-1',
      petIds: ['pet-A'],
      startTime: new Date('2026-01-01T10:00:00Z'),
      route: [],
    });
    await repository.save(walk);

    const loaded = await repository.findById('walk-1');
    loaded!.addLocation(new Location({ latitude: 0, longitude: 0 }));
    loaded!.addLocation(new Location({ latitude: 1, longitude: 0 }));
    loaded!.endWalk(new Date('2026-01-01T10:30:00Z'));
    await repository.save(loaded!);

    const stillActive = await repository.findActiveByPetId('pet-A');
    expect(stillActive).toBeNull();

    const finished = await repository.findById('walk-1');
    expect(finished?.route.length).toBe(2);
    expect(finished?.distanceMeters).toBeGreaterThan(110500);
    expect(finished?.durationMs).toBe(30 * 60 * 1000);
  });

  it('no pierde los paseos de otras mascotas al guardar uno nuevo', async () => {
    const repository = new AsyncStorageWalkRepository();

    await repository.save(
      new Walk({ id: 'walk-A', petIds: ['pet-A'], startTime: new Date(), route: [] }),
    );
    await repository.save(
      new Walk({ id: 'walk-B', petIds: ['pet-B'], startTime: new Date(), route: [] }),
    );

    expect(await repository.findById('walk-A')).not.toBeNull();
    expect(await repository.findById('walk-B')).not.toBeNull();
  });

  it('findCompletedByPetId solo devuelve paseos finalizados de esa mascota', async () => {
    const repository = new AsyncStorageWalkRepository();

    const finished = new Walk({
      id: 'walk-finished',
      petIds: ['pet-A'],
      startTime: new Date('2026-01-01T10:00:00Z'),
      route: [],
    });
    finished.endWalk(new Date('2026-01-01T10:30:00Z'));
    await repository.save(finished);

    await repository.save(
      new Walk({
        id: 'walk-active',
        petIds: ['pet-A'],
        startTime: new Date(),
        route: [],
      }),
    );
    const otherPetFinished = new Walk({
      id: 'walk-other-pet',
      petIds: ['pet-B'],
      startTime: new Date(),
      route: [],
    });
    otherPetFinished.endWalk(new Date());
    await repository.save(otherPetFinished);

    const completed = await repository.findCompletedByPetId('pet-A');
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe('walk-finished');
  });
});
