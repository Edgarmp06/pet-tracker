import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockIs: jest.Mock<(...args: any[]) => Promise<{ data: unknown; error: unknown }>> =
  jest.fn();
const mockEq = jest.fn(() => ({ is: mockIs }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert: jest.Mock<(...args: any[]) => Promise<{ error: unknown }>> =
  jest.fn();
const mockUpdateEq: jest.Mock<(...args: any[]) => Promise<{ error: unknown }>> =
  jest.fn();
const mockUpdate: jest.Mock<(...args: any[]) => { eq: typeof mockUpdateEq }> =
  jest.fn(() => ({ eq: mockUpdateEq }));
const mockFrom = jest.fn((_table: string) => ({
  select: mockSelect,
  upsert: mockUpsert,
  update: mockUpdate,
}));

jest.mock('../../src/infrastructure/config/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

// Import después del mock para que SupabasePetRepository reciba el cliente falso.
import { SupabasePetRepository } from '../../src/infrastructure/adapters/SupabasePetRepository';
import { Pet } from '../../src/domain/entities/Pet';

describe('SupabasePetRepository', () => {
  beforeEach(() => {
    mockIs.mockReset();
    mockUpsert.mockReset();
    mockUpdateEq.mockReset();
  });

  it('mapea las filas de Supabase (snake_case) a entidades Pet', async () => {
    mockIs.mockResolvedValue({
      data: [
        {
          id: 'pet-1',
          user_id: 'user-1',
          name: 'Max',
          breed: 'Labrador',
          age: 4,
          avatar_uri: 'file://avatar.png',
          species: 'dog',
          gender: 'male',
          goes_on_walks: false,
        },
      ],
      error: null,
    });

    const repository = new SupabasePetRepository();
    const pets = await repository.findByUserId('user-1');

    expect(pets).toHaveLength(1);
    expect(pets[0]).toBeInstanceOf(Pet);
    expect(pets[0].id).toBe('pet-1');
    expect(pets[0].userId).toBe('user-1');
    expect(pets[0].breed).toBe('Labrador');
    expect(pets[0].age).toBe(4);
    expect(pets[0].avatarUri).toBe('file://avatar.png');
    expect(pets[0].species).toBe('dog');
    expect(pets[0].gender).toBe('male');
    expect(pets[0].goesOnWalks).toBe(false);
  });

  it('lanza un error legible si Supabase devuelve un error al leer', async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: 'network down' } });

    const repository = new SupabasePetRepository();

    await expect(repository.findByUserId('user-1')).rejects.toThrow(/network down/);
  });

  it('serializa la mascota a snake_case al guardar', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const repository = new SupabasePetRepository();
    await repository.save(
      new Pet({
        id: 'pet-1',
        userId: 'user-1',
        name: 'Max',
        breed: 'Perro',
        age: 3,
        species: 'dog',
        gender: 'male',
      }),
    );

    expect(mockFrom).toHaveBeenCalledWith('pets');
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'pet-1',
      user_id: 'user-1',
      name: 'Max',
      breed: 'Perro',
      age: 3,
      avatar_uri: null,
      species: 'dog',
      gender: 'male',
      goes_on_walks: true,
    });
  });

  it('lanza un error legible si Supabase devuelve un error al guardar', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'duplicate key' } });

    const repository = new SupabasePetRepository();

    await expect(
      repository.save(new Pet({ id: 'pet-1', userId: 'user-1', name: 'Max' })),
    ).rejects.toThrow(/duplicate key/);
  });

  it('marca deleted_at en vez de borrar la fila al eliminar', async () => {
    mockUpdateEq.mockResolvedValue({ error: null });

    const repository = new SupabasePetRepository();
    await repository.delete('pet-1');

    expect(mockFrom).toHaveBeenCalledWith('pets');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'pet-1');
  });

  it('lanza un error legible si Supabase devuelve un error al eliminar', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'not allowed' } });

    const repository = new SupabasePetRepository();

    await expect(repository.delete('pet-1')).rejects.toThrow(/not allowed/);
  });
});
