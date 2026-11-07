export interface LocationProps {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export class Location {
  readonly latitude: number;
  readonly longitude: number;

  constructor(props: LocationProps) {
    if (props.latitude < -90 || props.latitude > 90) {
      throw new Error('Latitud inválida');
    }
    if (props.longitude < -180 || props.longitude > 180) {
      throw new Error('Longitud inválida');
    }
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }

  /** Distancia en metros respecto a otro punto, usando la fórmula de Haversine. */
  distanceTo(other: Location): number {
    const dLat = toRadians(other.latitude - this.latitude);
    const dLon = toRadians(other.longitude - this.longitude);
    const lat1 = toRadians(this.latitude);
    const lat2 = toRadians(other.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
  }
}
