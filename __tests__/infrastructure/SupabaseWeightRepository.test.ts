import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockIs: jest.Mock<(...args: any[]) => Promise<{ data: unknown; error: unknown }>> =
  jest.fn();
const mockEq = jest.fn(() => ({ is: mockIs }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert: jest.Mock<(...args: any[]) => Promise<{ error: unknown }>> =
  jest.fn();
const mockFrom = jest.fn((_table: string) => ({
  select: mockSelect,
  upsert: mockUpsert,
}));
const mockGetUser: jest.Mock<() => Promise<{ data: { user: unknown }; error: unknown }>> =
  jest.fn();

jest.mock('../../src/infrastructure/config/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

import { SupabaseWeightRepository } from '../../src/infrastructure/adapters/SupabaseWeightRepository';
import { WeightEntry } from '../../src/domain/entities/WeightEntry';

describe('SupabaseWeightRepository', () => {
  beforeEach(() => {
    mockIs.mockReset();
    mockUpsert.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('mapea filas de Supabase (snake_case) a entidades WeightEntry', async () => {
    mockIs.mockResolvedValue({
      data: [
        {
          id: 'weight-1',
          pet_id: 'pet-1',
          weight_kg: 12.5,
          notes: 'nota',
          occurred_at: '2026-01-01T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const repository = new SupabaseWeightRepository();
    const entries = await repository.findByPetId('pet-1');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toBeInstanceOf(WeightEntry);
    expect(entries[0].weightKg).toBe(12.5);
    expect(entries[0].notes).toBe('nota');
  });

  it('lanza un error legible si Supabase devuelve un error al leer', async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: 'network down' } });

    const repository = new SupabaseWeightRepository();

    await expect(repository.findByPetId('pet-1')).rejects.toThrow(/network down/);
  });

  it('usa el user_id de la sesión activa al guardar', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const repository = new SupabaseWeightRepository();
    await repository.save(
      new WeightEntry({
        id: 'weight-1',
        petId: 'pet-1',
        weightKg: 12.5,
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
      }),
    );

    expect(mockFrom).toHaveBeenCalledWith('pet_weights');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'weight-1',
        pet_id: 'pet-1',
        user_id: 'user-1',
        weight_kg: 12.5,
      }),
    );
  });

  it('lanza un error claro si no hay sesión de Supabase activa al guardar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const repository = new SupabaseWeightRepository();

    await expect(
      repository.save(
        new WeightEntry({ id: 'weight-1', petId: 'pet-1', weightKg: 10, timestamp: new Date() }),
      ),
    ).rejects.toThrow(/sesión de Supabase activa/);
  });
});
