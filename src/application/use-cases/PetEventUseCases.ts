import { PetEvent, PetEventType } from '../../domain/entities/PetEvent';
import { IPetEventRepository } from '../../domain/ports/IPetEventRepository';

export interface RecordPetEventDTO {
  petId: string;
  type: PetEventType;
  notes?: string;
  foodAmount?: string;
  medicineName?: string;
  dose?: string;
  nextDoseAt?: Date;
}

export class RecordPetEventUseCase {
  constructor(private petEventRepository: IPetEventRepository) {}

  async execute(dto: RecordPetEventDTO): Promise<PetEvent> {
    const event = new PetEvent({
      id: 'event_' + Math.random().toString(36).substring(2, 9),
      petId: dto.petId,
      type: dto.type,
      timestamp: new Date(),
      notes: dto.notes,
      foodAmount: dto.foodAmount,
      medicineName: dto.medicineName,
      dose: dto.dose,
      nextDoseAt: dto.nextDoseAt,
    });

    await this.petEventRepository.save(event);
    return event;
  }
}

export class GetPetEventsUseCase {
  constructor(private petEventRepository: IPetEventRepository) {}

  async execute(petId: string): Promise<PetEvent[]> {
    return this.petEventRepository.findByPetId(petId);
  }
}
