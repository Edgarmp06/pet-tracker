import { describe, it, expect } from '@jest/globals';
import { StartWalkUseCase } from '../../src/application/use-cases/StartWalkUseCase';
import { IWalkRepository } from '../../src/domain/ports/IWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';

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

describe('StartWalkUseCase', () => {
  it('debe iniciar un nuevo paseo si la mascota no tiene uno activo', async () => {
    const repository = new InMemoryWalkRepository();
    const useCase = new StartWalkUseCase(repository);

    const walk = await useCase.execute(['pet-123']);

    expect(walk).toBeDefined();
    expect(walk.petIds).toEqual(['pet-123']);
    expect(walk.endTime).toBeUndefined();
    expect(repository.walks.length).toBe(1);
  });

  it('inicia un paseo conjunto con varias mascotas', async () => {
    const repository = new InMemoryWalkRepository();
    const useCase = new StartWalkUseCase(repository);

    const walk = await useCase.execute(['pet-1', 'pet-2']);

    expect(walk.petIds).toEqual(['pet-1', 'pet-2']);
  });

  it('lanza un error si no se selecciona ninguna mascota', async () => {
    const repository = new InMemoryWalkRepository();
    const useCase = new StartWalkUseCase(repository);

    await expect(useCase.execute([])).rejects.toThrow(
      'Selecciona al menos una mascota',
    );
  });

  it('lanza un error si alguna de las mascotas ya tiene un paseo activo', async () => {
    const repository = new InMemoryWalkRepository();
    repository.walks.push(
      new Walk({
        id: 'walk-existing',
        petIds: ['pet-2'],
        startTime: new Date(),
        route: [],
      }),
    );
    const useCase = new StartWalkUseCase(repository);

    await expect(useCase.execute(['pet-1', 'pet-2'])).rejects.toThrow(
      'ya tiene un paseo en curso',
    );
  });
});