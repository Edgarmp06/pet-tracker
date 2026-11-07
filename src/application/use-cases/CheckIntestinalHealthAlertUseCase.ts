import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { INotificationService } from '../../domain/ports/INotificationService';

/**
 * Número de deposiciones consecutivas de diarrea (las más recientes) a
 * partir del cual se avisa al usuario. Solo se cuenta "diarrea" en sentido
 * estricto: "blanda" no tiene un marcador de severidad en el dominio, así
 * que incluirla generaría falsos positivos con fluctuaciones normales.
 */
const CONSECUTIVE_DIARRHEA_THRESHOLD = 2;

export class CheckIntestinalHealthAlertUseCase {
  constructor(
    private droppingRepository: IDroppingRepository,
    private notificationService: INotificationService,
  ) {}

  /**
   * Analiza las deposiciones más recientes de una mascota. Si las últimas
   * `CONSECUTIVE_DIARRHEA_THRESHOLD` (o más) son de diarrea, dispara una
   * notificación local inmediata y devuelve `true`.
   */
  async execute(petId: string, petName?: string): Promise<boolean> {
    const droppings = await this.droppingRepository.findByPetId(petId);
    const sortedByMostRecent = [...droppings].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    let consecutiveDiarrhea = 0;
    for (const dropping of sortedByMostRecent) {
      if (dropping.consistency === 'diarrhea') {
        consecutiveDiarrhea += 1;
      } else {
        break;
      }
    }

    const shouldAlert = consecutiveDiarrhea >= CONSECUTIVE_DIARRHEA_THRESHOLD;

    if (shouldAlert) {
      await this.notificationService.sendImmediateNotification(
        '⚠️ Posible problema intestinal',
        `${petName || 'Tu mascota'} ha tenido ${consecutiveDiarrhea} deposiciones de diarrea seguidas. ` +
          'Te recomendamos consultar con el veterinario.',
      );
    }

    return shouldAlert;
  }
}
