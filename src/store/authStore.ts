// src/store/authStore.ts - Store de Autenticação Corrigido
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api/auth';

interface AuthState {
  // Estado
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Ações
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuthData: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Estado inicial
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // 🔥 Login
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login({ email, password });
      
      // Salvar dados no AsyncStorage
      await AsyncStorage.multiSet([
        ['auth_token', response.token],
        ['user_data', JSON.stringify(response.user)],
      ]);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log('✅ Login realizado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // 🔥 Registro
  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      await authService.register({ name, email, password });
      
      set({
        isLoading: false,
        error: null,
      });

      console.log('✅ Registro realizado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      set({
        isLoading: false,
        error: error.message,
      });
      throw error;
    }
  },

  // 🔥 Logout
  logout: async () => {
    set({ isLoading: true });

    try {
      await authService.logout();
      
      // Limpar AsyncStorage
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      console.log('✅ Logout realizado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro no logout:', error.message);
      // Mesmo com erro, limpar estado local
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // 🔥 Carregar dados salvos do AsyncStorage
  loadAuthData: async () => {
    set({ isLoading: true });

    try {
      const [token, userData] = await AsyncStorage.multiGet(['auth_token', 'user_data']);
      
      const authToken = token[1];
      const userDataString = userData[1];

      if (authToken && userDataString) {
        const user = JSON.parse(userDataString);
        
        // Verificar se o token ainda é válido
        const isValid = await authService.isAuthenticated();
        
        if (isValid) {
          set({
            user,
            token: authToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ Dados de autenticação carregados');
        } else {
          // Token inválido, limpar dados
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          console.log('⚠️ Token inválido, dados limpos');
        }
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        
        console.log('ℹ️ Nenhum dado de autenticação encontrado');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados de auth:', error.message);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message,
      });
    }
  },

  // 🔥 Limpar erro
  clearError: () => {
    set({ error: null });
  },

  // 🔥 Atualizar dados do usuário
  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      
      set({ user: updatedUser });
      
      // Salvar no AsyncStorage
      AsyncStorage.setItem('user_data', JSON.stringify(updatedUser))
        .catch(error => console.error('❌ Erro ao salvar dados do usuário:', error));
    }
  },

  // 🔥 Verificar status de autenticação
  checkAuthStatus: async (): Promise<boolean> => {
    const { token } = get();
    
    if (!token) return false;
    
    try {
      const isValid = await authService.isAuthenticated();
      
      if (!isValid) {
        // Token inválido, fazer logout
        await get().logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar status de auth:', error);
      await get().logout();
      return false;
    }
  },
}));