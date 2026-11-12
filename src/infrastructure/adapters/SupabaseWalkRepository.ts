import { getSupabaseClient } from '../config/supabaseClient';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { Walk } from '../../domain/entities/Walk';
import { Location } from '../../domain/value-objects/Location';

interface WalkRow {
  id: string;
  pet_ids: string[];
  start_time: string;
  end_time: string | null;
  distance_meters: number;
  route: { latitude: number; longitude: number }[] | null;
}

const toWalk = (row: WalkRow): Walk =>
  new Walk({
    id: row.id,
    petIds: row.pet_ids || [],
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    route: (row.route || []).map((loc) => new Location(loc)),
    distanceMeters: row.distance_meters,
  });

// Ver el comentario equivalente en SupabaseDroppingRepository: `Walk` no
// lleva `userId`, así que se toma de la sesión de Supabase activa.
const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) {
    throw new Error('No hay una sesión de Supabase activa.');
  }
  return data.user.id;
};

/**
 * Adaptador 100% remoto contra la tabla `walks` de Supabase. No sabe nada
 * de AsyncStorage ni de la cola de sincronización: eso lo gestiona
 * `SyncedWalkRepository`, que es el que de verdad se inyecta en la app.
 */
export class SupabaseWalkRepository implements IWalkRepository {
  async findById(id: string): Promise<Walk | null> {
    const { data, error } = await getSupabaseClient()
      .from('walks')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo obtener el paseo de la nube: ${error.message}`);
    }

    return data ? toWalk(data as WalkRow) : null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    const { data, error } = await getSupabaseClient()
      .from('walks')
      .select('*')
      .contains('pet_ids', [petId])
      .is('end_time', null)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(
        `No se pudo comprobar el paseo activo en la nube: ${error.message}`,
      );
    }

    return data ? toWalk(data as WalkRow) : null;
  }

  async findCompletedByPetId(petId: string): Promise<Walk[]> {
    const { data, error } = await getSupabaseClient()
      .from('walks')
      .select('*')
      .contains('pet_ids', [petId])
      .not('end_time', 'is', null)
      .is('deleted_at', null)
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(
        `No se pudieron obtener los paseos de la nube: ${error.message}`,
      );
    }

    return (data || []).map((row) => toWalk(row as WalkRow));
  }

  async save(walk: Walk): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await getSupabaseClient().from('walks').upsert({
      id: walk.id,
      pet_ids: walk.petIds,
      user_id: userId,
      start_time: walk.startTime,
      end_time: walk.endTime ?? null,
      distance_meters: walk.distanceMeters,
      route: walk.route,
    });

    if (error) {
      throw new Error(`No se pudo guardar el paseo en la nube: ${error.message}`);
    }
  }
}
