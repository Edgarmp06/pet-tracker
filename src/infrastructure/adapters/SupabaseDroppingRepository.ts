import { getSupabaseClient } from '../config/supabaseClient';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { Dropping, PoopConsistency } from '../../domain/entities/Dropping';
import { Location } from '../../domain/value-objects/Location';

interface DroppingRow {
  id: string;
  pet_id: string;
  walk_id: string | null;
  latitude: number | null;
  longitude: number | null;
  consistency: PoopConsistency;
  color: string | null;
  notes: string | null;
  photo_url: string | null;
  occurred_at: string;
}

const toDropping = (row: DroppingRow): Dropping =>
  new Dropping({
    id: row.id,
    petId: row.pet_id,
    walkId: row.walk_id ?? undefined,
    location:
      row.latitude != null && row.longitude != null
        ? new Location({ latitude: row.latitude, longitude: row.longitude })
        : undefined,
    timestamp: new Date(row.occurred_at),
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
    consistency: row.consistency,
    color: row.color ?? undefined,
  });

/**
 * `droppings.user_id` es NOT NULL y las políticas RLS lo exigen, pero
 * `Dropping` (el agregado de dominio) no lleva `userId` — solo `petId`,
 * igual que en `AsyncStorageDroppingRepository`. En vez de ensanchar la
 * entidad de dominio solo para este adaptador, se toma el usuario de la
 * sesión de Supabase activa en el momento de guardar.
 */
const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) {
    throw new Error('No hay una sesión de Supabase activa.');
  }
  return data.user.id;
};

/**
 * Adaptador 100% remoto contra la tabla `droppings` de Supabase. No sabe
 * nada de AsyncStorage ni de la cola de sincronización: eso lo gestiona
 * `SyncedDroppingRepository`, que es el que de verdad se inyecta en la app.
 */
export class SupabaseDroppingRepository implements IDroppingRepository {
  async findByPetId(petId: string): Promise<Dropping[]> {
    const { data, error } = await getSupabaseClient()
      .from('droppings')
      .select('*')
      .eq('pet_id', petId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(
        `No se pudieron obtener las deposiciones de la nube: ${error.message}`,
      );
    }

    return (data || []).map((row) => toDropping(row as DroppingRow));
  }

  async save(dropping: Dropping): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await getSupabaseClient().from('droppings').upsert({
      id: dropping.id,
      pet_id: dropping.petId,
      walk_id: dropping.walkId ?? null,
      user_id: userId,
      latitude: dropping.location?.latitude ?? null,
      longitude: dropping.location?.longitude ?? null,
      consistency: dropping.consistency,
      color: dropping.color ?? null,
      notes: dropping.notes ?? null,
      photo_url: dropping.photoUrl ?? null,
      occurred_at: dropping.timestamp,
    });

    if (error) {
      throw new Error(
        `No se pudo guardar la deposición en la nube: ${error.message}`,
      );
    }
  }
}
