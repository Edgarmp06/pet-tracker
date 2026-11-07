export interface PetProps {
  id: string;
  userId: string;
  name: string;
  breed?: string;
  age?: number;
  avatarUri?: string;
}

export class Pet {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly breed?: string;
  readonly age?: number;
  readonly avatarUri?: string;

  constructor(props: PetProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.breed = props.breed;
    this.age = props.age;
    this.avatarUri = props.avatarUri;
  }
}
