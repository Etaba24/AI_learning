import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'ai_learning_language'

function detectInitialLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') return stored
  } catch {
    // localStorage indisponible (navigation privée...) -> on retombe sur le français
  }
  return 'fr'
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React échappe déjà le JSX
});

// Persiste le choix à chaque changement de langue, où qu'il soit déclenché
// dans l'app (page Paramètres actuellement).
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // tant pis, le choix ne survivra pas à un rechargement
  }
})

export default i18n
