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

const profileFormSchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório'),
  email: yup.string().email('Email inválido').required('Email obrigatório'),
  currency: yup.string().required('Moeda obrigatória'),
});

const CURRENCIES = [
  { value: 'BRL', label: 'Real Brasileiro (R$)' },
  { value: 'USD', label: 'Dólar Americano ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'Libra Esterlina (£)' },
];

export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuthStore();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<ProfileForm>({
    resolver: yupResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      currency: user?.currency || 'BRL',
    },
  });

  const selectedCurrency = watch('currency');

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
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

  const handleCurrencySelect = (currency: string) => {
    setValue('currency', currency, { shouldDirty: true });
    setShowCurrencyPicker(false);
  };

  const renderCurrencyPicker = () => {
    if (!showCurrencyPicker) return null;

    return (
      <Card style={styles.currencyPicker}>
        <Text style={[styles.currencyPickerTitle, { color: themeConfig.colors.text }]}>
          Selecione a Moeda
        </Text>
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.value}
            style={[
              styles.currencyOption,
              selectedCurrency === currency.value && {
                backgroundColor: themeConfig.colors.primary + '15'
              }
            ]}
            onPress={() => handleCurrencySelect(currency.value)}
          >
            <Text style={[
              styles.currencyOptionText,
              { color: themeConfig.colors.text },
              selectedCurrency === currency.value && {
                color: themeConfig.colors.primary,
                fontWeight: '600'
              }
            ]}>
              {currency.label}
            </Text>
            {selectedCurrency === currency.value && (
              <Ionicons 
                name="checkmark" 
                size={20} 
                color={themeConfig.colors.primary} 
              />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    );
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
            <TouchableOpacity 
              style={styles.changeAvatarButton}
              onPress={() => Alert.alert('Info', 'Alteração de foto será implementada em breve')}
            >
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

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: themeConfig.colors.text }]}>
              Moeda Padrão
            </Text>
            <TouchableOpacity
              style={[
                styles.currencySelector,
                { 
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border
                }
              ]}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <View style={styles.currencySelectorLeft}>
                <Ionicons 
                  name="card-outline" 
                  size={20} 
                  color={themeConfig.colors.textSecondary} 
                />
                <Text style={[styles.currencySelectorText, { color: themeConfig.colors.text }]}>
                  {CURRENCIES.find(c => c.value === selectedCurrency)?.label || 'Selecione...'}
                </Text>
              </View>
              <Ionicons 
                name={showCurrencyPicker ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={themeConfig.colors.textSecondary} 
              />
            </TouchableOpacity>
            {errors.currency && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.currency.message}
              </Text>
            )}
          </View>

          {renderCurrencyPicker()}
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={!isDirty}
          />
          
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
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
  avatarCard: {
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 56,
  },
  currencySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  currencySelectorText: {
    fontSize: 16,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  currencyPicker: {
    marginTop: 8,
    marginBottom: 16,
  },
  currencyPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyOptionText: {
    fontSize: 14,
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
    paddingBottom: 32,
  },
  cancelButton: {
    marginTop: 8,
  },
});