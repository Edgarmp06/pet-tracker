export interface WeightEntryProps {
  id: string;
  petId: string;
  weightKg: number;
  timestamp: Date;
  notes?: string;
}

export class WeightEntry {
  readonly id: string;
  readonly petId: string;
  readonly weightKg: number;
  readonly timestamp: Date;
  readonly notes?: string;

  constructor(props: WeightEntryProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.weightKg = props.weightKg;
    this.timestamp = props.timestamp;
    this.notes = props.notes;
  }
}
