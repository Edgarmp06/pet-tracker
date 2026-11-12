import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pet_tracker_sync_queue';

export type SyncEntity = 'pet' | 'dropping' | 'walk' | 'weight';
export type SyncOperationType = 'upsert' | 'delete';

export interface QueuedOperation<T = unknown> {
  entity: SyncEntity;
  entityId: string;
  type: SyncOperationType;
  payload: T;
  enqueuedAt: string;
}

type QueueMap = Record<string, QueuedOperation>;

const keyFor = (entity: SyncEntity, entityId: string) => `${entity}:${entityId}`;

/**
 * "Outbox" local-first persistido en AsyncStorage. Cada operación se indexa
 * por `entidad:id`, así que si la misma mascota/deposición/paseo se guarda
 * varias veces antes de sincronizar, solo queda pendiente la versión más
 * reciente (no se acumulan reintentos redundantes).
 */
export class SyncQueue {
  private async readAll(): Promise<QueueMap> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer la cola de sincronización:', error);
      return {};
    }

    if (!json) return {};

    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Cola de sincronización corrupta, se ignora:', error);
      return {};
    }
  }

  private async writeAll(map: QueueMap): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (error) {
      console.error('No se pudo guardar la cola de sincronización:', error);
      throw new Error('No se pudo registrar el cambio para sincronizar más tarde.');
    }
  }

  async enqueue<T>(
    op: Omit<QueuedOperation<T>, 'enqueuedAt'>,
  ): Promise<void> {
    const all = await this.readAll();
    all[keyFor(op.entity, op.entityId)] = {
      ...op,
      enqueuedAt: new Date().toISOString(),
    };
    await this.writeAll(all);
  }

  async remove(entity: SyncEntity, entityId: string): Promise<void> {
    const all = await this.readAll();
    delete all[keyFor(entity, entityId)];
    await this.writeAll(all);
  }

  async list(): Promise<QueuedOperation[]> {
    const all = await this.readAll();
    return Object.values(all);
  }

  async listByEntity(entity: SyncEntity): Promise<QueuedOperation[]> {
    return (await this.list()).filter((op) => op.entity === entity);
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo limpiar la cola de sincronización:', error);
    }
  }
}
