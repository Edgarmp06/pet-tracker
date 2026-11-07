import { Location } from '../value-objects/Location';

export interface WalkProps {
  id: string;
  petId: string;
  startTime: Date;
  endTime?: Date;
  route: Location[];
  distanceMeters?: number;
}

export class Walk {
  readonly id: string;
  readonly petId: string;
  readonly startTime: Date;
  private _endTime?: Date;
  private _route: Location[];
  private _distanceMeters: number;

  constructor(props: WalkProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.startTime = props.startTime;
    this._endTime = props.endTime;
    this._route = props.route || [];
    this._distanceMeters =
      props.distanceMeters ?? Walk.calculateDistanceMeters(this._route);
  }

  get endTime(): Date | undefined {
    return this._endTime;
  }

  get route(): Location[] {
    return [...this._route];
  }

  get distanceMeters(): number {
    return this._distanceMeters;
  }

  /** Duración del paseo en milisegundos; `undefined` si aún está en curso. */
  get durationMs(): number | undefined {
    if (!this._endTime) return undefined;
    return this._endTime.getTime() - this.startTime.getTime();
  }

  addLocation(location: Location): void {
    if (this._endTime) {
      throw new Error('No se pueden añadir ubicaciones a un paseo finalizado');
    }
    this._route.push(location);
  }

  endWalk(endTime: Date = new Date()): void {
    if (this._endTime) {
      throw new Error('El paseo ya ha finalizado');
    }
    this._endTime = endTime;
    this._distanceMeters = Walk.calculateDistanceMeters(this._route);
  }

  static calculateDistanceMeters(route: Location[]): number {
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += route[i - 1].distanceTo(route[i]);
    }
    return total;
  }
}
