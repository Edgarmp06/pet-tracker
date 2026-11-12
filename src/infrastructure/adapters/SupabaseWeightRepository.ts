import { getSupabaseClient } from '../config/supabaseClient';
import { IWeightRepository } from '../../domain/ports/IWeightRepository';
import { WeightEntry } from '../../domain/entities/WeightEntry';

interface WeightRow {
  id: string;
  pet_id: string;
  weight_kg: number;
  notes: string | null;
  occurred_at: string;
}

const toWeightEntry = (row: WeightRow): WeightEntry =>
  new WeightEntry({
    id: row.id,
    petId: row.pet_id,
    weightKg: row.weight_kg,
    timestamp: new Date(row.occurred_at),
    notes: row.notes ?? undefined,
  });

/**
 * `pet_weights.user_id` es NOT NULL y las políticas RLS lo exigen, pero
 * `WeightEntry` (el agregado de dominio) no lleva `userId` — solo `petId`,
 * igual que `Dropping`. Se toma el usuario de la sesión de Supabase activa
 * en el momento de guardar (ver `SupabaseDroppingRepository`).
 */
const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) {
    throw new Error('No hay una sesión de Supabase activa.');
  }
  return data.user.id;
};

/**
 * Adaptador 100% remoto contra la tabla `pet_weights` de Supabase. No sabe
 * nada de AsyncStorage ni de la cola de sincronización: eso lo gestiona
 * `SyncedWeightRepository`, que es el que de verdad se inyecta en la app.
 */
export class SupabaseWeightRepository implements IWeightRepository {
  async findByPetId(petId: string): Promise<WeightEntry[]> {
    const { data, error } = await getSupabaseClient()
      .from('pet_weights')
      .select('*')
      .eq('pet_id', petId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(
        `No se pudieron obtener los pesos de la nube: ${error.message}`,
      );
    }

    return (data || []).map((row) => toWeightEntry(row as WeightRow));
  }

  async save(entry: WeightEntry): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await getSupabaseClient().from('pet_weights').upsert({
      id: entry.id,
      pet_id: entry.petId,
      user_id: userId,
      weight_kg: entry.weightKg,
      notes: entry.notes ?? null,
      occurred_at: entry.timestamp,
    });

    if (error) {
      throw new Error(
        `No se pudo guardar el peso en la nube: ${error.message}`,
      );
    }
  }
}
