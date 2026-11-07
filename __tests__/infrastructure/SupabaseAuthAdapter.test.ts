import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockSignInWithPassword: jest.Mock<
  (...args: any[]) => Promise<{ data: { user: unknown }; error: unknown }>
> = jest.fn();
const mockSignUp: jest.Mock<
  (...args: any[]) => Promise<{ data: { user: unknown }; error: unknown }>
> = jest.fn();

jest.mock('../../src/infrastructure/config/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  }),
}));

// Import después del mock para que SupabaseAuthAdapter reciba el cliente falso.
import { SupabaseAuthAdapter } from '../../src/infrastructure/adapters/SupabaseAuthAdapter';

describe('SupabaseAuthAdapter', () => {
  let adapter: SupabaseAuthAdapter;

  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    adapter = new SupabaseAuthAdapter();
  });

  it('login invoca estrictamente signInWithPassword y nunca signUp', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'ana@example.com', user_metadata: {} } },
      error: null,
    });

    await adapter.login('ana@example.com', 'secreto1');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'secreto1',
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('register invoca estrictamente signUp y nunca signInWithPassword', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'ana@example.com', user_metadata: {} } },
      error: null,
    });

    await adapter.register('ana@example.com', 'secreto1');

    expect(mockSignUp).toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('devuelve un mensaje de error descriptivo cuando las credenciales de login son inválidas', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(
      adapter.login('nadie@example.com', 'loquesea1'),
    ).rejects.toThrow('Email o contraseña incorrectos.');
  });
});
