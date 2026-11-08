import { PetEvent } from '../entities/PetEvent';

export interface IPetEventRepository {
  findByPetId(petId: string): Promise<PetEvent[]>;
  save(event: PetEvent): Promise<void>;
}
