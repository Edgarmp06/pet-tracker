import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthService } from '../../domain/ports/IAuthService';
import { User } from '../../domain/entities/User';

const USER_STORAGE_KEY = '@pet_tracker_current_user';
const USERS_REGISTRY_KEY = '@pet_tracker_mock_users';

interface MockUserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  isPro: boolean;
}

// Adapter de desarrollo/pruebas sin backend: simula un registro real de
// usuarios en AsyncStorage para que login y register se comporten como lo
// harían contra Supabase (login rechaza credenciales inexistentes en vez de
// crear la cuenta sobre la marcha).
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

  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.readUsersRegistry();
    const record = users[normalizedEmail];

    if (!record || record.password !== password) {
      throw new Error('Email o contraseña incorrectos.');
    }

    return this.startSession(record);
  }

  async register(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.readUsersRegistry();

    if (users[normalizedEmail]) {
      throw new Error('Ya existe una cuenta con ese correo electrónico.');
    }

    const record: MockUserRecord = {
      id: 'usr_' + Math.random().toString(36).substring(2, 7),
      email: normalizedEmail,
      password,
      name: normalizedEmail.split('@')[0],
      isPro: false,
    };

    users[normalizedEmail] = record;
    await this.writeUsersRegistry(users);

    return this.startSession(record);
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
      throw new Error('No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
  }

  async updateProfile(name: string): Promise<User> {
    const current = await this.getCurrentUser();
    if (!current) {
      throw new Error('No hay ninguna sesión iniciada.');
    }

    const users = await this.readUsersRegistry();
    const record = users[current.email];
    if (record) {
      record.name = name;
      await this.writeUsersRegistry(users);
    }

    const updated = new User({ ...current, name });
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('No se pudo guardar el perfil actualizado:', error);
      throw new Error('No se pudo actualizar el perfil.');
    }

    return updated;
  }

  // El mock no envía correos reales: simplemente confirma la petición, igual
  // que haría Supabase (que por seguridad nunca revela si el email existe).
  async requestPasswordReset(_email: string): Promise<void> {
    return;
  }

  async deleteAccount(): Promise<void> {
    const current = await this.getCurrentUser();
    if (current) {
      const users = await this.readUsersRegistry();
      delete users[current.email];
      await this.writeUsersRegistry(users);
    }
    await this.logout();
  }

  private async readUsersRegistry(): Promise<Record<string, MockUserRecord>> {
    try {
      const json = await AsyncStorage.getItem(USERS_REGISTRY_KEY);
      return json ? JSON.parse(json) : {};
    } catch (error) {
      console.error('No se pudo leer el registro de usuarios:', error);
      return {};
    }
  }

  private async writeUsersRegistry(
    users: Record<string, MockUserRecord>,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('No se pudo guardar el registro de usuarios:', error);
      throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');
    }
  }

  private async startSession(record: MockUserRecord): Promise<User> {
    const user = new User({
      id: record.id,
      email: record.email,
      name: record.name,
      isPro: record.isPro,
    });

    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('No se pudo guardar la sesión:', error);
      throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');
    }

    return user;
  }
}
