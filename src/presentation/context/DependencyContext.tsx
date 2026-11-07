import React, { createContext, useContext } from 'react';
import { AsyncStorageDroppingRepository } from '../../infrastructure/adapters/AsyncStorageDroppingRepository';
import { AsyncStoragePetRepository } from '../../infrastructure/adapters/AsyncStoragePetRepository';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';
import { ExpoGpsAdapter } from '../../infrastructure/adapters/ExpoGpsAdapter';
import { ExpoImagePickerAdapter } from '../../infrastructure/adapters/ExpoImagePickerAdapter';
import { RecordDroppingUseCase } from '../../application/use-cases/RecordDroppingUseCase';
import {
  GetPetsUseCase,
  SavePetUseCase,
} from '../../application/use-cases/PetUseCases';
import { IAuthService } from '../../domain/ports/IAuthService';
import { IGpsService } from '../../domain/ports/IGpsService';
import { IImagePickerService } from '../../domain/ports/IImagePickerService';

const droppingRepository = new AsyncStorageDroppingRepository();
const petRepository = new AsyncStoragePetRepository();
const authService = new MockAuthAdapter();
const gpsService = new ExpoGpsAdapter();
const imagePickerAdapter = new ExpoImagePickerAdapter();

const recordDroppingUseCase = new RecordDroppingUseCase(droppingRepository);
const getPetsUseCase = new GetPetsUseCase(petRepository);
const savePetUseCase = new SavePetUseCase(petRepository);

interface DependencyContextType {
  droppingRepository: AsyncStorageDroppingRepository;
  recordDroppingUseCase: RecordDroppingUseCase;
  getPetsUseCase: GetPetsUseCase;
  savePetUseCase: SavePetUseCase;
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
