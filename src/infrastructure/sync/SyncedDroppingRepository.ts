import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { Dropping, DroppingProps } from '../../domain/entities/Dropping';
import { SyncQueue } from './SyncQueue';

const serializeDropping = (dropping: Dropping): DroppingProps => ({
  id: dropping.id,
  petId: dropping.petId,
  walkId: dropping.walkId,
  location: dropping.location,
  timestamp: dropping.timestamp,
  photoUrl: dropping.photoUrl,
  notes: dropping.notes,
  consistency: dropping.consistency,
  color: dropping.color,
});

/**
 * IDroppingRepository "local-first", mismo patrón que SyncedPetRepository:
 * guarda primero en AsyncStorage (fuente de verdad inmediata), encola el
 * cambio y lo empuja a Supabase en segundo plano sin bloquear al que llama.
 * Si el push falla, queda en la cola para que el SyncManager lo reintente.
 */
export class SyncedDroppingRepository implements IDroppingRepository {
  constructor(
    private local: IDroppingRepository,
    private remote: IDroppingRepository,
    private syncQueue: SyncQueue,
  ) {}

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.local.findByPetId(petId);
  }

  async save(dropping: Dropping): Promise<void> {
    await this.local.save(dropping);

    await this.syncQueue.enqueue({
      entity: 'dropping',
      entityId: dropping.id,
      type: 'upsert',
      payload: serializeDropping(dropping),
    });

    this.pushInBackground(dropping);
  }

  private pushInBackground(dropping: Dropping): void {
    this.remote
      .save(dropping)
      .then(() => this.syncQueue.remove('dropping', dropping.id))
      .catch((error) => {
        console.warn(
          `No se pudo sincronizar la deposición ${dropping.id} ahora, se reintentará más tarde:`,
          error,
        );
      });
  }
}
