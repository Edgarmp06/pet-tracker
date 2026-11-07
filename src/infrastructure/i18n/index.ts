import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const es = {
  welcome: 'Bienvenido a PetTracker',
  start_walk: 'Iniciar Paseo',
  end_walk: 'Finalizar Paseo',
  poop: 'Caca',
  pee: 'Pipí',
};

const va = {
  welcome: 'Benvingut a PetTracker',
  start_walk: 'Iniciar Passeig',
  end_walk: 'Finalitzar Passeig',
  poop: 'Caca',
  pee: 'Pipí',
};

const en = {
  welcome: 'Welcome to PetTracker',
  start_walk: 'Start Walk',
  end_walk: 'End Walk',
  poop: 'Poop',
  pee: 'Pee',
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    es: { translation: es },
    va: { translation: va },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
