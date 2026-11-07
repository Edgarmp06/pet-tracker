import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ExpoNotificationAdapter.ts llama a setNotificationHandler() como efecto
// de importar el módulo (no dentro de un método), así que el mock no puede
// depender de variables `mock*` declaradas fuera de este factory: esas
// `const` todavía no se habrían inicializado cuando Jest invoca el factory
// (los `import` se izan por encima de cualquier otra sentencia, incluida la
// declaración de esas variables). Por eso los jest.fn() se crean aquí
// mismo, dentro del factory, y se recuperan después con jest.requireMock().
jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

import { ExpoNotificationAdapter } from '../../src/infrastructure/adapters/ExpoNotificationAdapter';

const mocked = jest.requireMock('expo-notifications') as {
  getPermissionsAsync: jest.Mock<(...args: any[]) => Promise<{ granted: boolean }>>;
  requestPermissionsAsync: jest.Mock<(...args: any[]) => Promise<{ granted: boolean }>>;
  scheduleNotificationAsync: jest.Mock<(...args: any[]) => Promise<string>>;
  cancelScheduledNotificationAsync: jest.Mock<(...args: any[]) => Promise<void>>;
};

describe('ExpoNotificationAdapter', () => {
  beforeEach(() => {
    mocked.getPermissionsAsync.mockReset();
    mocked.requestPermissionsAsync.mockReset();
    mocked.scheduleNotificationAsync.mockReset();
    mocked.cancelScheduledNotificationAsync.mockReset();
  });

  it('no pide permiso de nuevo si ya estaba concedido', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true });

    const adapter = new ExpoNotificationAdapter();
    const granted = await adapter.requestPermissions();

    expect(granted).toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('pide permiso si todavía no estaba concedido', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false });
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true });

    const adapter = new ExpoNotificationAdapter();
    const granted = await adapter.requestPermissions();

    expect(granted).toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('no envía la notificación inmediata si no hay permiso', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false });
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const adapter = new ExpoNotificationAdapter();
    await adapter.sendImmediateNotification('Título', 'Cuerpo');

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('envía la notificación inmediata con trigger null cuando hay permiso', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true });

    const adapter = new ExpoNotificationAdapter();
    await adapter.sendImmediateNotification('Título', 'Cuerpo');

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Título', body: 'Cuerpo' },
      trigger: null,
    });
  });

  it('programa el recordatorio diario cancelando primero cualquier versión previa (mismo id)', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true });

    const adapter = new ExpoNotificationAdapter();
    await adapter.scheduleDailyReminder(
      'daily-walk-reminder',
      { hour: 20, minute: 0 },
      'Título',
      'Cuerpo',
    );

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'daily-walk-reminder',
    );
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'daily-walk-reminder',
      content: { title: 'Título', body: 'Cuerpo' },
      trigger: { type: 'daily', hour: 20, minute: 0 },
    });
  });

  it('cancelReminder no lanza aunque la cancelación nativa falle', async () => {
    mocked.cancelScheduledNotificationAsync.mockRejectedValue(new Error('no existe'));

    const adapter = new ExpoNotificationAdapter();
    await expect(adapter.cancelReminder('id-inexistente')).resolves.toBeUndefined();
  });
});
