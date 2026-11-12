export type PetSpecies = 'dog' | 'cat' | 'other';
export type PetGender = 'male' | 'female';

export interface PetProps {
  id: string;
  userId: string;
  name: string;
  breed?: string;
  age?: number;
  avatarUri?: string;
  species?: PetSpecies;
  gender?: PetGender;
  /**
   * Si la mascota sale de paseo. Por defecto `true` (perros y "otro" siempre
   * pasean); en gatos se pregunta explícitamente al crear el perfil, porque
   * muchos no salen nunca y no tiene sentido ofrecerles el flujo de paseo.
   */
  goesOnWalks?: boolean;
}

export class Pet {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly breed?: string;
  readonly age?: number;
  readonly avatarUri?: string;
  readonly species?: PetSpecies;
  readonly gender?: PetGender;
  readonly goesOnWalks: boolean;

  constructor(props: PetProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.breed = props.breed;
    this.age = props.age;
    this.avatarUri = props.avatarUri;
    this.species = props.species;
    this.gender = props.gender;
    this.goesOnWalks = props.goesOnWalks ?? true;
  }
}
