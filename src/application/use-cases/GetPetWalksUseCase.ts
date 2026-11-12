import { Walk } from '../../domain/entities/Walk';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';

export class GetPetWalksUseCase {
  constructor(private walkRepository: IWalkRepository) {}

  async execute(petId: string): Promise<Walk[]> {
    return this.walkRepository.findCompletedByPetId(petId);
  }
}
