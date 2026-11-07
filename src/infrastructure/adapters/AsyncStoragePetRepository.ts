import AsyncStorage from '@react-native-async-storage/async-storage';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { Pet } from '../../domain/entities/Pet';

const PETS_KEY = '@pet_tracker_pets';

export class AsyncStoragePetRepository implements IPetRepository {
  private async readAll(): Promise<any[]> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(PETS_KEY);
    } catch (error) {
      console.error('No se pudo leer la lista de mascotas:', error);
      throw new Error('No se pudo acceder al almacenamiento local.');
    }

    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Lista de mascotas corrupta, se ignora:', error);
      return [];
    }
  }

  async findByUserId(userId: string): Promise<Pet[]> {
    const all = await this.readAll();
    return all
      .filter((item: any) => item.userId === userId)
      .map((item: any) => new Pet(item));
  }

  async save(pet: Pet): Promise<void> {
    const existing = await this.readAll();
    const index = existing.findIndex((p) => p.id === pet.id);

    if (index >= 0) {
      existing[index] = pet;
    } else {
      existing.push(pet);
    }

    try {
      await AsyncStorage.setItem(PETS_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('No se pudo guardar la mascota:', error);
      throw new Error('No se pudo guardar la mascota en el almacenamiento local.');
    }
  }
}
