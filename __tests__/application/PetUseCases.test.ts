import { describe, it, expect } from '@jest/globals';
import {
  GetPetsUseCase,
  SavePetUseCase,
  UpdatePetUseCase,
  DeletePetUseCase,
} from '../../src/application/use-cases/PetUseCases';
import { IPetRepository } from '../../src/domain/ports/IPetRepository';
import { Pet } from '../../src/domain/entities/Pet';

class InMemoryPetRepository implements IPetRepository {
  public pets: Pet[] = [];

  async findByUserId(userId: string): Promise<Pet[]> {
    return this.pets.filter((p) => p.userId === userId);
  }

  async save(pet: Pet): Promise<void> {
    const index = this.pets.findIndex((p) => p.id === pet.id);
    if (index >= 0) {
      this.pets[index] = pet;
    } else {
      this.pets.push(pet);
    }
  }

  async delete(petId: string): Promise<void> {
    this.pets = this.pets.filter((p) => p.id !== petId);
  }
}

describe('SavePetUseCase', () => {
  it('crea una mascota nueva con especie y género', async () => {
    const repository = new InMemoryPetRepository();
    const useCase = new SavePetUseCase(repository);

    const pet = await useCase.execute({
      userId: 'user-1',
      name: 'Luna',
      species: 'cat',
      gender: 'female',
    });

    expect(pet.species).toBe('cat');
    expect(pet.gender).toBe('female');
    expect(repository.pets).toHaveLength(1);
  });
});

describe('UpdatePetUseCase', () => {
  it('actualiza una mascota existente conservando su id', async () => {
    const repository = new InMemoryPetRepository();
    repository.pets.push(
      new Pet({ id: 'pet-1', userId: 'user-1', name: 'Luna', species: 'cat' }),
    );
    const useCase = new UpdatePetUseCase(repository);

    const updated = await useCase.execute({
      id: 'pet-1',
      userId: 'user-1',
      name: 'Luna',
      breed: 'Siamés',
      species: 'cat',
      gender: 'female',
    });

    expect(updated.id).toBe('pet-1');
    expect(updated.breed).toBe('Siamés');
    expect(repository.pets).toHaveLength(1);
  });
});

describe('DeletePetUseCase', () => {
  it('elimina una mascota por id', async () => {
    const repository = new InMemoryPetRepository();
    repository.pets.push(new Pet({ id: 'pet-1', userId: 'user-1', name: 'Max' }));
    const useCase = new DeletePetUseCase(repository);

    await useCase.execute('pet-1');

    expect(repository.pets).toHaveLength(0);
  });
});

describe('GetPetsUseCase', () => {
  it('devuelve las mascotas del usuario indicado', async () => {
    const repository = new InMemoryPetRepository();
    repository.pets.push(
      new Pet({ id: 'pet-1', userId: 'user-1', name: 'Max' }),
      new Pet({ id: 'pet-2', userId: 'user-2', name: 'Rex' }),
    );
    const useCase = new GetPetsUseCase(repository);

    const pets = await useCase.execute('user-1');

    expect(pets).toHaveLength(1);
    expect(pets[0].id).toBe('pet-1');
  });
});
