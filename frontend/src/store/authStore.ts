import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true, // true by default until we check secure store on app boot
  
  login: async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    set({ token, isAuthenticated: true });
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({ token: null, isAuthenticated: false });
  },
  
  restoreToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        set({ token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      // restore failed
      set({ isLoading: false });
    }
  }
}));
