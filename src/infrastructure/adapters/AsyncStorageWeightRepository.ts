import AsyncStorage from '@react-native-async-storage/async-storage';
import { IWeightRepository } from '../../domain/ports/IWeightRepository';
import { WeightEntry } from '../../domain/entities/WeightEntry';

const STORAGE_KEY = '@pet_tracker_weights';

export class AsyncStorageWeightRepository implements IWeightRepository {
  private async readAll(): Promise<any[]> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer el historial de peso:', error);
      throw new Error('No se pudo acceder al almacenamiento local.');
    }

    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Historial de peso corrupto, se ignora:', error);
      return [];
    }
  }

  private toWeightEntry(item: any): WeightEntry {
    return new WeightEntry({
      id: item.id,
      petId: item.petId,
      weightKg: item.weightKg,
      timestamp: new Date(item.timestamp),
      notes: item.notes,
    });
  }

  async save(entry: WeightEntry): Promise<void> {
    const all = await this.readAll();
    all.push(entry);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('No se pudo guardar el peso:', error);
      throw new Error('No se pudo guardar el peso en el almacenamiento local.');
    }
  }

  async findByPetId(petId: string): Promise<WeightEntry[]> {
    const all = await this.readAll();
    return all
      .filter((item: any) => item.petId === petId)
      .map((item: any) => this.toWeightEntry(item));
  }
}
