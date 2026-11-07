import { Walk } from '../entities/Walk';

export interface IWalkRepository {
  save(walk: Walk): Promise<void>;
  findById(id: string): Promise<Walk | null>;
  findActiveByPetId(petId: string): Promise<Walk | null>;
}
