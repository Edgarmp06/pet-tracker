import React, { createContext, useContext } from 'react';
import { AsyncStorageDroppingRepository } from '../../infrastructure/adapters/AsyncStorageDroppingRepository';
import { AsyncStoragePetRepository } from '../../infrastructure/adapters/AsyncStoragePetRepository';
import { AsyncStorageWalkRepository } from '../../infrastructure/adapters/AsyncStorageWalkRepository';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';
import { SupabaseAuthAdapter } from '../../infrastructure/adapters/SupabaseAuthAdapter';
import { SupabasePetRepository } from '../../infrastructure/adapters/SupabasePetRepository';
import { ExpoGpsAdapter } from '../../infrastructure/adapters/ExpoGpsAdapter';
import { ExpoImagePickerAdapter } from '../../infrastructure/adapters/ExpoImagePickerAdapter';
import { isSupabaseConfigured } from '../../infrastructure/config/supabaseClient';
import { SyncQueue } from '../../infrastructure/sync/SyncQueue';
import { SyncManager } from '../../infrastructure/sync/SyncManager';
import { SyncedPetRepository } from '../../infrastructure/sync/SyncedPetRepository';
import { RecordDroppingUseCase } from '../../application/use-cases/RecordDroppingUseCase';
import {
  GetPetsUseCase,
  SavePetUseCase,
} from '../../application/use-cases/PetUseCases';
import { StartWalkUseCase } from '../../application/use-cases/StartWalkUseCase';
import { EndWalkUseCase } from '../../application/use-cases/EndWalkUseCase';
import { GetActiveWalkUseCase } from '../../application/use-cases/GetActiveWalkUseCase';
import { IAuthService } from '../../domain/ports/IAuthService';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { IGpsService } from '../../domain/ports/IGpsService';
import { IImagePickerService } from '../../domain/ports/IImagePickerService';

const droppingRepository = new AsyncStorageDroppingRepository();
const localPetRepository = new AsyncStoragePetRepository();
const walkRepository = new AsyncStorageWalkRepository();
const gpsService = new ExpoGpsAdapter();
const imagePickerAdapter = new ExpoImagePickerAdapter();

const syncQueue = new SyncQueue();

// Si no hay .env con credenciales de Supabase (desarrollo local sin backend,
// CI, etc.), la app sigue funcionando 100% en local en vez de reventar al
// arrancar: solo se activan Supabase y la sincronización cuando están
// configurados.
let authService: IAuthService;
let petRepository: IPetRepository;

if (isSupabaseConfigured()) {
  authService = new SupabaseAuthAdapter();

  const remotePetRepository = new SupabasePetRepository();
  petRepository = new SyncedPetRepository(
    localPetRepository,
    remotePetRepository,
    syncQueue,
  );

  const syncManager = new SyncManager(syncQueue, { pet: remotePetRepository });
  syncManager.start();
} else {
  console.warn(
    'Supabase no está configurado (falta el .env): usando autenticación y ' +
      'almacenamiento de mascotas solo locales. Ver .env.example.',
  );
  authService = new MockAuthAdapter();
  petRepository = localPetRepository;
}

const recordDroppingUseCase = new RecordDroppingUseCase(droppingRepository);
const getPetsUseCase = new GetPetsUseCase(petRepository);
const savePetUseCase = new SavePetUseCase(petRepository);
const startWalkUseCase = new StartWalkUseCase(walkRepository);
const endWalkUseCase = new EndWalkUseCase(walkRepository);
const getActiveWalkUseCase = new GetActiveWalkUseCase(walkRepository);

interface DependencyContextType {
  droppingRepository: AsyncStorageDroppingRepository;
  recordDroppingUseCase: RecordDroppingUseCase;
  getPetsUseCase: GetPetsUseCase;
  savePetUseCase: SavePetUseCase;
  startWalkUseCase: StartWalkUseCase;
  endWalkUseCase: EndWalkUseCase;
  getActiveWalkUseCase: GetActiveWalkUseCase;
  authService: IAuthService;
  gpsService: IGpsService;
  imagePickerAdapter: IImagePickerService;
}

const DependencyContext = createContext<DependencyContextType | null>(null);

export const DependencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <DependencyContext.Provider
      value={{
        droppingRepository,
        recordDroppingUseCase,
        getPetsUseCase,
        savePetUseCase,
        startWalkUseCase,
        endWalkUseCase,
        getActiveWalkUseCase,
        authService,
        gpsService,
        imagePickerAdapter,
      }}
    >
      {children}
    </DependencyContext.Provider>
  );
};

// Export nombrado para el bootstrap de App.tsx (comprobar la sesión antes de
// montar el árbol de React): debe ser exactamente el mismo authService que
// usan las pantallas, nunca una instancia aparte (si no, podrían discrepar
// sobre si hay sesión iniciada o no).
export { authService };

export const useDependencies = () => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error(
      'useDependencies debe usarse dentro de un DependencyProvider',
    );
  }
  return context;
};
