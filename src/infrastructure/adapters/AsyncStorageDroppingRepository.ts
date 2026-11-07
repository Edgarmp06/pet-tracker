import AsyncStorage from '@react-native-async-storage/async-storage';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { Dropping } from '../../domain/entities/Dropping';
import { Location } from '../../domain/value-objects/Location';

const STORAGE_KEY = '@pet_tracker_droppings';

export class AsyncStorageDroppingRepository implements IDroppingRepository {
  private async readAll(): Promise<any[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json);
  }

  private toDropping(item: any): Dropping {
    return new Dropping({
      id: item.id,
      petId: item.petId,
      walkId: item.walkId,
      location: item.location ? new Location(item.location) : undefined,
      timestamp: new Date(item.timestamp),
      photoUrl: item.photoUrl,
      notes: item.notes,
      consistency: item.consistency,
      color: item.color,
    });
  }

  async save(dropping: Dropping): Promise<void> {
    const all = await this.readAll();
    all.push(dropping);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async findByPetId(petId: string): Promise<Dropping[]> {
    const all = await this.readAll();
    return all
      .filter((item: any) => item.petId === petId)
      .map((item: any) => this.toDropping(item));
  }
}
