import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import * as yup from 'yup';
import type { MainStackScreenProps } from '../../navigation/types';

type Props = MainStackScreenProps<'EditProfile'>;

interface ProfileForm {
  name: string;
  email: string;
  currency: string;
}

// Schema apenas para o formulário de perfil (sem 'theme')
const profileFormSchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório'),
  email: yup.string().email('Email inválido').required('Email obrigatório'),
  currency: yup.string().required('Moeda obrigatória'),
});

export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuthStore();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: yupResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      currency: user?.currency || 'BRL',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      // Aqui você faria a chamada para a API
      await updateUser(data);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Editar Perfil" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: themeConfig.colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Ionicons name="camera" size={20} color={themeConfig.colors.primary} />
              <Text style={[styles.changeAvatarText, { color: themeConfig.colors.primary }]}>
                Alterar Foto
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Form */}
        <Card style={styles.formCard}>
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
            name="currency"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TouchableOpacity
                style={[styles.currencySelector, { borderColor: themeConfig.colors.border }]}
                onPress={() => Alert.alert('Info', 'Seletor de moeda será implementado em breve')}
              >
                <Ionicons 
                  name="card-outline" 
                  size={20} 
                  color={themeConfig.colors.textSecondary} 
                />
                <Text style={[styles.currencyText, { color: themeConfig.colors.text }]}>
                  {value} - Real Brasileiro
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={16} 
                  color={themeConfig.colors.textSecondary} 
                />
              </TouchableOpacity>
            )}
          />
        </Card>

        {/* Verification Status */}
        <Card style={styles.verificationCard}>
          <View style={styles.verificationItem}>
            <View style={styles.verificationLeft}>
              <Ionicons 
                name={user?.isEmailVerified ? "checkmark-circle" : "warning"} 
                size={20} 
                color={user?.isEmailVerified ? themeConfig.colors.success : themeConfig.colors.warning} 
              />
              <Text style={[styles.verificationText, { color: themeConfig.colors.text }]}>
                Email {user?.isEmailVerified ? 'Verificado' : 'Não Verificado'}
              </Text>
            </View>
            {!user?.isEmailVerified && (
              <Button
                title="Verificar"
                size="small"
                onPress={() => Alert.alert('Info', 'Verificação será implementada em breve')}
              />
            )}
          </View>
        </Card>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading || !isDirty}
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
    padding: 16,
  },
  
  // Settings Screen Styles
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  menuCard: {
    padding: 0,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuDivider: {
    height: 1,
    marginLeft: 68,
  },
  logoutSection: {
    marginTop: 32,
    marginBottom: 16,
  },
  logoutButton: {
    borderWidth: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },

  // Edit Profile Screen Styles
  avatarCard: {
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: 16,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
    marginTop: 16,
  },
  currencyText: {
    flex: 1,
    fontSize: 16,
  },
  verificationCard: {
    marginBottom: 24,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verificationText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveSection: {
    marginBottom: 32,
  },
});