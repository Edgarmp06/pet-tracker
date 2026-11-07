import { Dropping } from '../entities/Dropping';

export interface IDroppingRepository {
  save(dropping: Dropping): Promise<void>;
  findByPetId(petId: string): Promise<Dropping[]>;
}
