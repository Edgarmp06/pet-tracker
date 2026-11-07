export type DroppingTypeEnum = 'caca' | 'pipi';

export class DroppingType {
  readonly value: DroppingTypeEnum;

  constructor(value: DroppingTypeEnum) {
    if (value !== 'caca' && value !== 'pipi') {
      throw new Error('Tipo de deposición inválido');
    }
    this.value = value;
  }
}
