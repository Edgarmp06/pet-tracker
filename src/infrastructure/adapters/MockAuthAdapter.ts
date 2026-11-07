import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthService } from '../../domain/ports/IAuthService';
import { User } from '../../domain/entities/User';

const USER_STORAGE_KEY = '@pet_tracker_current_user';

export class MockAuthAdapter implements IAuthService {
  async getCurrentUser(): Promise<User | null> {
    let json: string | null;
    try {
      json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo leer la sesión guardada:', error);
      return null;
    }

    if (!json) return null;

    try {
      const data = JSON.parse(json);
      return new User(data);
    } catch (error) {
      console.error('Sesión guardada corrupta, se ignora:', error);
      return null;
    }
  }

  // El mock no comprueba contraseñas: sirve solo como sesión local simulada
  // para desarrollo/pruebas sin backend. `password` se ignora a propósito.
  async login(email: string, _password: string): Promise<User> {
    return this.createSession(email);
  }

  async register(email: string, _password: string): Promise<User> {
    return this.createSession(email);
  }

  private async createSession(email: string): Promise<User> {
    const user = new User({
      id: 'usr_' + Math.random().toString(36).substring(2, 7),
      email,
      name: email.split('@')[0],
      isPro: false,
    });

    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('No se pudo guardar la sesión:', error);
      throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');
    }

    return user;
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
      throw new Error('No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
  }
}
