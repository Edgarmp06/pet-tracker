import AsyncStorage from '@react-native-async-storage/async-storage';
import { IPetEventRepository } from '../../domain/ports/IPetEventRepository';
import { PetEvent } from '../../domain/entities/PetEvent';

const STORAGE_KEY = '@pet_tracker_pet_events';

// Solo local por ahora: a diferencia de Pet/Dropping/Walk, los eventos de
// rutina (alimentación, medicación) todavía no se sincronizan con Supabase.
export class AsyncStoragePetEventRepository implements IPetEventRepository {
  private async readAll(): Promise<any[]> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer el historial de eventos:', error);
      throw new Error('No se pudo acceder al almacenamiento local.');
    }

    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Historial de eventos corrupto, se ignora:', error);
      return [];
    }
  }

  private toPetEvent(item: any): PetEvent {
    return new PetEvent({
      id: item.id,
      petId: item.petId,
      type: item.type,
      timestamp: new Date(item.timestamp),
      notes: item.notes,
    });
  }

  async save(event: PetEvent): Promise<void> {
    const all = await this.readAll();
    all.push(event);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('No se pudo guardar el evento:', error);
      throw new Error('No se pudo guardar el evento en el almacenamiento local.');
    }
  }

  async findByPetId(petId: string): Promise<PetEvent[]> {
    const all = await this.readAll();
    return all
      .filter((item: any) => item.petId === petId)
      .map((item: any) => this.toPetEvent(item));
  }
}
