import { Location } from '../value-objects/Location';

export type PoopConsistency = 'hard' | 'normal' | 'soft' | 'diarrhea';

export interface DroppingProps {
  id: string;
  petId: string;
  walkId?: string;
  location?: Location;
  timestamp: Date;
  photoUrl?: string;
  notes?: string;
  consistency?: PoopConsistency;
  color?: string; // 👈 Guarda directamente el código de color hex (ej: #6D4C41)
}

export class Dropping {
  readonly id: string;
  readonly petId: string;
  readonly walkId?: string;
  readonly location?: Location;
  readonly timestamp: Date;
  readonly photoUrl?: string;
  readonly notes?: string;
  readonly consistency?: PoopConsistency;
  readonly color?: string;

  constructor(props: DroppingProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.walkId = props.walkId;
    this.location = props.location;
    this.timestamp = props.timestamp;
    this.photoUrl = props.photoUrl;
    this.notes = props.notes;
    this.consistency = props.consistency || 'normal';
    this.color = props.color || '#6D4C41';
  }
}
