import React, { createContext, useContext } from 'react';
import { AsyncStorageDroppingRepository } from '../../infrastructure/adapters/AsyncStorageDroppingRepository';
import { AsyncStoragePetRepository } from '../../infrastructure/adapters/AsyncStoragePetRepository';
import { RecordDroppingUseCase } from '../../application/use-cases/RecordDroppingUseCase';
import {
  GetPetsUseCase,
  SavePetUseCase,
} from '../../application/use-cases/PetUseCases';

const droppingRepository = new AsyncStorageDroppingRepository();
const petRepository = new AsyncStoragePetRepository();

const recordDroppingUseCase = new RecordDroppingUseCase(droppingRepository);
const getPetsUseCase = new GetPetsUseCase(petRepository);
const savePetUseCase = new SavePetUseCase(petRepository);

interface DependencyContextType {
  droppingRepository: AsyncStorageDroppingRepository;
  recordDroppingUseCase: RecordDroppingUseCase;
  getPetsUseCase: GetPetsUseCase;
  savePetUseCase: SavePetUseCase;
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
