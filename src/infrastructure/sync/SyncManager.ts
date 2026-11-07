import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { Pet, PetProps } from '../../domain/entities/Pet';
import { Dropping, DroppingProps } from '../../domain/entities/Dropping';
import { Walk, WalkProps } from '../../domain/entities/Walk';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { QueuedOperation, SyncQueue } from './SyncQueue';

interface RemoteRepositories {
  pet?: IPetRepository;
  dropping?: IDroppingRepository;
  walk?: IWalkRepository;
}

/**
 * Orquesta la sincronización en segundo plano: escucha la conectividad del
 * dispositivo y, al recuperar la red, reintenta lo que haya quedado
 * pendiente en la `SyncQueue`. También expone `syncNow()` para forzarlo
 * manualmente (p.ej. al reabrir la app).
 */
export class SyncManager {
  private unsubscribeNetInfo: NetInfoSubscription | null = null;

  constructor(
    private syncQueue: SyncQueue,
    private remoteRepositories: RemoteRepositories,
  ) {}

  start(): void {
    if (this.unsubscribeNetInfo) return;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.syncNow().catch((error) => {
          console.warn('Fallo al sincronizar tras recuperar la conexión:', error);
        });
      }
    });
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  async syncNow(): Promise<void> {
    const pending = await this.syncQueue.list();

    for (const op of pending) {
      try {
        const handled = await this.processOperation(op);
        if (handled) {
          await this.syncQueue.remove(op.entity, op.entityId);
        }
      } catch (error) {
        console.warn(
          `No se pudo sincronizar ${op.entity}:${op.entityId}, se reintentará más tarde:`,
          error,
        );
      }
    }
  }

  /**
   * Devuelve `true` si la operación se procesó (y por tanto puede salir de
   * la cola). Nota: `op.payload` viene de un ciclo JSON.stringify/parse por
   * el paso por AsyncStorage, así que campos como `timestamp`/`startTime`
   * llegan como strings ISO, no como `Date`, y `route`/`location` como
   * objetos planos, no como `Location`. Los tres adaptadores Supabase*
   * solo leen propiedades (nunca llaman a métodos de esas clases), así que
   * reconstruir la entidad con el constructor es seguro tal cual.
   */
  private async processOperation(op: QueuedOperation): Promise<boolean> {
    if (op.entity === 'pet' && this.remoteRepositories.pet) {
      if (op.type === 'upsert') {
        await this.remoteRepositories.pet.save(new Pet(op.payload as PetProps));
      }
      // El borrado se añadirá cuando exista un caso de uso de eliminación.
      return true;
    }

    if (op.entity === 'dropping' && this.remoteRepositories.dropping) {
      if (op.type === 'upsert') {
        await this.remoteRepositories.dropping.save(
          new Dropping(op.payload as DroppingProps),
        );
      }
      return true;
    }

    if (op.entity === 'walk' && this.remoteRepositories.walk) {
      if (op.type === 'upsert') {
        await this.remoteRepositories.walk.save(new Walk(op.payload as WalkProps));
      }
      return true;
    }

    // Entidad todavía no migrada a sync, o repositorio remoto no inyectado
    // (p.ej. Supabase no configurado): la dejamos en cola.
    return false;
  }
}
