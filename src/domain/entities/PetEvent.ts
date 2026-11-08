export type PetEventType = 'feeding' | 'medication';

export interface PetEventProps {
  id: string;
  petId: string;
  type: PetEventType;
  timestamp: Date;
  notes?: string;
}

export class PetEvent {
  readonly id: string;
  readonly petId: string;
  readonly type: PetEventType;
  readonly timestamp: Date;
  readonly notes?: string;

  constructor(props: PetEventProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.type = props.type;
    this.timestamp = props.timestamp;
    this.notes = props.notes;
  }
}
