import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDependencies } from './DependencyContext';
import { Pet } from '../../domain/entities/Pet';

const ACTIVE_PET_KEY = '@pet_tracker_active_pet_id';

interface ActivePetContextType {
  pets: Pet[];
  activePet: Pet | null;
  isLoading: boolean;
  isWalkInProgress: boolean;
  setWalkInProgress: (inProgress: boolean) => void;
  selectPet: (pet: Pet) => Promise<void>;
  refreshPets: () => Promise<void>;
  ensureActivePet: () => Promise<Pet>;
}

const ActivePetContext = createContext<ActivePetContextType | null>(null);

export const ActivePetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getPetsUseCase, savePetUseCase, authService } = useDependencies();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalkInProgress, setIsWalkInProgress] = useState(false);

  // Espejo síncrono de `activePet` para poder leerlo fuera del ciclo de
  // renderizado (p.ej. desde ensureActivePet), ya que setState es asíncrono.
  const activePetRef = useRef<Pet | null>(null);
  const isWalkInProgressRef = useRef(false);

  const setWalkInProgress = useCallback((inProgress: boolean) => {
    isWalkInProgressRef.current = inProgress;
    setIsWalkInProgress(inProgress);
  }, []);

  const applyActivePet = (pet: Pet | null) => {
    activePetRef.current = pet;
    setActivePet(pet);
  };

  const refreshPets = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        setPets([]);
        applyActivePet(null);
        return;
      }

      let userPets = await getPetsUseCase.execute(user.id);

      // Si el usuario no tiene ninguna mascota guardada, creamos una por defecto
      if (userPets.length === 0) {
        const defaultPet = await savePetUseCase.execute({
          userId: user.id,
          name: 'Max',
          breed: 'Perro',
          age: 3,
        });
        userPets = [defaultPet];
      }

      setPets(userPets);

      const savedActiveId = await AsyncStorage.getItem(ACTIVE_PET_KEY);
      const active =
        userPets.find((p) => p.id === savedActiveId) || userPets[0];
      applyActivePet(active);

      if (active) {
        await AsyncStorage.setItem(ACTIVE_PET_KEY, active.id);
      }
    } catch (error) {
      console.error('Error al cargar las mascotas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getPetsUseCase, savePetUseCase, authService]);

  const selectPet = useCallback(async (pet: Pet) => {
    if (isWalkInProgressRef.current) {
      throw new Error(
        'Termina el paseo en curso antes de cambiar de mascota activa.',
      );
    }

    applyActivePet(pet);
    try {
      await AsyncStorage.setItem(ACTIVE_PET_KEY, pet.id);
    } catch (error) {
      console.error('Error al guardar la mascota activa:', error);
      throw new Error('No se pudo guardar la mascota activa.');
    }
  }, []);

  const ensureActivePet = useCallback(async (): Promise<Pet> => {
    if (activePetRef.current) {
      return activePetRef.current;
    }

    await refreshPets();

    if (!activePetRef.current) {
      throw new Error('No se encontró ninguna mascota activa.');
    }

    return activePetRef.current;
  }, [refreshPets]);

  useEffect(() => {
    refreshPets();
  }, [refreshPets]);

  return (
    <ActivePetContext.Provider
      value={{
        pets,
        activePet,
        isLoading,
        isWalkInProgress,
        setWalkInProgress,
        selectPet,
        refreshPets,
        ensureActivePet,
      }}
    >
      {children}
    </ActivePetContext.Provider>
  );
};

export const useActivePet = () => {
  const context = useContext(ActivePetContext);
  if (!context) {
    throw new Error('useActivePet debe usarse dentro de un ActivePetProvider');
  }
  return context;
};
