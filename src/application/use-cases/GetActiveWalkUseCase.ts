import { Walk } from '../../domain/entities/Walk';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';

export class GetActiveWalkUseCase {
  constructor(private walkRepository: IWalkRepository) {}

  async execute(petId: string): Promise<Walk | null> {
    return this.walkRepository.findActiveByPetId(petId);
  }
}
