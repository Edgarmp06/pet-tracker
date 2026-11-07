import { describe, it, expect } from '@jest/globals';
import { GetClinicalMetricsUseCase } from '../../src/application/use-cases/GetClinicalMetricsUseCase';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { Dropping, PoopConsistency } from '../../src/domain/entities/Dropping';

class InMemoryDroppingRepository implements IDroppingRepository {
  constructor(public droppings: Dropping[]) {}

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }

  async save(dropping: Dropping): Promise<void> {
    this.droppings.push(dropping);
  }
}

const droppingAt = (daysAgo: number, consistency: PoopConsistency): Dropping =>
  new Dropping({
    id: `d-${daysAgo}-${consistency}-${Math.random()}`,
    petId: 'pet-1',
    timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    consistency,
  });

describe('GetClinicalMetricsUseCase', () => {
  it('cuenta el total y el desglose por consistencia dentro del rango de días', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'normal'),
      droppingAt(2, 'diarrhea'),
      droppingAt(2, 'diarrhea'),
      droppingAt(40, 'soft'), // fuera de rango de 30 días
    ]);
    const useCase = new GetClinicalMetricsUseCase(repository);

    const metrics = await useCase.execute('pet-1', 30);

    expect(metrics.totalCount).toBe(3);
    expect(metrics.totalsByConsistency.normal).toBe(1);
    expect(metrics.totalsByConsistency.diarrhea).toBe(2);
    expect(metrics.totalsByConsistency.soft).toBe(0);
  });

  it('agrupa en buckets semanales, siendo el último el más reciente', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(0, 'normal'), // bucket más reciente
      droppingAt(29, 'hard'), // bucket más antiguo (30 días -> 5 buckets)
    ]);
    const useCase = new GetClinicalMetricsUseCase(repository);

    const metrics = await useCase.execute('pet-1', 30);

    expect(metrics.weeklyBuckets.length).toBeGreaterThan(1);
    const lastBucket = metrics.weeklyBuckets[metrics.weeklyBuckets.length - 1];
    const firstBucket = metrics.weeklyBuckets[0];

    expect(lastBucket.total).toBe(1);
    expect(lastBucket.counts.normal).toBe(1);
    expect(firstBucket.total).toBe(1);
    expect(firstBucket.counts.hard).toBe(1);
  });

  it('para un rango de 7 días genera un único bucket con el total correcto', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'normal'),
      droppingAt(3, 'soft'),
    ]);
    const useCase = new GetClinicalMetricsUseCase(repository);

    const metrics = await useCase.execute('pet-1', 7);

    expect(metrics.weeklyBuckets).toHaveLength(1);
    expect(metrics.weeklyBuckets[0].total).toBe(2);
  });

  it('ignora las deposiciones de otras mascotas', async () => {
    const repository = new InMemoryDroppingRepository([
      new Dropping({
        id: 'other',
        petId: 'pet-2',
        timestamp: new Date(),
        consistency: 'diarrhea',
      }),
    ]);
    const useCase = new GetClinicalMetricsUseCase(repository);

    const metrics = await useCase.execute('pet-1', 30);

    expect(metrics.totalCount).toBe(0);
  });

  it('devuelve métricas vacías cuando no hay deposiciones', async () => {
    const repository = new InMemoryDroppingRepository([]);
    const useCase = new GetClinicalMetricsUseCase(repository);

    const metrics = await useCase.execute('pet-1', 30);

    expect(metrics.totalCount).toBe(0);
    expect(metrics.weeklyBuckets.every((b) => b.total === 0)).toBe(true);
  });
});
