import React, { createContext, useContext } from 'react';
import { AsyncStorageDroppingRepository } from '../../infrastructure/adapters/AsyncStorageDroppingRepository';
import { AsyncStoragePetRepository } from '../../infrastructure/adapters/AsyncStoragePetRepository';
import { AsyncStorageWalkRepository } from '../../infrastructure/adapters/AsyncStorageWalkRepository';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';
import { ExpoGpsAdapter } from '../../infrastructure/adapters/ExpoGpsAdapter';
import { ExpoImagePickerAdapter } from '../../infrastructure/adapters/ExpoImagePickerAdapter';
import { RecordDroppingUseCase } from '../../application/use-cases/RecordDroppingUseCase';
import {
  GetPetsUseCase,
  SavePetUseCase,
} from '../../application/use-cases/PetUseCases';
import { StartWalkUseCase } from '../../application/use-cases/StartWalkUseCase';
import { EndWalkUseCase } from '../../application/use-cases/EndWalkUseCase';
import { GetActiveWalkUseCase } from '../../application/use-cases/GetActiveWalkUseCase';
import { IAuthService } from '../../domain/ports/IAuthService';
import { IGpsService } from '../../domain/ports/IGpsService';
import { IImagePickerService } from '../../domain/ports/IImagePickerService';

const droppingRepository = new AsyncStorageDroppingRepository();
const petRepository = new AsyncStoragePetRepository();
const walkRepository = new AsyncStorageWalkRepository();
const authService = new MockAuthAdapter();
const gpsService = new ExpoGpsAdapter();
const imagePickerAdapter = new ExpoImagePickerAdapter();

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

export const useDependencies = () => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error(
      'useDependencies debe usarse dentro de un DependencyProvider',
    );
  }
  return context;
};
