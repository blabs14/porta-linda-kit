import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'pt-PT': {
    translation: {
      settings: {
        title: 'Definições',
        personal: 'Pessoais',
        language: 'Idioma',
        currency: 'Moeda',
        save: 'Guardar',
        cancel: 'Cancelar',
      },
    },
  },
  'en-US': {
    translation: {
      settings: {
        title: 'Settings',
        personal: 'Personal',
        language: 'Language',
        currency: 'Currency',
        save: 'Save',
        cancel: 'Cancel',
      },
    },
  },
};

let initialized = false;

export function initI18n(language: string) {
  if (initialized) return;
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'pt-PT',
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

export function changeLanguage(language: string) {
  if (!initialized) {
    initI18n(language);
  }
  i18n.changeLanguage(language);
}

export default i18n;