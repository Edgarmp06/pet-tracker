import React, { createContext, useContext } from 'react';
import { AsyncStorageDroppingRepository } from '../../infrastructure/adapters/AsyncStorageDroppingRepository';
import { AsyncStoragePetRepository } from '../../infrastructure/adapters/AsyncStoragePetRepository';
import { AsyncStorageWalkRepository } from '../../infrastructure/adapters/AsyncStorageWalkRepository';
import { AsyncStoragePetEventRepository } from '../../infrastructure/adapters/AsyncStoragePetEventRepository';
import { AsyncStorageWeightRepository } from '../../infrastructure/adapters/AsyncStorageWeightRepository';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';
import { SupabaseAuthAdapter } from '../../infrastructure/adapters/SupabaseAuthAdapter';
import { SupabasePetRepository } from '../../infrastructure/adapters/SupabasePetRepository';
import { SupabaseDroppingRepository } from '../../infrastructure/adapters/SupabaseDroppingRepository';
import { SupabaseWalkRepository } from '../../infrastructure/adapters/SupabaseWalkRepository';
import { SupabaseWeightRepository } from '../../infrastructure/adapters/SupabaseWeightRepository';
import { ExpoGpsAdapter } from '../../infrastructure/adapters/ExpoGpsAdapter';
import { ExpoImagePickerAdapter } from '../../infrastructure/adapters/ExpoImagePickerAdapter';
import { ExpoNotificationAdapter } from '../../infrastructure/adapters/ExpoNotificationAdapter';
import { isSupabaseConfigured } from '../../infrastructure/config/supabaseClient';
import { SyncQueue } from '../../infrastructure/sync/SyncQueue';
import { SyncManager } from '../../infrastructure/sync/SyncManager';
import { SyncedPetRepository } from '../../infrastructure/sync/SyncedPetRepository';
import { SyncedDroppingRepository } from '../../infrastructure/sync/SyncedDroppingRepository';
import { SyncedWalkRepository } from '../../infrastructure/sync/SyncedWalkRepository';
import { SyncedWeightRepository } from '../../infrastructure/sync/SyncedWeightRepository';
import { RecordDroppingUseCase } from '../../application/use-cases/RecordDroppingUseCase';
import { RecordWeightUseCase } from '../../application/use-cases/RecordWeightUseCase';
import { GetPetWeightHistoryUseCase } from '../../application/use-cases/GetPetWeightHistoryUseCase';
import {
  GetPetsUseCase,
  SavePetUseCase,
  UpdatePetUseCase,
  DeletePetUseCase,
} from '../../application/use-cases/PetUseCases';
import {
  UpdateUserProfileUseCase,
  RequestPasswordResetUseCase,
  DeleteAccountUseCase,
} from '../../application/use-cases/UserAccountUseCases';
import { StartWalkUseCase } from '../../application/use-cases/StartWalkUseCase';
import { EndWalkUseCase } from '../../application/use-cases/EndWalkUseCase';
import { GetActiveWalkUseCase } from '../../application/use-cases/GetActiveWalkUseCase';
import { GetPetWalksUseCase } from '../../application/use-cases/GetPetWalksUseCase';
import { CheckIntestinalHealthAlertUseCase } from '../../application/use-cases/CheckIntestinalHealthAlertUseCase';
import { ScheduleWalkReminderUseCase } from '../../application/use-cases/ScheduleWalkReminderUseCase';
import { CancelWalkReminderUseCase } from '../../application/use-cases/CancelWalkReminderUseCase';
import { ScheduleMedicationReminderUseCase } from '../../application/use-cases/ScheduleMedicationReminderUseCase';
import { ScheduleFeedingReminderUseCase } from '../../application/use-cases/ScheduleFeedingReminderUseCase';
import { GetPetDroppingLocationsUseCase } from '../../application/use-cases/GetPetDroppingLocationsUseCase';
import { GetClinicalMetricsUseCase } from '../../application/use-cases/GetClinicalMetricsUseCase';
import {
  RecordPetEventUseCase,
  GetPetEventsUseCase,
} from '../../application/use-cases/PetEventUseCases';
import { IAuthService } from '../../domain/ports/IAuthService';
import { IPetRepository } from '../../domain/ports/IPetRepository';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { IWalkRepository } from '../../domain/ports/IWalkRepository';
import { IWeightRepository } from '../../domain/ports/IWeightRepository';
import { IGpsService } from '../../domain/ports/IGpsService';
import { IImagePickerService } from '../../domain/ports/IImagePickerService';
import { INotificationService } from '../../domain/ports/INotificationService';

