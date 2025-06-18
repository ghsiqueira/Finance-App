// src/services/storage/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../types';

export interface StoredAuthData {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: number;
  lastLogin: string;
}

export interface LoginSession {
  deviceId: string;
  loginTime: string;
  expiryTime: string;
  isActive: boolean;
}

class AuthStorage {
  private readonly KEYS = {
    AUTH_DATA: 'auth_data',
    USER_PROFILE: 'user_profile',
    TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    LOGIN_SESSIONS: 'login_sessions',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    REMEMBER_EMAIL: 'remember_email',
    LAST_LOGIN_EMAIL: 'last_login_email',
    AUTH_PREFERENCES: 'auth_preferences',
  } as const;

  // Salvar dados de autenticação
  async saveAuthData(authData: StoredAuthData): Promise<void> {
    try {
      const dataToStore = {
        ...authData,
        savedAt: Date.now(),
      };

        await AsyncStorage.multiSet([
        [this.KEYS.AUTH_DATA, JSON.stringify(dataToStore)] as [string, string],
        [this.KEYS.USER_PROFILE, JSON.stringify(authData.user)] as [string, string],
        [this.KEYS.TOKEN, authData.token] as [string, string],
        ...(authData.refreshToken ? [[this.KEYS.REFRESH_TOKEN, authData.refreshToken] as [string, string]] : []),
    ]);

      console.log('✅ Dados de autenticação salvos');
    } catch (error) {
      console.error('❌ Erro ao salvar dados de autenticação:', error);
      throw error;
    }
  }

  // Recuperar dados de autenticação
  async getAuthData(): Promise<StoredAuthData | null> {
    try {
      const authDataString = await AsyncStorage.getItem(this.KEYS.AUTH_DATA);
      
      if (!authDataString) {
        return null;
      }

      const authData: StoredAuthData = JSON.parse(authDataString);
      
      // Verificar se não expirou
      if (authData.expiresAt && Date.now() > authData.expiresAt) {
        console.log('🔐 Token expirado, removendo dados');
        await this.clearAuthData();
        return null;
      }

      return authData;
    } catch (error) {
      console.error('❌ Erro ao recuperar dados de autenticação:', error);
      return null;
    }
  }

