import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeightEntry } from '../../domain/entities/WeightEntry';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  /** Ordenado de más antiguo a más reciente. */
  entries: WeightEntry[];
}

const CHART_HEIGHT = 120;
const POINT_RADIUS = 4;
const POINT_SIZE = POINT_RADIUS * 2;
const LINE_COLOR = '#4CAF50';

const formatDate = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;

const formatKg = (value: number) =>
  Number.isInteger(value) ? `${value} kg` : `${value.toFixed(1)} kg`;

export const WeightChart: React.FC<Props> = ({ entries }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [chartWidth, setChartWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="scale-outline"
          size={28}
          color={colors.textMuted}
          style={styles.emptyStateIcon}
        />
        <Text style={styles.emptyStateText}>
          Aún no hay pesajes registrados. Pésala una vez por semana para ver
          aquí su evolución.
        </Text>
      </View>
    );
  }

  const latest = entries[entries.length - 1];
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;
  const first = entries[0];
  const deltaVsPrevious = previous ? latest.weightKg - previous.weightKg : 0;
  const deltaVsFirst = latest.weightKg - first.weightKg;

  const weights = entries.map((e) => e.weightKg);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const range = maxWeight - minWeight || 1;

  const points =
    chartWidth > 0
      ? entries.map((entry, index) => {
          const x =
            entries.length === 1
              ? chartWidth / 2
              : (index / (entries.length - 1)) * chartWidth;
          const ratio = (entry.weightKg - minWeight) / range;
          const y = CHART_HEIGHT - ratio * CHART_HEIGHT;
          return { x, y, entry };
        })
      : [];

  const renderDelta = (delta: number) => {
    if (Math.abs(delta) < 0.05) {
      return <Text style={styles.deltaNeutral}>= sin cambios</Text>;
    }
    const isGain = delta > 0;
    return (
      <Text style={isGain ? styles.deltaUp : styles.deltaDown}>
        {isGain ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} kg
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.latestLabel}>Último peso</Text>
          <Text style={styles.latestValue}>{formatKg(latest.weightKg)}</Text>
          <Text style={styles.latestDate}>{formatDate(latest.timestamp)}</Text>
        </View>
        <View style={styles.deltaColumn}>
          {previous && (
            <View style={styles.deltaRow}>
              <Text style={styles.deltaLabel}>vs. anterior:</Text>
              {renderDelta(deltaVsPrevious)}
            </View>
          )}
          {entries.length > 1 && (
            <View style={styles.deltaRow}>
              <Text style={styles.deltaLabel}>vs. primer registro:</Text>
              {renderDelta(deltaVsFirst)}
            </View>
          )}
        </View>
      </View>

      <View style={styles.chartArea} onLayout={onLayout}>
        {points.map((point, index) => {
          const next = points[index + 1];
          let segmentStyle = null;
          if (next) {
            const dx = next.x - point.x;
            const dy = next.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            segmentStyle = {
              position: 'absolute' as const,
              left: point.x,
              top: point.y,
              width: length,
              height: 2,
              backgroundColor: LINE_COLOR,
              transform: [{ rotate: `${angle}rad` }],
              transformOrigin: 'left center' as const,
            };
          }
          return (
            <React.Fragment key={point.entry.id}>
              {segmentStyle && <View style={segmentStyle} />}
              <View
                style={[
                  styles.point,
                  { left: point.x - POINT_RADIUS, top: point.y - POINT_RADIUS },
                ]}
              />
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{formatDate(first.timestamp)}</Text>
        {entries.length > 1 && (
          <Text style={styles.axisLabel}>{formatDate(latest.timestamp)}</Text>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { width: '100%' },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    latestLabel: { fontSize: 11, color: colors.textMuted },
    latestValue: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    latestDate: { fontSize: 11, color: colors.textMuted },
    deltaColumn: { alignItems: 'flex-end' },
    deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deltaLabel: { fontSize: 11, color: colors.textMuted },
    deltaUp: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },
    deltaDown: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50' },
    deltaNeutral: { fontSize: 12, fontWeight: 'bold', color: colors.textMuted },
    chartArea: {
      height: CHART_HEIGHT,
      width: '100%',
    },
    point: {
      position: 'absolute',
      width: POINT_SIZE,
      height: POINT_SIZE,
      borderRadius: POINT_SIZE / 2,
      backgroundColor: LINE_COLOR,
    },
    axisRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    axisLabel: { fontSize: 10, color: colors.textMuted },
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
