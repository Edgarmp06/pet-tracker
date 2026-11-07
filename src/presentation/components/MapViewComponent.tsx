import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Location } from '../../domain/value-objects/Location';

interface Props {
  currentLocation: Location | null;
  route: Location[];
  poopLocations: Location[];
}

export const MapViewComponent: React.FC<Props> = ({
  currentLocation,
  route,
  poopLocations,
}) => {
  const defaultRegion = {
    latitude: 39.4699,
    longitude: -0.3763,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const region = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : defaultRegion;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={currentLocation ? region : undefined}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={true}
      >
        {route.length > 1 && (
          <Polyline
            coordinates={route.map((loc) => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
            }))}
            strokeColor="#4CAF50"
            strokeWidth={4}
          />
        )}

        {poopLocations.map((loc, index) => (
          <Marker
            key={`poop-${index}`}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title="Caca 💩"
            description={new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 15,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
