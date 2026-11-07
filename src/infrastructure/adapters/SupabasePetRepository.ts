import { getSupabaseClient } from '../config/supabaseClient';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { Pet } from '../../domain/entities/Pet';

interface PetRow {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  age: number | null;
  avatar_uri: string | null;
}

const toPet = (row: PetRow): Pet =>
  new Pet({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    breed: row.breed ?? undefined,
    age: row.age ?? undefined,
    avatarUri: row.avatar_uri ?? undefined,
  });

const toRow = (pet: Pet): PetRow => ({
  id: pet.id,
  user_id: pet.userId,
  name: pet.name,
  breed: pet.breed ?? null,
  age: pet.age ?? null,
  avatar_uri: pet.avatarUri ?? null,
});

/**
 * Adaptador 100% remoto contra la tabla `pets` de Supabase. No sabe nada de
 * AsyncStorage ni de la cola de sincronización: eso lo gestiona
 * `SyncedPetRepository`, que es el que de verdad se inyecta en la app.
 */
export class SupabasePetRepository implements IPetRepository {
  async findByUserId(userId: string): Promise<Pet[]> {
    const { data, error } = await getSupabaseClient()
      .from('pets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`No se pudieron obtener las mascotas de la nube: ${error.message}`);
    }

    return (data || []).map((row) => toPet(row as PetRow));
  }

  async save(pet: Pet): Promise<void> {
    const { error } = await getSupabaseClient().from('pets').upsert(toRow(pet));

    if (error) {
      throw new Error(`No se pudo guardar la mascota en la nube: ${error.message}`);
    }
  }
}
