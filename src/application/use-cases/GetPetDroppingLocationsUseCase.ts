import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { PoopConsistency } from '../../domain/entities/Dropping';

export interface DroppingHeatPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

/**
 * Peso relativo de cada deposición en el heatmap: las anómalas (diarrea,
 * blanda) pesan más para que esas zonas destaquen visualmente frente a las
 * normales/duras, que son la base esperable.
 */
const WEIGHT_BY_CONSISTENCY: Record<PoopConsistency, number> = {
  diarrhea: 3,
  soft: 2,
  normal: 1,
  hard: 1,
};

export class GetPetDroppingLocationsUseCase {
  constructor(private droppingRepository: IDroppingRepository) {}

  /**
   * Devuelve los puntos con ubicación GPS de las deposiciones de una
   * mascota en los últimos `days` días, listos para pintar en un Heatmap.
   * Las deposiciones sin ubicación (p.ej. registradas sin GPS) se omiten.
   */
  async execute(petId: string, days: number): Promise<DroppingHeatPoint[]> {
    const droppings = await this.droppingRepository.findByPetId(petId);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    return droppings
      .filter((d) => d.location && d.timestamp.getTime() >= since)
      .map((d) => ({
        latitude: d.location!.latitude,
        longitude: d.location!.longitude,
        weight: WEIGHT_BY_CONSISTENCY[d.consistency || 'normal'],
      }));
  }
}
