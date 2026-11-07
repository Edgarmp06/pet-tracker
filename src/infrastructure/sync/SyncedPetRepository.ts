import { IPetRepository } from '../../domain/ports/IPetRepository';
import { Pet, PetProps } from '../../domain/entities/Pet';
import { SyncQueue } from './SyncQueue';

const serializePet = (pet: Pet): PetProps => ({
  id: pet.id,
  userId: pet.userId,
  name: pet.name,
  breed: pet.breed,
  age: pet.age,
  avatarUri: pet.avatarUri,
});

/**
 * IPetRepository "local-first": toda lectura/escritura pasa primero por el
 * repositorio local (AsyncStorage), que es la fuente de verdad inmediata
 * para la UI. Cada guardado se encola para sincronizar y, además, se
 * intenta empujar a Supabase en segundo plano sin bloquear al que llama;
 * si falla (sin red, p.ej.), el `SyncManager` se encarga de reintentarlo
 * más adelante desde la cola.
 *
 * Nota de alcance: esta primera fase solo sincroniza local -> nube (push).
 * Leer y fusionar cambios hechos desde otro dispositivo (pull) queda para
 * una iteración posterior.
 */
export class SyncedPetRepository implements IPetRepository {
  constructor(
    private local: IPetRepository,
    private remote: IPetRepository,
    private syncQueue: SyncQueue,
  ) {}

  async findByUserId(userId: string): Promise<Pet[]> {
    return this.local.findByUserId(userId);
  }

  async save(pet: Pet): Promise<void> {
    await this.local.save(pet);

    await this.syncQueue.enqueue({
      entity: 'pet',
      entityId: pet.id,
      type: 'upsert',
      payload: serializePet(pet),
    });

    this.pushInBackground(pet);
  }

  private pushInBackground(pet: Pet): void {
    this.remote
      .save(pet)
      .then(() => this.syncQueue.remove('pet', pet.id))
      .catch((error) => {
        console.warn(
          `No se pudo sincronizar la mascota ${pet.id} ahora, se reintentará más tarde:`,
          error,
        );
      });
  }
}
