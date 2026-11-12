import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PoopConsistency } from '../../domain/entities/Dropping';
import {
  ClinicalMetrics,
  WeeklyMetricBucket,
} from '../../application/use-cases/GetClinicalMetricsUseCase';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  metrics: ClinicalMetrics | null;
}

const CONSISTENCY_COLORS: Record<PoopConsistency, string> = {
  normal: '#4CAF50',
  soft: '#FBC02D',
  hard: '#8D6E63',
  diarrhea: '#F44336',
};

const CONSISTENCY_LABELS: { key: PoopConsistency; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'soft', label: 'Blanda' },
  { key: 'hard', label: 'Dura' },
  { key: 'diarrhea', label: 'Diarrea' },
];

const BAR_MAX_HEIGHT = 90;

type Styles = ReturnType<typeof createStyles>;

const TrendBar: React.FC<{
  bucket: WeeklyMetricBucket;
  maxTotal: number;
  styles: Styles;
}> = ({ bucket, maxTotal, styles }) => {
  const heightRatio = maxTotal > 0 ? bucket.total / maxTotal : 0;

  return (
    <View style={styles.trendBarColumn}>
      <View style={styles.trendBarTrack}>
        <View
          style={[
            styles.trendBarFill,
            { height: Math.max(2, heightRatio * BAR_MAX_HEIGHT) },
          ]}
        />
      </View>
      <Text style={styles.trendBarValue}>{bucket.total}</Text>
      <Text style={styles.trendBarLabel}>{bucket.label}</Text>
    </View>
  );
};

export const ClinicalMetricsChart: React.FC<Props> = ({ metrics }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!metrics || metrics.totalCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="trending-up-outline"
          size={28}
          color={colors.textMuted}
          style={styles.emptyStateIcon}
        />
        <Text style={styles.emptyStateText}>
          No hay suficientes registros en este periodo para generar gráficas.
        </Text>
      </View>
    );
  }

  const maxTotal = Math.max(...metrics.weeklyBuckets.map((b) => b.total), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Tendencia de deposiciones</Text>
      <View style={styles.trendRow}>
        {metrics.weeklyBuckets.map((bucket) => (
          <TrendBar
            key={bucket.label}
            bucket={bucket}
            maxTotal={maxTotal}
            styles={styles}
          />
        ))}
      </View>

      <Text style={[styles.chartTitle, styles.secondChartTitle]}>
        Consistencia acumulada
      </Text>
      <View style={styles.consistencyList}>
        {CONSISTENCY_LABELS.map(({ key, label }) => {
          const count = metrics.totalsByConsistency[key];
          const ratio =
            metrics.totalCount > 0 ? count / metrics.totalCount : 0;

          return (
            <View key={key} style={styles.consistencyRow}>
              <Text style={styles.consistencyLabel}>{label}</Text>
              <View style={styles.consistencyTrack}>
                <View
                  style={[
                    styles.consistencyFill,
                    {
                      width: `${Math.max(4, ratio * 100)}%`,
                      backgroundColor: CONSISTENCY_COLORS[key],
                    },
                  ]}
                />
              </View>
              <Text style={styles.consistencyCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { width: '100%' },
    chartTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    secondChartTitle: { marginTop: 18 },
    trendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    trendBarColumn: { alignItems: 'center', flex: 1 },
    trendBarTrack: {
      height: BAR_MAX_HEIGHT,
      width: 18,
      justifyContent: 'flex-end',
    },
    trendBarFill: {
      width: '100%',
      backgroundColor: '#1976D2',
      borderRadius: 4,
    },
    trendBarValue: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 4,
    },
    trendBarLabel: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    consistencyList: { width: '100%' },
    consistencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    consistencyLabel: { width: 58, fontSize: 12, color: colors.textMuted },
    consistencyTrack: {
      flex: 1,
      height: 10,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 5,
      marginHorizontal: 8,
      overflow: 'hidden',
    },
    consistencyFill: { height: '100%', borderRadius: 5 },
    consistencyCount: {
      width: 24,
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'right',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    emptyStateIcon: { marginBottom: 8 },
    emptyStateText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
  });
