import { PetEventType } from '../../domain/entities/PetEvent';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  PetEvent: { type: PetEventType };
};
