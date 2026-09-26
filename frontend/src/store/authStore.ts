import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set: (arg0: { token: any; isAuthenticated: boolean; }) => any) => ({
  token: null,
  isAuthenticated: false,
  login: (token: any) => set({ token, isAuthenticated: true }),
  logout: () => set({ token: null, isAuthenticated: false }),
}));
