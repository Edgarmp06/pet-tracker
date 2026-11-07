import { User } from '../entities/User';

export interface IAuthService {
  getCurrentUser(): Promise<User | null>;
  login(email: string): Promise<User>;
  logout(): Promise<void>;
}