const localPetRepository = new AsyncStoragePetRepository();
const localDroppingRepository = new AsyncStorageDroppingRepository();
const localWalkRepository = new AsyncStorageWalkRepository();
const localWeightRepository = new AsyncStorageWeightRepository();
// Solo local por ahora (sin sync a Supabase): ver nota en el adapter.
const petEventRepository = new AsyncStoragePetEventRepository();
const gpsService = new ExpoGpsAdapter();
const imagePickerAdapter = new ExpoImagePickerAdapter();
const notificationService: INotificationService = new ExpoNotificationAdapter();

const syncQueue = new SyncQueue();

// Si no hay .env con credenciales de Supabase (desarrollo local sin backend,
// CI, etc.), la app sigue funcionando 100% en local en vez de reventar al
// arrancar: solo se activan Supabase y la sincronización cuando están
// configurados.
let authService: IAuthService;
let petRepository: IPetRepository;
let droppingRepository: IDroppingRepository;
let walkRepository: IWalkRepository;
let weightRepository: IWeightRepository;

if (isSupabaseConfigured()) {
  authService = new SupabaseAuthAdapter();

  const remotePetRepository = new SupabasePetRepository();
  petRepository = new SyncedPetRepository(
    localPetRepository,
    remotePetRepository,
    syncQueue,
  );

  const remoteDroppingRepository = new SupabaseDroppingRepository();
  droppingRepository = new SyncedDroppingRepository(
    localDroppingRepository,
    remoteDroppingRepository,
    syncQueue,
  );

  const remoteWalkRepository = new SupabaseWalkRepository();
  walkRepository = new SyncedWalkRepository(
    localWalkRepository,
    remoteWalkRepository,
    syncQueue,
  );

  const remoteWeightRepository = new SupabaseWeightRepository();
  weightRepository = new SyncedWeightRepository(
    localWeightRepository,
    remoteWeightRepository,
    syncQueue,
  );

  const syncManager = new SyncManager(syncQueue, {
    pet: remotePetRepository,
    dropping: remoteDroppingRepository,
    walk: remoteWalkRepository,
    weight: remoteWeightRepository,
  });
  syncManager.start();
} else {
  console.warn(
    'Supabase no está configurado (falta el .env): usando autenticación y ' +
      'almacenamiento solo locales. Ver .env.example.',
  );
  authService = new MockAuthAdapter();
  petRepository = localPetRepository;
  droppingRepository = localDroppingRepository;
  walkRepository = localWalkRepository;
  weightRepository = localWeightRepository;
}

