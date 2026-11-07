export interface LocationProps {
  latitude: number;
  longitude: number;
}

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
}
