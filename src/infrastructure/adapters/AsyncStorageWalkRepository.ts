import AsyncStorage from '@react-native-async-storage/async-storage';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { Walk } from '../../domain/entities/Walk';
import { Location } from '../../domain/value-objects/Location';

const STORAGE_KEY = '@pet_tracker_walks';

export class AsyncStorageWalkRepository implements IWalkRepository {
  private async readAll(): Promise<any[]> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer el historial de paseos:', error);
      throw new Error('No se pudo acceder al almacenamiento local.');
    }

    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Historial de paseos corrupto, se ignora:', error);
      return [];
    }
  }

  private toWalk(item: any): Walk {
    return new Walk({
      id: item.id,
      petId: item.petId,
      startTime: new Date(item.startTime),
      endTime: item.endTime ? new Date(item.endTime) : undefined,
      route: (item.route || []).map((loc: any) => new Location(loc)),
      distanceMeters: item.distanceMeters,
    });
  }

  async save(walk: Walk): Promise<void> {
    const all = await this.readAll();
    const index = all.findIndex((item) => item.id === walk.id);
    const serialized = {
      id: walk.id,
      petId: walk.petId,
      startTime: walk.startTime,
      endTime: walk.endTime,
      route: walk.route,
      distanceMeters: walk.distanceMeters,
    };

    if (index >= 0) {
      all[index] = serialized;
    } else {
      all.push(serialized);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('No se pudo guardar el paseo:', error);
      throw new Error('No se pudo guardar el paseo en el almacenamiento local.');
    }
  }

  async findById(id: string): Promise<Walk | null> {
    const all = await this.readAll();
    const item = all.find((w) => w.id === id);
    return item ? this.toWalk(item) : null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    const all = await this.readAll();
    const item = all.find((w) => w.petId === petId && !w.endTime);
    return item ? this.toWalk(item) : null;
  }
}
