import AsyncStorage from '@react-native-async-storage/async-storage';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { Dropping } from '../../domain/entities/Dropping';
import { Location } from '../../domain/value-objects/Location';

const STORAGE_KEY = '@pet_tracker_droppings';

export class AsyncStorageDroppingRepository implements IDroppingRepository {
  async save(dropping: Dropping): Promise<void> {
    const existing = await this.findByPetId(dropping.petId);
    const updated = [...existing, dropping];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async findByPetId(petId: string): Promise<Dropping[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];

    const rawData = JSON.parse(json);
    return rawData
      .filter((item: any) => item.petId === petId)
      .map(
        (item: any) =>
          new Dropping({
            id: item.id,
            petId: item.petId,
            walkId: item.walkId,
            location: item.location ? new Location(item.location) : undefined,
            timestamp: new Date(item.timestamp),
            photoUrl: item.photoUrl,
            notes: item.notes,
            consistency: item.consistency,
            color: item.color, // 👈 Asegúrate de que pasa el campo color real deserializado
          }),
      );
  }
}
