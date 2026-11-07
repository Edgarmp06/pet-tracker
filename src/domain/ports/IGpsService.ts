import { Location } from '../value-objects/Location';

export interface IGpsService {
  requestPermissions(): Promise<boolean>;
  getCurrentLocation(): Promise<Location | null>;
}
