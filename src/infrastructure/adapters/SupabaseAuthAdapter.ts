import { getSupabaseClient } from '../config/supabaseClient';
import { IAuthService } from '../../domain/ports/IAuthService';
import { User } from '../../domain/entities/User';

const toDomainUser = (supabaseUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): User => {
  return new User({
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name:
      typeof supabaseUser.user_metadata?.name === 'string'
        ? (supabaseUser.user_metadata.name as string)
        : undefined,
    isPro: Boolean(supabaseUser.user_metadata?.is_pro),
  });
};

export class SupabaseAuthAdapter implements IAuthService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) {
        console.error('Error al recuperar la sesión de Supabase:', error);
        return null;
      }

      const user = data.session?.user;
      return user ? toDomainUser(user) : null;
    } catch (error) {
      console.error('No se pudo comprobar la sesión actual:', error);
      return null;
    }
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // Supabase no distingue entre "no existe" y "contraseña incorrecta"
      // por seguridad; devolvemos el mismo mensaje genérico en ambos casos
      // y nunca creamos una cuenta nueva desde el flujo de login.
      if (error?.message === 'Invalid login credentials') {
        throw new Error('Email o contraseña incorrectos.');
      }
      throw new Error(error?.message || 'No se pudo iniciar sesión.');
    }

    return toDomainUser(data.user);
  }

  async register(email: string, password: string): Promise<User> {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: { name: email.split('@')[0], is_pro: false },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'No se pudo crear la cuenta.');
    }

    return toDomainUser(data.user);
  }

  async logout(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión en Supabase:', error);
      throw new Error('No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
  }
}
