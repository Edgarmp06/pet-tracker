import { Walk } from '../../domain/entities/Walk';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';

export class StartWalkUseCase {
  constructor(private walkRepository: IWalkRepository) {}

  async execute(petIds: string[]): Promise<Walk> {
    if (petIds.length === 0) {
      throw new Error('Selecciona al menos una mascota para el paseo.');
    }

    for (const petId of petIds) {
      const activeWalk = await this.walkRepository.findActiveByPetId(petId);
      if (activeWalk) {
        throw new Error('Una de las mascotas seleccionadas ya tiene un paseo en curso');
      }
    }

    const walk = new Walk({
      id: Math.random().toString(36).substring(2, 9),
      petIds,
      startTime: new Date(),
      route: [],
    });

    await this.walkRepository.save(walk);
    return walk;
  }
}
