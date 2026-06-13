import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme    = 'light' | 'dark';
type Language = 'es' | 'en';

interface AppStore {
  theme:       Theme;
  language:    Language;
  setTheme:    (t: Theme)    => void;
  setLanguage: (l: Language) => void;
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme:    'light',
      language: 'es',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setLanguage: (language) => {
        set({ language });
      },
    }),
    {
      name:    'prospera-app-prefs',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Re-apply theme on page reload
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
