import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';

import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { registerSchema } from '../../utils/validators';
import type { RegisterForm as RegisterFormData } from '../../types';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await register(data);
      
      if (result.success) {
        Alert.alert(
          'Conta Criada!',
          'Sua conta foi criada com sucesso. Você já pode fazer login.',
          [{ text: 'OK', onPress: () => { reset(); onSuccess?.(); } }]
        );
      } else {
        Alert.alert('Erro no Registro', result.message);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro interno. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Controller
        name="name"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Nome Completo"
            placeholder="Digite seu nome completo"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
            leftIcon={
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={themeConfig.colors.textSecondary} 
              />
            }
          />
        )}
      />

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

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Confirmar Senha"
            placeholder="Confirme sua senha"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            isPassword
            leftIcon={
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={themeConfig.colors.textSecondary} 
              />
            }
            rightIcon={
              password && value && password === value ? (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={themeConfig.colors.success} 
                />
              ) : undefined
            }
          />
        )}
      />

      <Button
        title="Criar Conta"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        gradient
        style={styles.registerButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  registerButton: {
    marginTop: 16,
  },
});