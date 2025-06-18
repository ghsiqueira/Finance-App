// src/services/api/auth.ts
import { apiClient } from './client';
import { ApiResponse, User, LoginForm, RegisterForm } from '../../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  user: Omit<User, 'id'> & { id: string };
}

export const authService = {
  // Login
  async login(credentials: LoginForm): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post('/auth/login', credentials);
  },

  // Registro
  async register(userData: RegisterForm): Promise<ApiResponse<RegisterResponse>> {
    const { confirmPassword, ...data } = userData;
    return apiClient.post('/auth/register', data);
  },

  // Esqueci a senha
  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    return apiClient.post('/auth/forgot-password', { email });
  },

  // Reset de senha
  async resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
    return apiClient.post('/auth/reset-password', { token, password });
  },

  // Verificar email
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    return apiClient.post('/auth/verify-email', { token });
  },

  // Reenviar verificação
  async resendVerification(email: string): Promise<ApiResponse<null>> {
    return apiClient.post('/auth/resend-verification', { email });
  },

  // Buscar perfil atual
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get('/auth/me');
  },

  // Logout
  async logout(): Promise<ApiResponse<null>> {
    return apiClient.post('/auth/logout');
  },

  // Verificar se token é válido
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  },
};