import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, LoginResponse } from '../types';

interface AuthStore extends AuthState {
  setAuth: (data: LoginResponse & { isOwner?: boolean }) => void;
  syncMe: (data: Omit<LoginResponse, 'accessToken' | 'refreshToken'> & { isOwner?: boolean }) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

const initialState: AuthState = {
  user: null,
  company: null,
  role: null,
  permissions: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isOwner: false,
};

// ─── Token storage strategy ───────────────────────────────────────────────────
// - accessToken → sessionStorage: corta vida (15 min), no persiste entre pestañas.
//   Si hay XSS, el token expira rápido y no se comparte entre sesiones del browser.
// - refreshToken → localStorage: necesario para mantener sesión entre recargas.
//   Zustand persist lo maneja; el token tiene 7 días de vida pero el backend
//   lo rota en cada uso (rotation via refresh endpoint).

const TOKEN_KEY_ACCESS  = 'prosp_at';
const TOKEN_KEY_REFRESH = 'prosp_rt';

function storeTokens(accessToken: string, refreshToken: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY_ACCESS, accessToken);
    localStorage.setItem(TOKEN_KEY_REFRESH, refreshToken);
  } catch {
    // Storage puede estar bloqueado en modo privado/incógnito; continuar
  }
}

function clearTokens() {
  try {
    sessionStorage.removeItem(TOKEN_KEY_ACCESS);
    localStorage.removeItem(TOKEN_KEY_REFRESH);
    // Limpiar clave legacy (si existe de versión anterior)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch {
    // Ignorar
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (data) => {
        storeTokens(data.accessToken, data.refreshToken);
        set({
          user: data.user,
          company: data.company,
          role: data.role,
          permissions: data.permissions,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isOwner: data.isOwner || false,
        });
      },

      // Refresh user/company data without touching tokens (used on app load)
      syncMe: (data) => {
        set({
          user: data.user,
          company: data.company,
          role: data.role,
          permissions: data.permissions,
          isOwner: data.isOwner || false,
        });
      },

      clearAuth: () => {
        clearTokens();
        set(initialState);
      },

      hasPermission: (permission: string) => {
        const { permissions, isOwner } = get();
        if (isOwner) return true;
        return permissions.includes(permission);
      },
    }),
    {
      name: 'prospera-auth',
      // Persistir solo datos de sesión no-sensibles en localStorage.
      // Los tokens se guardan separadamente arriba (access en sessionStorage).
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user:            state.user,
        company:         state.company,
        role:            state.role,
        permissions:     state.permissions,
        // Solo el refreshToken se persiste en el store (localStorage).
        // El accessToken se recupera de sessionStorage al recargar.
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isOwner:         state.isOwner,
        // accessToken no se persiste aquí — viene de sessionStorage
        accessToken:     null,
      }),
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, recuperar el accessToken de sessionStorage
        if (state) {
          const storedAt = sessionStorage.getItem(TOKEN_KEY_ACCESS);
          if (storedAt) {
            state.accessToken = storedAt;
          } else {
            // accessToken expirado/ausente en sessionStorage → desautenticar
            // El API service hará refresh automático con el refreshToken
            state.accessToken = null;
          }
        }
      },
    }
  )
);
