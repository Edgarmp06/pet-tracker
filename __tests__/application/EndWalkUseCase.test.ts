import { describe, it, expect } from '@jest/globals';
import { EndWalkUseCase } from '../../src/application/use-cases/EndWalkUseCase';
import { IWalkRepository } from '../../src/domain/ports/IWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';
import { Location } from '../../src/domain/value-objects/Location';

class InMemoryWalkRepository implements IWalkRepository {
  public walks: Walk[] = [];

  async save(walk: Walk): Promise<void> {
    const index = this.walks.findIndex((w) => w.id === walk.id);
    if (index >= 0) {
      this.walks[index] = walk;
    } else {
      this.walks.push(walk);
    }
  }

  async findById(id: string): Promise<Walk | null> {
    return this.walks.find((w) => w.id === id) || null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    return this.walks.find((w) => w.petIds.includes(petId) && !w.endTime) || null;
  }
}

describe('EndWalkUseCase', () => {
  it('finaliza el paseo con la ruta acumulada y calcula distancia/duración', async () => {
    const repository = new InMemoryWalkRepository();
    const walk = new Walk({
      id: 'walk-1',
      petIds: ['pet-1'],
      startTime: new Date('2026-01-01T10:00:00Z'),
      route: [],
    });
    await repository.save(walk);

    const useCase = new EndWalkUseCase(repository);
    const route = [
      new Location({ latitude: 0, longitude: 0 }),
      new Location({ latitude: 1, longitude: 0 }),
    ];

    const result = await useCase.execute({ walkId: 'walk-1', route });

    expect(result.endTime).toBeDefined();
    expect(result.route.length).toBe(2);
    expect(result.distanceMeters).toBeGreaterThan(110500);
    expect(repository.walks[0].endTime).toBeDefined();
  });

  it('lanza un error si el paseo no existe', async () => {
    const repository = new InMemoryWalkRepository();
    const useCase = new EndWalkUseCase(repository);

    await expect(
      useCase.execute({ walkId: 'no-existe', route: [] }),
    ).rejects.toThrow();
  });

  it('lanza un error si el paseo ya había finalizado', async () => {
    const repository = new InMemoryWalkRepository();
    const walk = new Walk({
      id: 'walk-1',
      petIds: ['pet-1'],
      startTime: new Date(),
      route: [],
    });
    walk.endWalk();
    await repository.save(walk);

    const useCase = new EndWalkUseCase(repository);

    await expect(
      useCase.execute({ walkId: 'walk-1', route: [] }),
    ).rejects.toThrow();
  });
});