  // Obter apenas o token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.TOKEN);
    } catch (error) {
      console.error('❌ Erro ao recuperar token:', error);
      return null;
    }
  }

  // Obter refresh token
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('❌ Erro ao recuperar refresh token:', error);
      return null;
    }
  }

  // Obter perfil do usuário
  async getUserProfile(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem(this.KEYS.USER_PROFILE);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('❌ Erro ao recuperar perfil do usuário:', error);
      return null;
    }
  }

  // Atualizar perfil do usuário
  async updateUserProfile(user: Partial<User>): Promise<void> {
    try {
      const currentUser = await this.getUserProfile();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...user };
        await AsyncStorage.setItem(this.KEYS.USER_PROFILE, JSON.stringify(updatedUser));
        
        // Atualizar também nos dados de auth
        const authData = await this.getAuthData();
        if (authData) {
          authData.user = updatedUser as User;
          await AsyncStorage.setItem(this.KEYS.AUTH_DATA, JSON.stringify(authData));
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  // Limpar todos os dados de autenticação
  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.AUTH_DATA,
        this.KEYS.USER_PROFILE,
        this.KEYS.TOKEN,
        this.KEYS.REFRESH_TOKEN,
      ]);
      
      console.log('🧹 Dados de autenticação limpos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados de autenticação:', error);
      throw error;
    }
  }

  // Verificar se usuário está logado
  async isLoggedIn(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      return authData !== null;
    } catch (error) {
      return false;
    }
  }

  // Salvar sessão de login
  async saveLoginSession(session: LoginSession): Promise<void> {
    try {
      const sessions = await this.getLoginSessions();
      sessions.push(session);
      
      // Manter apenas as últimas 5 sessões
      const recentSessions = sessions.slice(-5);
      
      await AsyncStorage.setItem(this.KEYS.LOGIN_SESSIONS, JSON.stringify(recentSessions));
    } catch (error) {
      console.error('❌ Erro ao salvar sessão de login:', error);
    }
  }

  // Obter sessões de login
  async getLoginSessions(): Promise<LoginSession[]> {
    try {
      const sessionsString = await AsyncStorage.getItem(this.KEYS.LOGIN_SESSIONS);
      return sessionsString ? JSON.parse(sessionsString) : [];
    } catch (error) {
      console.error('❌ Erro ao recuperar sessões de login:', error);
      return [];
    }
  }

  // Invalidar sessão atual
  async invalidateCurrentSession(deviceId: string): Promise<void> {
    try {
      const sessions = await this.getLoginSessions();
      const updatedSessions = sessions.map(session => 
        session.deviceId === deviceId 
          ? { ...session, isActive: false }
          : session
      );
      
      await AsyncStorage.setItem(this.KEYS.LOGIN_SESSIONS, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('❌ Erro ao invalidar sessão:', error);
    }
  }

  // Configurar biometria
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.BIOMETRIC_ENABLED, JSON.stringify(enabled));
    } catch (error) {
      console.error('❌ Erro ao configurar biometria:', error);
    }
  }

  // Verificar se biometria está habilitada
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabledString = await AsyncStorage.getItem(this.KEYS.BIOMETRIC_ENABLED);
      return enabledString ? JSON.parse(enabledString) : false;
    } catch (error) {
      return false;
    }
  }

  // Salvar último email usado
  async saveLastLoginEmail(email: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.LAST_LOGIN_EMAIL, email);
    } catch (error) {
      console.error('❌ Erro ao salvar último email:', error);
    }
  }

  // Obter último email usado
  async getLastLoginEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.LAST_LOGIN_EMAIL);
    } catch (error) {
      return null;
    }
  }

  // Configurar lembrar email
  async setRememberEmail(remember: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.REMEMBER_EMAIL, JSON.stringify(remember));
    } catch (error) {
      console.error('❌ Erro ao configurar lembrar email:', error);
    }
  }

  // Verificar se deve lembrar email
  async shouldRememberEmail(): Promise<boolean> {
    try {
      const rememberString = await AsyncStorage.getItem(this.KEYS.REMEMBER_EMAIL);
      return rememberString ? JSON.parse(rememberString) : false;
    } catch (error) {
      return false;
    }
  }

  // Salvar preferências de autenticação
  async saveAuthPreferences(preferences: {
    autoLogin?: boolean;
    rememberMe?: boolean;
    biometricLogin?: boolean;
    sessionTimeout?: number;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.AUTH_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('❌ Erro ao salvar preferências de auth:', error);
    }
  }

  // Obter preferências de autenticação
  async getAuthPreferences(): Promise<any> {
    try {
      const preferencesString = await AsyncStorage.getItem(this.KEYS.AUTH_PREFERENCES);
      return preferencesString ? JSON.parse(preferencesString) : {
        autoLogin: false,
        rememberMe: true,
        biometricLogin: false,
        sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 dias
      };
    } catch (error) {
      return {
        autoLogin: false,
        rememberMe: true,
        biometricLogin: false,
        sessionTimeout: 30 * 24 * 60 * 60 * 1000,
      };
    }
  }

  // Verificar se token precisa ser renovado
  async shouldRefreshToken(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return false;

      // Renovar se faltam menos de 5 minutos para expirar
      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() > (authData.expiresAt - fiveMinutes);
    } catch (error) {
      return false;
    }
  }

  // Atualizar token
  async updateToken(token: string, expiresAt: number, refreshToken?: string): Promise<void> {
    try {
      const authData = await this.getAuthData();
      if (authData) {
        authData.token = token;
        authData.expiresAt = expiresAt;
        if (refreshToken) {
          authData.refreshToken = refreshToken;
        }

        await AsyncStorage.multiSet([
            [this.KEYS.AUTH_DATA, JSON.stringify(authData)] as [string, string],
            [this.KEYS.TOKEN, token] as [string, string],
            ...(refreshToken ? [[this.KEYS.REFRESH_TOKEN, refreshToken] as [string, string]] : []),
        ]);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar token:', error);
      throw error;
    }
  }

  // Obter informações de debug
  async getAuthDebugInfo(): Promise<any> {
    try {
      const authData = await this.getAuthData();
      const sessions = await this.getLoginSessions();
      const preferences = await this.getAuthPreferences();
      
      return {
        isLoggedIn: await this.isLoggedIn(),
        hasToken: !!(await this.getToken()),
        hasRefreshToken: !!(await this.getRefreshToken()),
        tokenExpiry: authData?.expiresAt ? new Date(authData.expiresAt).toISOString() : null,
        lastLogin: authData?.lastLogin,
        sessionsCount: sessions.length,
        biometricEnabled: await this.isBiometricEnabled(),
        rememberEmail: await this.shouldRememberEmail(),
        lastEmail: await this.getLastLoginEmail(),
        preferences,
      };
    } catch (error: unknown) {
     if (error instanceof Error) {
       console.error('❌ Erro ao atualizar token:', error.message);
     } else {
       console.error('❌ Erro ao atualizar token:', error);
     }
     throw error;
   }
  }
}

// Instância singleton
export const authStorage = new AuthStorage();
export default authStorage;