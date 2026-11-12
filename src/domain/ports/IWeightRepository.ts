import { WeightEntry } from '../entities/WeightEntry';

export interface IWeightRepository {
  save(entry: WeightEntry): Promise<void>;
  findByPetId(petId: string): Promise<WeightEntry[]>;
}
