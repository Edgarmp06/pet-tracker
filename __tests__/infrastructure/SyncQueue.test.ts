import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';

describe('SyncQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('encola y lista una operación pendiente', async () => {
    const queue = new SyncQueue();

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { name: 'Max' },
    });

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe('pet-1');
  });

  it('coalesce: encolar la misma entidad dos veces solo deja la versión más reciente', async () => {
    const queue = new SyncQueue();

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { name: 'Max' },
    });
    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { name: 'Max (actualizado)' },
    });

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect((pending[0].payload as { name: string }).name).toBe('Max (actualizado)');
  });

  it('no mezcla operaciones de distintas entidades/ids', async () => {
    const queue = new SyncQueue();

    await queue.enqueue({ entity: 'pet', entityId: 'pet-A', type: 'upsert', payload: {} });
    await queue.enqueue({ entity: 'pet', entityId: 'pet-B', type: 'upsert', payload: {} });
    await queue.enqueue({ entity: 'walk', entityId: 'pet-A', type: 'upsert', payload: {} });

    expect(await queue.list()).toHaveLength(3);
    expect(await queue.listByEntity('pet')).toHaveLength(2);
  });

  it('remove() elimina solo la operación indicada', async () => {
    const queue = new SyncQueue();

    await queue.enqueue({ entity: 'pet', entityId: 'pet-A', type: 'upsert', payload: {} });
    await queue.enqueue({ entity: 'pet', entityId: 'pet-B', type: 'upsert', payload: {} });

    await queue.remove('pet', 'pet-A');

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe('pet-B');
  });
});
