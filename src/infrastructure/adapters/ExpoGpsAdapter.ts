import * as ExpoLocation from 'expo-location';
import { IGpsService } from '../../domain/ports/IGpsService';
import { Location } from '../../domain/value-objects/Location';

export class ExpoGpsAdapter implements IGpsService {
  async requestPermissions(): Promise<boolean> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentLocation(): Promise<Location | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const locationData = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      return new Location({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
    } catch (error) {
      console.error('Error al obtener la ubicación GPS:', error);
      return null;
    }
  }
}
