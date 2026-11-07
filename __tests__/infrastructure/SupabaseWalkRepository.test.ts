import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockMaybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>> =
  jest.fn();

const chain: {
  eq: jest.Mock<(...args: any[]) => typeof chain>;
  is: jest.Mock<(...args: any[]) => typeof chain>;
  maybeSingle: typeof mockMaybeSingle;
} = {
  eq: jest.fn(() => chain),
  is: jest.fn(() => chain),
  maybeSingle: mockMaybeSingle,
};

const mockSelect = jest.fn(() => chain);
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

import { SupabaseWalkRepository } from '../../src/infrastructure/adapters/SupabaseWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';
import { Location } from '../../src/domain/value-objects/Location';

describe('SupabaseWalkRepository', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('mapea una fila de Supabase a una entidad Walk', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'walk-1',
        pet_id: 'pet-1',
        start_time: '2026-01-01T10:00:00.000Z',
        end_time: '2026-01-01T10:30:00.000Z',
        distance_meters: 1500,
        route: [{ latitude: 0, longitude: 0 }],
      },
      error: null,
    });

    const repository = new SupabaseWalkRepository();
    const walk = await repository.findById('walk-1');

    expect(walk).toBeInstanceOf(Walk);
    expect(walk?.distanceMeters).toBe(1500);
    expect(walk?.route[0]).toBeInstanceOf(Location);
    expect(walk?.durationMs).toBe(30 * 60 * 1000);
  });

  it('findActiveByPetId devuelve null cuando no hay paseo activo', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const repository = new SupabaseWalkRepository();
    const walk = await repository.findActiveByPetId('pet-1');

    expect(walk).toBeNull();
  });

  it('lanza un error legible si Supabase devuelve un error al leer', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'network down' } });

    const repository = new SupabaseWalkRepository();

    await expect(repository.findById('walk-1')).rejects.toThrow(/network down/);
  });

  it('usa el user_id de la sesión activa al guardar', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const repository = new SupabaseWalkRepository();
    const walk = new Walk({
      id: 'walk-1',
      petId: 'pet-1',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      route: [new Location({ latitude: 0, longitude: 0 })],
    });

    await repository.save(walk);

    expect(mockFrom).toHaveBeenCalledWith('walks');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'walk-1',
        pet_id: 'pet-1',
        user_id: 'user-1',
      }),
    );
  });

  it('lanza un error claro si no hay sesión de Supabase activa al guardar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const repository = new SupabaseWalkRepository();

    await expect(
      repository.save(new Walk({ id: 'walk-1', petId: 'pet-1', startTime: new Date(), route: [] })),
    ).rejects.toThrow(/sesión de Supabase activa/);
  });
});
