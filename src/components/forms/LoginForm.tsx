// src/components/forms/LoginForm.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';

import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { loginSchema } from '../../utils/validators';
import type { LoginForm as LoginFormData } from '../../types';

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        reset();
        onSuccess?.();
      } else {
        Alert.alert('Erro no Login', result.message);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro interno. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Controller
        name="email"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="Digite seu email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={themeConfig.colors.textSecondary} 
              />
            }
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Senha"
            placeholder="Digite sua senha"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            isPassword
            leftIcon={
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={themeConfig.colors.textSecondary} 
              />
            }
          />
        )}
      />

      <Button
        title="Entrar"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        gradient
        style={styles.loginButton}
      />

      {onForgotPassword && (
        <Button
          title="Esqueci minha senha"
          variant="ghost"
          onPress={onForgotPassword}
          style={styles.forgotButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  loginButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  forgotButton: {
    marginTop: 8,
  },
});