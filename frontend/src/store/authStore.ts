import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginResponse } from '../types';

interface AuthStore extends AuthState {
  setAuth: (data: LoginResponse & { isOwner?: boolean }) => void;
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

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (data) => {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
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

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        role: state.role,
        permissions: state.permissions,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isOwner: state.isOwner,
      }),
    }
  )
);
