// src/store/authStore.ts - Store de Autenticação Corrigido
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api/auth';
import { apiClient } from '../services/api/config';

interface AuthState {
  // Estado
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Ações
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuthData: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<boolean>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Estado inicial
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,

  // Inicializar store
  initialize: async () => {
    console.log('🚀 Inicializando AuthStore...');
    set({ isLoading: true });

    try {
      await get().loadAuthData();
      console.log('✅ AuthStore inicializado');
    } catch (error) {
      console.log('⚠️ Erro na inicialização:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Login
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      console.log('🔐 Fazendo login...');
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
      
      // Limpar dados em caso de erro
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      
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

  // Registro
  register: async (name: string, email: string, password: string, confirmPassword: string) => {
    set({ isLoading: true, error: null });

    try {
      console.log('📝 Fazendo registro...');
      
      // Validações locais
      if (password !== confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      const response = await authService.register({
        name,
        email,
        password,
        confirmPassword
      });

      console.log('✅ Registro realizado com sucesso');
      
      set({
        isLoading: false,
        error: null,
      });

      // Nota: Não fazemos login automático após registro
      // O usuário deve fazer login manualmente

    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      
      set({
        isLoading: false,
        error: error.message,
      });
      
      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });

    try {
      console.log('🚪 Fazendo logout...');
      
      // Logout no servidor
      await authService.logout();
      
      // Limpar AsyncStorage
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      
      // Limpar estado
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
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Carregar dados de autenticação do AsyncStorage
  loadAuthData: async () => {
    try {
      console.log('📱 Carregando dados do AsyncStorage...');
      
      const [tokenResult, userResult] = await AsyncStorage.multiGet([
        'auth_token',
        'user_data'
      ]);

      const token = tokenResult[1];
      const userData = userResult[1];

      if (token && userData) {
        const user = JSON.parse(userData);
        
        console.log('✅ Dados encontrados no AsyncStorage');
        
        // Verificar se o token ainda é válido
        const isValid = await authService.isAuthenticated();
        
        if (isValid) {
          set({
            user,
            token,
            isAuthenticated: true,
            error: null,
          });
          console.log('✅ Sessão restaurada com sucesso');
        } else {
          console.log('⚠️ Token inválido, limpando dados...');
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          await apiClient.clearAuthToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      } else {
        console.log('ℹ️ Nenhum dado de autenticação encontrado');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados de auth:', error.message);
      
      // Em caso de erro, limpar tudo
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      await apiClient.clearAuthToken();
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  // Limpar erro
  clearError: () => {
    set({ error: null });
  },

  // Atualizar dados do usuário
  updateUser: (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...userData };
      
      // Atualizar estado
      set({ user: updatedUser });
      
      // Salvar no AsyncStorage
      AsyncStorage.setItem('user_data', JSON.stringify(updatedUser)).catch(error => {
        console.error('❌ Erro ao salvar dados atualizados:', error);
      });
    }
  },

  // Verificar status de autenticação
  checkAuthStatus: async (): Promise<boolean> => {
    try {
      const isValid = await authService.isAuthenticated();
      
      if (!isValid) {
        // Limpar dados inválidos
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        await apiClient.clearAuthToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Erro ao verificar auth status:', error);
      return false;
    }
  },
}));