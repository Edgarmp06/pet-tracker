import { Location } from '../value-objects/Location';

export interface WalkProps {
  id: string;
  petId: string;
  startTime: Date;
  endTime?: Date;
  route: Location[];
}

export class Walk {
  readonly id: string;
  readonly petId: string;
  readonly startTime: Date;
  private _endTime?: Date;
  private _route: Location[];

  constructor(props: WalkProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.startTime = props.startTime;
    this._endTime = props.endTime;
    this._route = props.route || [];
  }

  get endTime(): Date | undefined {
    return this._endTime;
  }

  get route(): Location[] {
    return [...this._route];
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
  }
}
