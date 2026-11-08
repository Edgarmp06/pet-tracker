import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { Walk, WalkProps } from '../../domain/entities/Walk';
import { SyncQueue } from './SyncQueue';

const serializeWalk = (walk: Walk): WalkProps => ({
  id: walk.id,
  petIds: walk.petIds,
  startTime: walk.startTime,
  endTime: walk.endTime,
  route: walk.route,
  distanceMeters: walk.distanceMeters,
});

/**
 * IWalkRepository "local-first", mismo patrón que SyncedPetRepository: toda
 * lectura va contra AsyncStorage (local-first); cada guardado se persiste
 * primero en local, se encola y se intenta empujar a Supabase en segundo
 * plano sin bloquear al que llama.
 */
export class SyncedWalkRepository implements IWalkRepository {
  constructor(
    private local: IWalkRepository,
    private remote: IWalkRepository,
    private syncQueue: SyncQueue,
  ) {}

  async findById(id: string): Promise<Walk | null> {
    return this.local.findById(id);
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    return this.local.findActiveByPetId(petId);
  }

  async save(walk: Walk): Promise<void> {
    await this.local.save(walk);

    await this.syncQueue.enqueue({
      entity: 'walk',
      entityId: walk.id,
      type: 'upsert',
      payload: serializeWalk(walk),
    });

    this.pushInBackground(walk);
  }

  private pushInBackground(walk: Walk): void {
    this.remote
      .save(walk)
      .then(() => this.syncQueue.remove('walk', walk.id))
      .catch((error) => {
        console.warn(
          `No se pudo sincronizar el paseo ${walk.id} ahora, se reintentará más tarde:`,
          error,
        );
      });
  }
}