const recordDroppingUseCase = new RecordDroppingUseCase(droppingRepository);
const recordWeightUseCase = new RecordWeightUseCase(weightRepository);
const getPetWeightHistoryUseCase = new GetPetWeightHistoryUseCase(
  weightRepository,
);
const getPetsUseCase = new GetPetsUseCase(petRepository);
const savePetUseCase = new SavePetUseCase(petRepository);
const updatePetUseCase = new UpdatePetUseCase(petRepository);
const deletePetUseCase = new DeletePetUseCase(petRepository);
const startWalkUseCase = new StartWalkUseCase(walkRepository);
const endWalkUseCase = new EndWalkUseCase(walkRepository);
const getActiveWalkUseCase = new GetActiveWalkUseCase(walkRepository);
const getPetWalksUseCase = new GetPetWalksUseCase(walkRepository);
const checkIntestinalHealthAlertUseCase = new CheckIntestinalHealthAlertUseCase(
  droppingRepository,
  notificationService,
);
const scheduleWalkReminderUseCase = new ScheduleWalkReminderUseCase(
  notificationService,
);
const cancelWalkReminderUseCase = new CancelWalkReminderUseCase(
  notificationService,
);
const getPetDroppingLocationsUseCase = new GetPetDroppingLocationsUseCase(
  droppingRepository,
);
const getClinicalMetricsUseCase = new GetClinicalMetricsUseCase(
  droppingRepository,
);
const updateUserProfileUseCase = new UpdateUserProfileUseCase(authService);
const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
  authService,
);
const deleteAccountUseCase = new DeleteAccountUseCase(authService);
const recordPetEventUseCase = new RecordPetEventUseCase(petEventRepository);
const getPetEventsUseCase = new GetPetEventsUseCase(petEventRepository);
const scheduleMedicationReminderUseCase = new ScheduleMedicationReminderUseCase(
  notificationService,
);
const scheduleFeedingReminderUseCase = new ScheduleFeedingReminderUseCase(
  notificationService,
);

interface DependencyContextType {
  droppingRepository: IDroppingRepository;
  recordDroppingUseCase: RecordDroppingUseCase;
  recordWeightUseCase: RecordWeightUseCase;
  getPetWeightHistoryUseCase: GetPetWeightHistoryUseCase;
  getPetsUseCase: GetPetsUseCase;
  savePetUseCase: SavePetUseCase;
  updatePetUseCase: UpdatePetUseCase;
  deletePetUseCase: DeletePetUseCase;
  startWalkUseCase: StartWalkUseCase;
  endWalkUseCase: EndWalkUseCase;
  getActiveWalkUseCase: GetActiveWalkUseCase;
  getPetWalksUseCase: GetPetWalksUseCase;
  checkIntestinalHealthAlertUseCase: CheckIntestinalHealthAlertUseCase;
  scheduleWalkReminderUseCase: ScheduleWalkReminderUseCase;
  cancelWalkReminderUseCase: CancelWalkReminderUseCase;
  getPetDroppingLocationsUseCase: GetPetDroppingLocationsUseCase;
  getClinicalMetricsUseCase: GetClinicalMetricsUseCase;
  updateUserProfileUseCase: UpdateUserProfileUseCase;
  requestPasswordResetUseCase: RequestPasswordResetUseCase;
  deleteAccountUseCase: DeleteAccountUseCase;
  recordPetEventUseCase: RecordPetEventUseCase;
  getPetEventsUseCase: GetPetEventsUseCase;
  scheduleMedicationReminderUseCase: ScheduleMedicationReminderUseCase;
  scheduleFeedingReminderUseCase: ScheduleFeedingReminderUseCase;
  authService: IAuthService;
  gpsService: IGpsService;
  imagePickerAdapter: IImagePickerService;
  notificationService: INotificationService;
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
        recordWeightUseCase,
        getPetWeightHistoryUseCase,
        getPetsUseCase,
        savePetUseCase,
        updatePetUseCase,
        deletePetUseCase,
        startWalkUseCase,
        endWalkUseCase,
        getActiveWalkUseCase,
        getPetWalksUseCase,
        checkIntestinalHealthAlertUseCase,
        scheduleWalkReminderUseCase,
        cancelWalkReminderUseCase,
        getPetDroppingLocationsUseCase,
        getClinicalMetricsUseCase,
        updateUserProfileUseCase,
        requestPasswordResetUseCase,
        deleteAccountUseCase,
        recordPetEventUseCase,
        getPetEventsUseCase,
        scheduleMedicationReminderUseCase,
        scheduleFeedingReminderUseCase,
        authService,
        gpsService,
        imagePickerAdapter,
        notificationService,
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
