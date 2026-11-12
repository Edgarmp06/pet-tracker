import { IWeightRepository } from '../../domain/ports/IWeightRepository';
import { WeightEntry, WeightEntryProps } from '../../domain/entities/WeightEntry';
import { SyncQueue } from './SyncQueue';

const serializeWeightEntry = (entry: WeightEntry): WeightEntryProps => ({
  id: entry.id,
  petId: entry.petId,
  weightKg: entry.weightKg,
  timestamp: entry.timestamp,
  notes: entry.notes,
});

/**
 * IWeightRepository "local-first", mismo patrón que SyncedDroppingRepository:
 * guarda primero en AsyncStorage (fuente de verdad inmediata), encola el
 * cambio y lo empuja a Supabase en segundo plano sin bloquear al que llama.
 * Si el push falla, queda en la cola para que el SyncManager lo reintente.
 */
export class SyncedWeightRepository implements IWeightRepository {
  constructor(
    private local: IWeightRepository,
    private remote: IWeightRepository,
    private syncQueue: SyncQueue,
  ) {}

  async findByPetId(petId: string): Promise<WeightEntry[]> {
    return this.local.findByPetId(petId);
  }

  async save(entry: WeightEntry): Promise<void> {
    await this.local.save(entry);

    await this.syncQueue.enqueue({
      entity: 'weight',
      entityId: entry.id,
      type: 'upsert',
      payload: serializeWeightEntry(entry),
    });

    this.pushInBackground(entry);
  }

  private pushInBackground(entry: WeightEntry): void {
    this.remote
      .save(entry)
      .then(() => this.syncQueue.remove('weight', entry.id))
      .catch((error) => {
        console.warn(
          `No se pudo sincronizar el peso ${entry.id} ahora, se reintentará más tarde:`,
          error,
        );
      });
  }
}
