export interface UserProps {
  id: string;
  email: string;
  name?: string;
  isPro?: boolean;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly isPro: boolean;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.isPro = props.isPro ?? false;
  }
}