import { Walk } from '../../domain/entities/Walk';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';

export class StartWalkUseCase {
  constructor(private walkRepository: IWalkRepository) {}

  async execute(petId: string): Promise<Walk> {
    const activeWalk = await this.walkRepository.findActiveByPetId(petId);
    if (activeWalk) {
      throw new Error('La mascota ya tiene un paseo en curso');
    }

    const walk = new Walk({
      id: Math.random().toString(36).substring(2, 9),
      petId,
      startTime: new Date(),
      route: [],
    });

    await this.walkRepository.save(walk);
    return walk;
  }
}
