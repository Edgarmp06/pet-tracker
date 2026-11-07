import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthService } from '../../domain/ports/IAuthService';
import { User } from '../../domain/entities/User';

const USER_STORAGE_KEY = '@pet_tracker_current_user';

export class MockAuthAdapter implements IAuthService {
  async getCurrentUser(): Promise<User | null> {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!json) return null;
    const data = JSON.parse(json);
    return new User(data);
  }

  async login(email: string): Promise<User> {
    // Genera un usuario local simulado basado en el email
    const user = new User({
      id: 'usr_' + Math.random().toString(36).substring(2, 7),
      email,
      name: email.split('@')[0],
      isPro: false,
    });

    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }
}