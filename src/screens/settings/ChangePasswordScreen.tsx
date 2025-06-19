import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { userService } from '../../services/api/user';
import type { MainStackScreenProps } from '../../navigation/types';

type Props = MainStackScreenProps<'ChangePassword'>;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Senha atual obrigatória'),
  newPassword: yup
    .string()
    .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
    .required('Nova senha obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Senhas não conferem')
    .required('Confirme sua nova senha'),
});

export default function ChangePasswordScreen({ navigation }: Props) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    setIsLoading(true);
    try {
      await userService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: ''
      });
      
      Alert.alert(
        'Senha Alterada!',
        'Sua senha foi alterada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      reset();
    } catch (error: any) {
      Alert.alert(
        'Erro', 
        error.response?.data?.message || 'Erro ao alterar senha. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { 
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    feedback: string[];
  } => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Use pelo menos 8 caracteres');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Inclua letras minúsculas');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Inclua letras maiúsculas');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Inclua números');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Inclua símbolos (!@#$%...)');
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 2) strength = 'medium';

    return { strength, score, feedback };
  };

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return themeConfig.colors.error;
      case 'medium': return themeConfig.colors.warning;
      case 'strong': return themeConfig.colors.success;
      default: return themeConfig.colors.textLight;
    }
  };

  const getStrengthText = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'Fraca';
      case 'medium': return 'Média';
      case 'strong': return 'Forte';
      default: return '';
    }
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <View style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Alterar Senha" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoIcon, { backgroundColor: themeConfig.colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={24} color={themeConfig.colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: themeConfig.colors.text }]}>
              Segurança da Conta
            </Text>
          </View>
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            Altere sua senha regularmente para manter sua conta segura. 
            Use uma senha forte e única que você não utiliza em outros lugares.
          </Text>
        </Card>

        {/* Form */}
        <Card style={styles.formCard}>
          <Controller
            name="currentPassword"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Senha Atual"
                placeholder="Digite sua senha atual"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.currentPassword?.message}
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
            name="newPassword"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  label="Nova Senha"
                  placeholder="Digite sua nova senha"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.newPassword?.message}
                  isPassword
                  leftIcon={
                    <Ionicons 
                      name="key-outline" 
                      size={20} 
                      color={themeConfig.colors.textSecondary} 
                    />
                  }
                />
                
                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthHeader}>
                      <Text style={[styles.strengthLabel, { color: themeConfig.colors.textSecondary }]}>
                        Força da senha:
                      </Text>
                      <Text style={[
                        styles.strengthValue,
                        { color: getStrengthColor(passwordStrength.strength) }
                      ]}>
                        {getStrengthText(passwordStrength.strength)}
                      </Text>
                    </View>
                    
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthSegment,
                            {
                              backgroundColor: level <= passwordStrength.score
                                ? getStrengthColor(passwordStrength.strength)
                                : themeConfig.colors.border
                            }
                          ]}
                        />
                      ))}
                    </View>
                    
                    {passwordStrength.feedback.length > 0 && (
                      <View style={styles.feedbackContainer}>
                        {passwordStrength.feedback.map((tip, index) => (
                          <Text
                            key={index}
                            style={[styles.feedbackText, { color: themeConfig.colors.textLight }]}
                          >
                            • {tip}
                          </Text>
                        ))}
                      </View>
                    )}
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
                  newPassword && value && newPassword === value ? (
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
        </Card>

        {/* Security Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={themeConfig.colors.warning} />
            <Text style={[styles.tipsTitle, { color: themeConfig.colors.text }]}>
              Dicas de Segurança
            </Text>
          </View>
          
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={themeConfig.colors.success} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Use uma senha única que você não usa em outros lugares
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={themeConfig.colors.success} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Evite informações pessoais como nome, data de nascimento
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={themeConfig.colors.success} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Considere usar um gerenciador de senhas
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={themeConfig.colors.success} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Altere sua senha se suspeitar de acesso não autorizado
              </Text>
            </View>
          </View>
        </Card>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            title="Alterar Senha"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            gradient
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    marginBottom: 16,
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    marginBottom: 16,
    gap: 20,
  },
  strengthContainer: {
    marginTop: 12,
    gap: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  feedbackContainer: {
    gap: 4,
  },
  feedbackText: {
    fontSize: 11,
    lineHeight: 16,
  },
  tipsCard: {
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  saveSection: {
    paddingBottom: 32,
  },
});