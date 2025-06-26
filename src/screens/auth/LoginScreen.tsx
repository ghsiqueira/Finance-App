import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

const schema = yup.object({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .required('Senha é obrigatória'),
});

interface LoginForm {
  email: string;
  password: string;
}

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore(); // Usar o método login do store
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    try {
      console.log('🔑 Tentando fazer login...');
      
      // Usar o método login do store diretamente
      await login(data.email, data.password);
      
      console.log('✅ Login realizado com sucesso - navegação automática');
      // A navegação vai acontecer automaticamente quando isAuthenticated mudar
      
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      Alert.alert(
        'Erro de Login',
        error.message || 'Erro interno. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: themeConfig.colors.primary }]}>
              <Ionicons name="wallet-outline" size={40} color="white" />
            </View>
            <Text style={[styles.title, { color: themeConfig.colors.text }]}>
              Bem-vindo de volta!
            </Text>
            <Text style={[styles.subtitle, { color: themeConfig.colors.textSecondary }]}>
              Entre na sua conta para continuar
            </Text>
          </View>

          {/* Form */}
          <Card style={styles.formCard}>
            <Text style={[styles.formTitle, { color: themeConfig.colors.text }]}>
              Fazer Login
            </Text>

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

            <Button
              title="Esqueci minha senha"
              variant="ghost"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            />
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeConfig.colors.textSecondary }]}>
              Ainda não tem uma conta?
            </Text>
            <Button
              title="Criar conta"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              style={styles.registerButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  forgotButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 16,
  },
  registerButton: {
    minWidth: 120,
  },
});