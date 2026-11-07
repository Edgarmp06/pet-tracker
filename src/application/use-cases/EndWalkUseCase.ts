import { Walk } from '../../domain/entities/Walk';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { Location } from '../../domain/value-objects/Location';

export interface EndWalkDTO {
  walkId: string;
  /** Ruta completa acumulada en memoria durante el paseo. */
  route: Location[];
}

export class EndWalkUseCase {
  constructor(private walkRepository: IWalkRepository) {}

  async execute(dto: EndWalkDTO): Promise<Walk> {
    const walk = await this.walkRepository.findById(dto.walkId);
    if (!walk) {
      throw new Error('No se encontró el paseo indicado.');
    }
    if (walk.endTime) {
      throw new Error('El paseo ya ha finalizado.');
    }

    for (const location of dto.route) {
      walk.addLocation(location);
    }
    walk.endWalk();

    await this.walkRepository.save(walk);
    return walk;
  }
}
