import { Pet } from '../../domain/entities/Pet';
import { IPetRepository } from '../../domain/ports/IPetRepository';

export class GetPetsUseCase {
  constructor(private petRepository: IPetRepository) {}

  async execute(userId: string): Promise<Pet[]> {
    return await this.petRepository.findByUserId(userId);
  }
}

export interface CreatePetDTO {
  userId: string;
  name: string;
  breed?: string;
  age?: number;
  avatarUri?: string;
}

export class SavePetUseCase {
  constructor(private petRepository: IPetRepository) {}

  async execute(dto: CreatePetDTO): Promise<Pet> {
    const pet = new Pet({
      id: 'pet_' + Math.random().toString(36).substring(2, 9),
      userId: dto.userId,
      name: dto.name,
      breed: dto.breed,
      age: dto.age,
      avatarUri: dto.avatarUri,
    });

    await this.petRepository.save(pet);
    return pet;
  }
}