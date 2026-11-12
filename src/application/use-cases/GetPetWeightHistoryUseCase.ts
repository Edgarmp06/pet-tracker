import { WeightEntry } from '../../domain/entities/WeightEntry';
import { IWeightRepository } from '../../domain/ports/IWeightRepository';

export class GetPetWeightHistoryUseCase {
  constructor(private weightRepository: IWeightRepository) {}

  /** Devuelve el historial de peso de la mascota ordenado de más antiguo a más reciente. */
  async execute(petId: string): Promise<WeightEntry[]> {
    const entries = await this.weightRepository.findByPetId(petId);
    return [...entries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }
}
