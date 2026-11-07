import { describe, it, expect } from '@jest/globals';
import { GetPetDroppingLocationsUseCase } from '../../src/application/use-cases/GetPetDroppingLocationsUseCase';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { Dropping, PoopConsistency } from '../../src/domain/entities/Dropping';
import { Location } from '../../src/domain/value-objects/Location';

class InMemoryDroppingRepository implements IDroppingRepository {
  constructor(public droppings: Dropping[]) {}

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }

  async save(dropping: Dropping): Promise<void> {
    this.droppings.push(dropping);
  }
}

const droppingAt = (
  daysAgo: number,
  consistency: PoopConsistency,
  location?: Location,
): Dropping =>
  new Dropping({
    id: `d-${daysAgo}-${consistency}`,
    petId: 'pet-1',
    timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    consistency,
    location,
  });

const SOME_LOCATION = new Location({ latitude: 39.47, longitude: -0.37 });

describe('GetPetDroppingLocationsUseCase', () => {
  it('devuelve solo las deposiciones con ubicación dentro del rango de días', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'normal', SOME_LOCATION),
      droppingAt(10, 'normal', SOME_LOCATION), // fuera de 7 días
      droppingAt(40, 'normal', SOME_LOCATION), // fuera de 30 días
    ]);
    const useCase = new GetPetDroppingLocationsUseCase(repository);

    const last7Days = await useCase.execute('pet-1', 7);
    const last30Days = await useCase.execute('pet-1', 30);

    expect(last7Days).toHaveLength(1);
    expect(last30Days).toHaveLength(2);
  });

  it('omite las deposiciones sin ubicación GPS', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'normal', SOME_LOCATION),
      droppingAt(1, 'normal', undefined),
    ]);
    const useCase = new GetPetDroppingLocationsUseCase(repository);

    const points = await useCase.execute('pet-1', 30);

    expect(points).toHaveLength(1);
  });

  it('asigna más peso a diarrea y blanda que a normal/dura', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'diarrhea', SOME_LOCATION),
      droppingAt(1, 'soft', SOME_LOCATION),
      droppingAt(1, 'normal', SOME_LOCATION),
      droppingAt(1, 'hard', SOME_LOCATION),
    ]);
    const useCase = new GetPetDroppingLocationsUseCase(repository);

    const points = await useCase.execute('pet-1', 30);

    const diarrheaPoint = points[0];
    const softPoint = points[1];
    const normalPoint = points[2];
    const hardPoint = points[3];

    expect(diarrheaPoint.weight).toBeGreaterThan(normalPoint.weight);
    expect(softPoint.weight).toBeGreaterThan(hardPoint.weight);
  });

  it('ignora las deposiciones de otras mascotas', async () => {
    const repository = new InMemoryDroppingRepository([
      new Dropping({
        id: 'other',
        petId: 'pet-2',
        timestamp: new Date(),
        location: SOME_LOCATION,
      }),
    ]);
    const useCase = new GetPetDroppingLocationsUseCase(repository);

    const points = await useCase.execute('pet-1', 30);

    expect(points).toHaveLength(0);
  });

  it('devuelve un array vacío si la mascota no tiene deposiciones con ubicación', async () => {
    const repository = new InMemoryDroppingRepository([]);
    const useCase = new GetPetDroppingLocationsUseCase(repository);

    const points = await useCase.execute('pet-1', 30);

    expect(points).toEqual([]);
  });
});
