import AsyncStorage from '@react-native-async-storage/async-storage';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { Pet } from '../../domain/entities/Pet';

const PETS_KEY = '@pet_tracker_pets';

export class AsyncStoragePetRepository implements IPetRepository {
  async findByUserId(userId: string): Promise<Pet[]> {
    const json = await AsyncStorage.getItem(PETS_KEY);
    if (!json) return [];
    const rawData = JSON.parse(json);
    return rawData
      .filter((item: any) => item.userId === userId)
      .map((item: any) => new Pet(item));
  }

  async save(pet: Pet): Promise<void> {
    const json = await AsyncStorage.getItem(PETS_KEY);
    const existing: any[] = json ? JSON.parse(json) : [];
    const index = existing.findIndex(p => p.id === pet.id);

    if (index >= 0) {
      existing[index] = pet;
    } else {
      existing.push(pet);
    }

    await AsyncStorage.setItem(PETS_KEY, JSON.stringify(existing));
  }
}