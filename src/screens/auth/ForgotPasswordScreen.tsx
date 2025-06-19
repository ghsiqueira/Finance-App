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

type Props = AuthStackScreenProps<'ForgotPassword'>;

interface ForgotPasswordForm {
  email: string;
}

const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email obrigatório'),
});

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setEmailSent(true);
      Alert.alert(
        'Email enviado!',
        'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao enviar email. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (!email) {
      Alert.alert('Erro', 'Digite seu email primeiro.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert('Sucesso', 'Email reenviado com sucesso!');
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao reenviar email.'
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Button
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.backButton} title={''}            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={themeConfig.colors.text} 
              />
            </Button>

            <View style={[styles.iconContainer, { backgroundColor: themeConfig.colors.primary + '20' }]}>
              <Ionicons 
                name="mail-outline" 
                size={48} 
                color={themeConfig.colors.primary} 
              />
            </View>

            <Text style={[styles.title, { color: themeConfig.colors.text }]}>
              Esqueci minha senha
            </Text>
            <Text style={[styles.subtitle, { color: themeConfig.colors.textSecondary }]}>
              Digite seu email para receber as instruções de redefinição de senha
            </Text>
          </View>

          {/* Form */}
          <Card variant="elevated" style={styles.formCard}>
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

            <Button
              title="Enviar instruções"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              gradient
              style={styles.submitButton}
            />

            {emailSent && (
              <View style={styles.emailSentContainer}>
                <View style={[styles.successIcon, { backgroundColor: themeConfig.colors.success + '20' }]}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={themeConfig.colors.success} 
                  />
                </View>
                <Text style={[styles.successText, { color: themeConfig.colors.success }]}>
                  Email enviado com sucesso!
                </Text>
                <Text style={[styles.instructionText, { color: themeConfig.colors.textSecondary }]}>
                  Verifique sua caixa de entrada e spam. Não recebeu?
                </Text>
                <Button
                  title="Reenviar email"
                  variant="outline"
                  onPress={handleResendEmail}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.resendButton}
                />
              </View>
            )}
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
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 32,
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
  submitButton: {
    marginTop: 8,
  },
  emailSentContainer: {
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  resendButton: {
    minWidth: 140,
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