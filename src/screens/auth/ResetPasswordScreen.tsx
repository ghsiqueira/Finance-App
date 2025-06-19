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
import { Ionicons } from '@expo/vector-icons';
import * as yup from 'yup';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { authService } from '../../services/api/auth';
import type { AuthStackScreenProps } from '../../navigation/types';

type Props = AuthStackScreenProps<'ResetPassword'>;

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

const resetPasswordSchema = yup.object().shape({
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Senhas não conferem')
    .required('Confirme sua senha'),
});

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  
  const { token } = route.params;

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(token, data.password);
      setPasswordReset(true);
      Alert.alert(
        'Senha redefinida!',
        'Sua senha foi redefinida com sucesso. Agora você pode fazer login com a nova senha.',
        [
          {
            text: 'Fazer Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { 
        strength: strength / 6, 
        text: 'Fraca', 
        color: themeConfig.colors.error 
      };
    } else if (strength <= 4) {
      return { 
        strength: strength / 6, 
        text: 'Média', 
        color: themeConfig.colors.warning 
      };
    } else {
      return { 
        strength: strength / 6, 
        text: 'Forte', 
        color: themeConfig.colors.success 
      };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: themeConfig.colors.primary + '20' }]}>
              <Ionicons 
                name="lock-closed" 
                size={48} 
                color={themeConfig.colors.primary} 
              />
            </View>

            <Text style={[styles.title, { color: themeConfig.colors.text }]}>
              Nova senha
            </Text>
            <Text style={[styles.subtitle, { color: themeConfig.colors.textSecondary }]}>
              Digite sua nova senha. Certifique-se de criar uma senha forte e segura.
            </Text>
          </View>

          {/* Form */}
          <Card variant="elevated" style={styles.formCard}>
            <Controller
              name="password"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Nova Senha"
                    placeholder="Digite sua nova senha"
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
                  
                  {/* Password Strength Indicator */}
                  {value && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View 
                          style={[
                            styles.passwordStrengthFill,
                            { 
                              width: `${passwordStrength.strength * 100}%`,
                              backgroundColor: passwordStrength.color 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.text}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmar Nova Senha"
                  placeholder="Confirme sua nova senha"
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

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: themeConfig.colors.textSecondary }]}>
                Sua senha deve conter:
              </Text>
              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={password?.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={password?.length >= 6 ? themeConfig.colors.success : themeConfig.colors.textLight} 
                  />
                  <Text style={[
                    styles.requirementText, 
                    { color: password?.length >= 6 ? themeConfig.colors.success : themeConfig.colors.textSecondary }
                  ]}>
                    Pelo menos 6 caracteres
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={/[A-Z]/.test(password || '') ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[A-Z]/.test(password || '') ? themeConfig.colors.success : themeConfig.colors.textLight} 
                  />
                  <Text style={[
                    styles.requirementText, 
                    { color: /[A-Z]/.test(password || '') ? themeConfig.colors.success : themeConfig.colors.textSecondary }
                  ]}>
                    Uma letra maiúscula
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={/[0-9]/.test(password || '') ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[0-9]/.test(password || '') ? themeConfig.colors.success : themeConfig.colors.textLight} 
                  />
                  <Text style={[
                    styles.requirementText, 
                    { color: /[0-9]/.test(password || '') ? themeConfig.colors.success : themeConfig.colors.textSecondary }
                  ]}>
                    Um número
                  </Text>
                </View>
              </View>
            </View>

            <Button
              title="Redefinir senha"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              gradient
              style={styles.submitButton}
            />
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeConfig.colors.textSecondary }]}>
              Lembrou da sua senha?
            </Text>
            <Button
              title="Voltar ao login"
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  formCard: {
    marginBottom: 24,
  },
  passwordStrengthContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirementsList: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
  },
  submitButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 16,
  },
  loginButton: {
    minWidth: 120,
  },
});