import { User } from '../entities/User';

export interface IAuthService {
  getCurrentUser(): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
}
