import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, {
  Heatmap,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { DroppingHeatPoint } from '../../application/use-cases/GetPetDroppingLocationsUseCase';

interface Props {
  points: DroppingHeatPoint[];
}

const DEFAULT_REGION = {
  latitude: 39.4699,
  longitude: -0.3763,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const getRegionForPoints = (points: DroppingHeatPoint[]) => {
  if (points.length === 0) return DEFAULT_REGION;

  const avgLat =
    points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const avgLon =
    points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

  return {
    latitude: avgLat,
    longitude: avgLon,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
};

export const HeatmapView: React.FC<Props> = ({ points }) => {
  if (points.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="map-outline"
          size={32}
          color="#888"
          style={styles.emptyStateIcon}
        />
        <Text style={styles.emptyStateText}>
          Sin datos de ubicación registrados en este periodo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        // El Heatmap nativo de react-native-maps solo está soportado por
        // Google Maps; en Android el proveedor por defecto YA es Google,
        // pero en iOS hace falta forzarlo (y configurar una API key de
        // Google Maps en app.json) para que la capa se renderice.
        provider={Platform.OS === 'ios' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={getRegionForPoints(points)}
      >
        <Heatmap
          points={points}
          radius={40}
          opacity={0.8}
          gradient={{
            colors: ['#4CAF50', '#FBC02D', '#F44336'],
            startPoints: [0.2, 0.6, 1],
            colorMapSize: 256,
          }}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyStateIcon: { marginBottom: 8 },
  emptyStateText: { fontSize: 13, color: '#888', textAlign: 'center' },
});
