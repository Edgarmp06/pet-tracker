import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { PoopConsistency } from '../../domain/entities/Dropping';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BUCKET_SIZE_DAYS = 7;

export interface WeeklyMetricBucket {
  label: string;
  total: number;
  counts: Record<PoopConsistency, number>;
}

export interface ClinicalMetrics {
  days: number;
  totalCount: number;
  totalsByConsistency: Record<PoopConsistency, number>;
  weeklyBuckets: WeeklyMetricBucket[];
}

const emptyCounts = (): Record<PoopConsistency, number> => ({
  hard: 0,
  normal: 0,
  soft: 0,
  diarrhea: 0,
});

const formatBucketLabel = (startDate: Date, endDate: Date): string => {
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(startDate)}-${fmt(endDate)}`;
};

export class GetClinicalMetricsUseCase {
  constructor(private droppingRepository: IDroppingRepository) {}

  /**
   * Agrega el historial de deposiciones de una mascota en los últimos `days`
   * días: totales por consistencia y una serie de buckets semanales (el
   * último bucket es siempre el más reciente) para dibujar una tendencia.
   */
  async execute(petId: string, days: number): Promise<ClinicalMetrics> {
    const droppings = await this.droppingRepository.findByPetId(petId);
    const now = Date.now();
    const since = now - days * MS_PER_DAY;
    const bucketCount = Math.max(1, Math.ceil(days / BUCKET_SIZE_DAYS));

    const weeklyBuckets: WeeklyMetricBucket[] = Array.from(
      { length: bucketCount },
      (_, index) => {
        const bucketsFromEnd = bucketCount - 1 - index;
        const endOffsetDays = bucketsFromEnd * BUCKET_SIZE_DAYS;
        const startOffsetDays = Math.min(days, endOffsetDays + BUCKET_SIZE_DAYS);

        return {
          label: formatBucketLabel(
            new Date(now - startOffsetDays * MS_PER_DAY),
            new Date(now - endOffsetDays * MS_PER_DAY),
          ),
          total: 0,
          counts: emptyCounts(),
        };
      },
    );

    const totalsByConsistency = emptyCounts();
    let totalCount = 0;

    for (const dropping of droppings) {
      const timestamp = dropping.timestamp.getTime();
      if (timestamp < since || timestamp > now) continue;

      const consistency = dropping.consistency || 'normal';
      totalCount += 1;
      totalsByConsistency[consistency] += 1;

      const daysAgo = Math.floor((now - timestamp) / MS_PER_DAY);
      const bucketsFromEnd = Math.min(
        bucketCount - 1,
        Math.floor(daysAgo / BUCKET_SIZE_DAYS),
      );
      const bucket = weeklyBuckets[bucketCount - 1 - bucketsFromEnd];
      bucket.total += 1;
      bucket.counts[consistency] += 1;
    }

    return { days, totalCount, totalsByConsistency, weeklyBuckets };
  }
}
