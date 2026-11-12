export type PetEventType = 'feeding' | 'medication';

export interface PetEventProps {
  id: string;
  petId: string;
  type: PetEventType;
  timestamp: Date;
  notes?: string;
  /** Solo 'feeding': cantidad o tipo de alimento (ej. "200g de pienso"). */
  foodAmount?: string;
  /** Solo 'medication': nombre del medicamento administrado. */
  medicineName?: string;
  /** Solo 'medication': dosis administrada (ej. "1 comprimido"). */
  dose?: string;
  /** Cuándo toca el próximo evento (siguiente dosis o siguiente comida), si se programó recordatorio. */
  nextDoseAt?: Date;
}

export class PetEvent {
  readonly id: string;
  readonly petId: string;
  readonly type: PetEventType;
  readonly timestamp: Date;
  readonly notes?: string;
  readonly foodAmount?: string;
  readonly medicineName?: string;
  readonly dose?: string;
  readonly nextDoseAt?: Date;

  constructor(props: PetEventProps) {
    this.id = props.id;
    this.petId = props.petId;
    this.type = props.type;
    this.timestamp = props.timestamp;
    this.notes = props.notes;
    this.foodAmount = props.foodAmount;
    this.medicineName = props.medicineName;
    this.dose = props.dose;
    this.nextDoseAt = props.nextDoseAt;
  }
}
