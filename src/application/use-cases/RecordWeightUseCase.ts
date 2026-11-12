import { WeightEntry } from '../../domain/entities/WeightEntry';
import { IWeightRepository } from '../../domain/ports/IWeightRepository';

export interface RecordWeightDTO {
  petId: string;
  weightKg: number;
  notes?: string;
}

export class RecordWeightUseCase {
  constructor(private weightRepository: IWeightRepository) {}

  async execute(dto: RecordWeightDTO): Promise<WeightEntry> {
    if (!Number.isFinite(dto.weightKg) || dto.weightKg <= 0) {
      throw new Error('El peso debe ser un número mayor que 0.');
    }

    const entry = new WeightEntry({
      id: Math.random().toString(36).substring(2, 9),
      petId: dto.petId,
      weightKg: dto.weightKg,
      timestamp: new Date(),
      notes: dto.notes,
    });

    await this.weightRepository.save(entry);
    return entry;
  }
}
