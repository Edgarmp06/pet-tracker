import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockAuthAdapter } from '../../src/infrastructure/adapters/MockAuthAdapter';

describe('MockAuthAdapter', () => {
  let adapter: MockAuthAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    adapter = new MockAuthAdapter();
  });

  it('rechaza el login con credenciales de una cuenta que no existe (no crea el usuario)', async () => {
    await expect(
      adapter.login('nadie@example.com', 'secreto1'),
    ).rejects.toThrow('Email o contraseña incorrectos.');

    const currentUser = await adapter.getCurrentUser();
    expect(currentUser).toBeNull();
  });

  it('rechaza el login con una contraseña incorrecta para una cuenta existente', async () => {
    await adapter.register('ana@example.com', 'correcta1');
    await adapter.logout();

    await expect(
      adapter.login('ana@example.com', 'incorrecta1'),
    ).rejects.toThrow('Email o contraseña incorrectos.');
  });

  it('permite iniciar sesión con las credenciales correctas tras registrarse', async () => {
    await adapter.register('ana@example.com', 'correcta1');
    await adapter.logout();

    const user = await adapter.login('ana@example.com', 'correcta1');

    expect(user.email).toBe('ana@example.com');
    const currentUser = await adapter.getCurrentUser();
    expect(currentUser?.email).toBe('ana@example.com');
  });

  it('rechaza el registro si ya existe una cuenta con ese email', async () => {
    await adapter.register('ana@example.com', 'correcta1');

    await expect(
      adapter.register('ana@example.com', 'otraClave1'),
    ).rejects.toThrow('Ya existe una cuenta con ese correo electrónico.');
  });

  it('normaliza el email (mayúsculas/espacios) al comparar login y registro', async () => {
    await adapter.register('  Ana@Example.com ', 'correcta1');
    await adapter.logout();

    const user = await adapter.login('ana@example.com', 'correcta1');

    expect(user.email).toBe('ana@example.com');
  });
});
