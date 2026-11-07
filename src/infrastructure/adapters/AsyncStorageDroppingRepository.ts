import AsyncStorage from '@react-native-async-storage/async-storage';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { Dropping } from '../../domain/entities/Dropping';
import { Location } from '../../domain/value-objects/Location';

const STORAGE_KEY = '@pet_tracker_droppings';

export class AsyncStorageDroppingRepository implements IDroppingRepository {
  private async readAll(): Promise<any[]> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer el historial de deposiciones:', error);
      throw new Error('No se pudo acceder al almacenamiento local.');
    }

    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Historial de deposiciones corrupto, se ignora:', error);
      return [];
    }
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

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('No se pudo guardar la deposición:', error);
      throw new Error('No se pudo guardar la deposición en el almacenamiento local.');
    }
  }

  async findByPetId(petId: string): Promise<Dropping[]> {
    const all = await this.readAll();
    return all
      .filter((item: any) => item.petId === petId)
      .map((item: any) => this.toDropping(item));
  }
}
