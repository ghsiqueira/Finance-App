import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import DebugPanel from '../../components/debug/DebugPanel';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { authService } from '../../services/api/auth';
import { registerSchema } from '../../utils/validators';
import type { AuthStackScreenProps, RegisterForm } from '../../types';

type Props = AuthStackScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugTaps, setDebugTaps] = useState(0);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 Testando conexão inicial...');
        const result = await authService.testConnection();
        setConnectionStatus(result.success ? 'connected' : 'error');
        
        if (!result.success) {
          setLastError(result.message);
          console.warn('⚠️ Problema de conexão inicial:', result.message);
        } else {
          console.log('✅ Conexão inicial bem-sucedida');
          setLastError(null);
        }
      } catch (error: any) {
        console.error('❌ Erro no teste de conexão inicial:', error);
        setConnectionStatus('error');
        setLastError(error.message);
      }
    };

    testConnection();
  }, []);

  const handleTitlePress = () => {
    if (__DEV__) {
      setDebugTaps(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) {
          setShowDebug(true);
          return 0;
        }
        return newCount;
      });
      
      setTimeout(() => setDebugTaps(0), 3000);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    console.log('🚀 Iniciando processo de registro...');
    setIsLoading(true);
    setLastError(null);
    
    try {
      if (data.password !== data.confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      if (data.password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      console.log('📝 Dados do formulário:', {
        name: data.name,
        email: data.email,
        passwordLength: data.password.length,
        hasConfirmPassword: !!data.confirmPassword,
      });

      console.log('🔍 Testando conexão antes do registro...');
      const connectionTest = await authService.testConnection();
      
      if (!connectionTest.success) {
        setConnectionStatus('error');
        throw new Error(`Problema de conexão: ${connectionTest.message}`);
      }

      setConnectionStatus('connected');
      console.log('✅ Conexão OK, enviando dados para registro...');
      
      const response = await authService.register(data);
      
      if (response.success) {
        console.log('🎉 Registro bem-sucedido!');
        
        Alert.alert(
          '🎉 Conta Criada!',
          'Sua conta foi criada com sucesso. Você pode fazer login agora.',
          [
            {
              text: 'Fazer Login',
              onPress: () => navigation.navigate('Login'),
              style: 'default',
            },
          ]
        );
      } else {
        console.log('❌ Registro falhou:', response.message);
        setLastError(response.message || 'Erro desconhecido no registro');
        
        Alert.alert(
          'Erro no Registro', 
          response.message || 'Erro desconhecido',
          [
            { text: 'OK' },
            ...__DEV__ ? [{ text: 'Debug', onPress: () => setShowDebug(true) }] : []
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Erro capturado no registro:', error);
      const errorMessage = error.message || 'Erro interno. Tente novamente.';
      setLastError(errorMessage);
      
      Alert.alert(
        'Erro de Registro',
        errorMessage,
        [
          { text: 'Tentar Novamente' },
          ...__DEV__ ? [{ text: '🔧 Debug', onPress: () => setShowDebug(true) }] : []
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const retryConnection = async () => {
    setConnectionStatus('unknown');
    setLastError(null);
    
    try {
      const result = await authService.testConnection();
      setConnectionStatus(result.success ? 'connected' : 'error');
      if (!result.success) {
        setLastError(result.message);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setLastError(error.message);
    }
  };

  if (showDebug) {
    return <DebugPanel onClose={() => setShowDebug(false)} />;
  }

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
            <View style={[styles.logoContainer, { backgroundColor: themeConfig.colors.primary }]}>
              <Ionicons name="person-add" size={32} color="#ffffff" />
            </View>
            
            <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.8}>
              <Text style={[styles.title, { color: themeConfig.colors.text }]}>
                Criar Conta
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.subtitle, { color: themeConfig.colors.textSecondary }]}>
              Junte-se a nós e tome controle das suas finanças
            </Text>
            
            {/* Status de Conexão */}
            <TouchableOpacity 
              style={[styles.statusContainer, { 
                backgroundColor: connectionStatus === 'connected' ? themeConfig.colors.success + '15' : 
                                connectionStatus === 'error' ? themeConfig.colors.error + '15' : 
                                themeConfig.colors.textLight + '15'
              }]}
              onPress={connectionStatus === 'error' ? retryConnection : undefined}
              activeOpacity={connectionStatus === 'error' ? 0.7 : 1}
            >
              <Ionicons 
                name={connectionStatus === 'connected' ? 'wifi' : 
                      connectionStatus === 'error' ? 'ellipse' : 'ellipse'} 
                size={16} 
                color={connectionStatus === 'connected' ? themeConfig.colors.success : 
                       connectionStatus === 'error' ? themeConfig.colors.error : 
                       themeConfig.colors.textLight} 
              />
              <Text style={[styles.statusText, { 
                color: connectionStatus === 'connected' ? themeConfig.colors.success : 
                       connectionStatus === 'error' ? themeConfig.colors.error : 
                       themeConfig.colors.textLight 
              }]}>
                {connectionStatus === 'connected' ? 'Conectado ao servidor' : 
                 connectionStatus === 'error' ? 'Erro de conexão (toque para tentar novamente)' : 
                 'Verificando conexão...'}
              </Text>
              
              {__DEV__ && (
                <TouchableOpacity 
                  onPress={() => setShowDebug(true)}
                  style={styles.debugButton}
                >
                  <Ionicons name="bug" size={16} color={themeConfig.colors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Display */}
          {lastError && (
            <Card variant="outlined" style={[styles.errorCard, { borderColor: themeConfig.colors.error }]}>
              <View style={styles.errorHeader}>
                <Ionicons name="warning" size={20} color={themeConfig.colors.error} />
                <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
                  Erro no Registro
                </Text>
              </View>
              <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
                {lastError}
              </Text>
              <View style={styles.errorActions}>
                <Button
                  title="🔄 Tentar Novamente"
                  variant="outline"
                  size="small"
                  onPress={retryConnection}
                  style={styles.retryButton}
                />
                {__DEV__ && (
                  <Button
                    title="🔧 Debug"
                    variant="ghost"
                    size="small"
                    onPress={() => setShowDebug(true)}
                    style={styles.debugButtonInError}
                  />
                )}
              </View>
            </Card>
          )}

          {/* Form */}
          <Card variant="elevated" style={styles.formCard}>
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
              title={isLoading ? "Criando Conta..." : "Criar Conta"}
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading || connectionStatus === 'error'}
              gradient
              style={styles.registerButton}
            />

            <View style={styles.termsContainer}>
              <Text style={[styles.termsText, { color: themeConfig.colors.textSecondary }]}>
                Ao criar uma conta, você concorda com nossos{' '}
                <Text style={{ color: themeConfig.colors.primary }}>
                  Termos de Uso
                </Text>
                {' '}e{' '}
                <Text style={{ color: themeConfig.colors.primary }}>
                  Política de Privacidade
                </Text>
              </Text>
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeConfig.colors.textSecondary }]}>
              Já tem uma conta?
            </Text>
            <Button
              title="Fazer Login"
              variant="outline"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
            />
          </View>

          {/* Development Info */}
          {__DEV__ && (
            <Card variant="outlined" style={[styles.devCard, { borderColor: themeConfig.colors.warning }]}>
              <View style={styles.devHeader}>
                <Ionicons name="code-slash" size={16} color={themeConfig.colors.warning} />
                <Text style={[styles.devTitle, { color: themeConfig.colors.warning }]}>
                  Modo Desenvolvimento
                </Text>
              </View>
              <Text style={[styles.devText, { color: themeConfig.colors.textSecondary }]}>
                • Toque 5x no título "Criar Conta" para abrir o Debug Panel{'\n'}
                • O ícone 🔧 abre ferramentas de debug{'\n'}
                • Logs detalhados no console do Metro{'\n'}
                • Backend deve estar rodando em localhost:3000
              </Text>
            </Card>
          )}
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
    lineHeight: 22,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    gap: 8,
    minHeight: 36,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  debugButton: {
    padding: 4,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    flex: 1,
  },
  debugButtonInError: {
    flex: 1,
  },
  formCard: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 16,
  },
  loginButton: {
    minWidth: 120,
  },
  devCard: {
    marginTop: 16,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  devText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});