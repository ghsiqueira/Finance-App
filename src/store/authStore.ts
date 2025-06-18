// src/store/authStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loadAuthData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      console.error('Erro ao salvar dados de auth:', error);
    }
  },

  updateUser: async (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      try {
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
      }
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'token']);
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  },

  loadAuthData: async () => {
    try {
      const [userString, token] = await AsyncStorage.multiGet(['user', 'token']);
      
      if (userString[1] && token[1]) {
        const user = JSON.parse(userString[1]);
        set({ user, token: token[1], isAuthenticated: true });
      }
    } catch (error) {
      console.error('Erro ao carregar dados de auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));