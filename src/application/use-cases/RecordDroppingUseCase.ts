import { Dropping, PoopConsistency } from '../../domain/entities/Dropping';
import { Location } from '../../domain/value-objects/Location';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';

export interface RecordDroppingDTO {
  petId: string;
  walkId?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  notes?: string;
  consistency?: PoopConsistency;
  color?: string; // 👈 Cambiado a string para admitir el color directo
}

export class RecordDroppingUseCase {
  constructor(private droppingRepository: IDroppingRepository) {}

  async execute(dto: RecordDroppingDTO): Promise<Dropping> {
    let location: Location | undefined;
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      location = new Location({
        latitude: dto.latitude,
        longitude: dto.longitude,
      });
    }

    const dropping = new Dropping({
      id: Math.random().toString(36).substring(2, 9),
      petId: dto.petId,
      walkId: dto.walkId,
      location,
      timestamp: new Date(),
      photoUrl: dto.photoUrl,
      notes: dto.notes,
      consistency: dto.consistency,
      color: dto.color,
    });

    await this.droppingRepository.save(dropping);
    return dropping;
  }
}
