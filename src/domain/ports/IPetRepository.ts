import { Pet } from '../entities/Pet';

export interface IPetRepository {
  findByUserId(userId: string): Promise<Pet[]>;
  save(pet: Pet): Promise<void>;
}
