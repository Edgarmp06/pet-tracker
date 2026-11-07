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

import { SupabaseDroppingRepository } from '../../src/infrastructure/adapters/SupabaseDroppingRepository';
import { Dropping } from '../../src/domain/entities/Dropping';
import { Location } from '../../src/domain/value-objects/Location';

describe('SupabaseDroppingRepository', () => {
  beforeEach(() => {
    mockIs.mockReset();
    mockUpsert.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('mapea filas de Supabase (snake_case) a entidades Dropping', async () => {
    mockIs.mockResolvedValue({
      data: [
        {
          id: 'drop-1',
          pet_id: 'pet-1',
          walk_id: 'walk-1',
          latitude: 39.47,
          longitude: -0.37,
          consistency: 'hard',
          color: '#212121',
          notes: 'nota',
          photo_url: null,
          occurred_at: '2026-01-01T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const repository = new SupabaseDroppingRepository();
    const droppings = await repository.findByPetId('pet-1');

    expect(droppings).toHaveLength(1);
    expect(droppings[0]).toBeInstanceOf(Dropping);
    expect(droppings[0].walkId).toBe('walk-1');
    expect(droppings[0].consistency).toBe('hard');
    expect(droppings[0].location).toBeInstanceOf(Location);
    expect(droppings[0].location?.latitude).toBe(39.47);
  });

  it('lanza un error legible si Supabase devuelve un error al leer', async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: 'network down' } });

    const repository = new SupabaseDroppingRepository();

    await expect(repository.findByPetId('pet-1')).rejects.toThrow(/network down/);
  });

  it('usa el user_id de la sesión activa al guardar', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const repository = new SupabaseDroppingRepository();
    await repository.save(
      new Dropping({
        id: 'drop-1',
        petId: 'pet-1',
        walkId: 'walk-1',
        location: new Location({ latitude: 1, longitude: 2 }),
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
        consistency: 'diarrhea',
        color: '#111111',
      }),
    );

    expect(mockFrom).toHaveBeenCalledWith('droppings');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'drop-1',
        pet_id: 'pet-1',
        walk_id: 'walk-1',
        user_id: 'user-1',
        latitude: 1,
        longitude: 2,
        consistency: 'diarrhea',
      }),
    );
  });

  it('lanza un error claro si no hay sesión de Supabase activa al guardar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const repository = new SupabaseDroppingRepository();

    await expect(
      repository.save(
        new Dropping({ id: 'drop-1', petId: 'pet-1', timestamp: new Date() }),
      ),
    ).rejects.toThrow(/sesión de Supabase activa/);
  });
});
