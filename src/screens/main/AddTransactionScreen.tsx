// src/screens/main/AddTransactionScreen.tsx - Versão Final Corrigida
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { mapThemeToCompat } from '../../styles/themeCompat';
import { transactionService, CreateTransactionData } from '../../services/api/transactions';
import type { MainStackScreenProps, TransactionFormData, RecurrenceType } from '../../types';

type Props = MainStackScreenProps<'AddTransaction'>;

// 🔥 CORRIGIDO: Schema exatamente alinhado com TransactionFormData
const transactionSchema: yup.ObjectSchema<TransactionFormData> = yup.object({
  description: yup
    .string()
    .required('Descrição é obrigatória')
    .min(1, 'Descrição é obrigatória')
    .max(100, 'Descrição deve ter no máximo 100 caracteres'),
  amount: yup
    .string()
    .required('Valor é obrigatório')
    .test('is-valid-amount', 'Valor deve ser maior que zero', (value) => {
      const numValue = parseFloat(value?.replace(',', '.') || '0');
      return numValue > 0;
    }),
  type: yup
    .mixed<'income' | 'expense'>()
    .oneOf(['income', 'expense'], 'Tipo inválido')
    .required('Tipo é obrigatório'),
  categoryId: yup.string().notRequired().nullable(),
  date: yup.date().required('Data é obrigatória'),
  notes: yup.string().notRequired().nullable().max(500, 'Notas devem ter no máximo 500 caracteres'),
  paymentMethod: yup
    .mixed<'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other'>()
    .oneOf(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'pix', 'other'])
    .required('Método de pagamento é obrigatório'),
  isRecurring: yup.boolean().required(),
  recurringFrequency: yup
    .mixed<RecurrenceType>()
    .notRequired()
    .nullable()
    .oneOf(['daily', 'weekly', 'monthly', 'yearly']),
  recurringInterval: yup
    .string()
    .notRequired()
    .nullable()
    .when('isRecurring', {
      is: true,
      then: (schema) => schema
        .required('Intervalo é obrigatório para transações recorrentes')
        .test('is-valid-interval', 'Intervalo deve ser entre 1 e 99', (value) => {
          const numValue = parseInt(value || '0');
          return numValue >= 1 && numValue <= 99;
        }),
    }),
  recurringEndDate: yup.date().notRequired().nullable(),
  recurringOccurrences: yup
    .string()
    .notRequired()
    .nullable()
    .when('isRecurring', {
      is: true,
      then: (schema) => schema.test('has-end-condition', 'Defina uma data de fim ou número de ocorrências', function(value) {
        const { recurringEndDate } = this.parent;
        return !!(value || recurringEndDate);
      }),
    }),
});

const PAYMENT_METHODS = [
  { value: 'cash' as const, label: 'Dinheiro', icon: 'cash' },
  { value: 'credit_card' as const, label: 'Cartão de Crédito', icon: 'card' },
  { value: 'debit_card' as const, label: 'Cartão de Débito', icon: 'card-outline' },
  { value: 'bank_transfer' as const, label: 'Transferência', icon: 'swap-horizontal' },
  { value: 'pix' as const, label: 'PIX', icon: 'flash' },
  { value: 'other' as const, label: 'Outro', icon: 'ellipsis-horizontal' },
];

const RECURRING_FREQUENCIES = [
  { value: 'daily' as const, label: 'Diariamente' },
  { value: 'weekly' as const, label: 'Semanalmente' },
  { value: 'monthly' as const, label: 'Mensalmente' },
  { value: 'yearly' as const, label: 'Anualmente' },
];

export default function AddTransactionScreen({ navigation, route }: Props) {
  const { theme } = useThemeStore();
  const originalTheme = getTheme(theme);
  const themeConfig = mapThemeToCompat(originalTheme);
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false);

  // 🔥 CORRIGIDO: useForm com tipos corretos
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<TransactionFormData>({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: '',
      type: route.params?.type || 'expense',
      date: new Date(),
      notes: '',
      paymentMethod: 'cash',
      isRecurring: false,
      recurringFrequency: 'monthly',
      recurringInterval: '1',
    },
  });

  const watchType = watch('type');
  const watchIsRecurring = watch('isRecurring');
  const watchDate = watch('date');
  const watchRecurringEndDate = watch('recurringEndDate');

  // 🔥 Auto-preencher dados se vier da navegação
  useEffect(() => {
    if (route.params?.initialData) {
      const { initialData } = route.params;
      reset({
        description: initialData.description,
        amount: initialData.amount,
        type: route.params.type || 'expense',
        categoryId: initialData.categoryId,
        notes: initialData.notes,
        paymentMethod: initialData.paymentMethod as TransactionFormData['paymentMethod'],
        date: new Date(),
        isRecurring: false,
      });
    }
  }, [route.params, reset]);

  // 🔥 CORRIGIDO: Função onSubmit tipada corretamente
  const onSubmit = handleSubmit(async (data: TransactionFormData) => {
    setIsLoading(true);
    
    try {
      const amount = parseFloat(data.amount.replace(',', '.'));
      
      const transactionData: CreateTransactionData = {
        description: data.description.trim(),
        amount,
        type: data.type,
        categoryId: data.categoryId || undefined,
        date: data.date.toISOString(),
        notes: data.notes?.trim() || undefined,
        paymentMethod: data.paymentMethod,
        isRecurring: data.isRecurring,
      };

      // Adicionar configuração de recorrência se necessário
      if (data.isRecurring && data.recurringFrequency) {
        transactionData.recurringConfig = {
          frequency: data.recurringFrequency,
          interval: parseInt(data.recurringInterval!),
          endDate: data.recurringEndDate?.toISOString(),
          remainingOccurrences: data.recurringOccurrences 
            ? parseInt(data.recurringOccurrences) 
            : undefined,
        };
      }

      console.log('💳 Criando transação:', transactionData);

      await transactionService.createTransaction(transactionData);
      
      // Invalidar cache das transações
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      Alert.alert(
        'Sucesso!',
        `${data.isRecurring ? 'Transação recorrente' : 'Transação'} criada com sucesso!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error: any) {
      console.error('❌ Erro ao criar transação:', error);
      Alert.alert(
        'Erro',
        error.message || 'Erro ao criar transação. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('date', selectedDate);
    }
  };

  const handleRecurringEndDateChange = (event: any, selectedDate?: Date) => {
    setShowRecurringEndDatePicker(false);
    if (selectedDate) {
      setValue('recurringEndDate', selectedDate);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.background }]}>
      <Header
        title="Nova Transação"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={onSubmit} disabled={isLoading}>
            <Text style={[styles.saveButton, { color: themeConfig.primary }]}>
              Salvar
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo de Transação */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.foreground }]}>
            Tipo de Transação
          </Text>
          
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: value === 'income' ? themeConfig.success : themeConfig.muted + '20' }
                  ]}
                  onPress={() => onChange('income')}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={24}
                    color={value === 'income' ? 'white' : themeConfig.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: value === 'income' ? 'white' : themeConfig.muted }
                    ]}
                  >
                    Receita
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: value === 'expense' ? themeConfig.destructive : themeConfig.muted + '20' }
                  ]}
                  onPress={() => onChange('expense')}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={24}
                    color={value === 'expense' ? 'white' : themeConfig.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: value === 'expense' ? 'white' : themeConfig.muted }
                    ]}
                  >
                    Gasto
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.type && (
            <Text style={[styles.errorText, { color: themeConfig.destructive }]}>
              {errors.type.message}
            </Text>
          )}
        </Card>

        {/* Informações Básicas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.foreground }]}>
            Informações Básicas
          </Text>

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ex: Almoço no restaurante"
                error={errors.description?.message}
                maxLength={100}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Valor *"
                value={value}
                onChangeText={(text) => {
                  // Permitir apenas números, vírgula e ponto
                  const cleanText = text.replace(/[^0-9.,]/g, '');
                  onChange(cleanText);
                }}
                onBlur={onBlur}
                placeholder="0,00"
                keyboardType="numeric"
                error={errors.amount?.message}
                leftIcon="cash"
              />
            )}
          />

          <View style={styles.dateContainer}>
            <Text style={[styles.label, { color: themeConfig.foreground }]}>
              Data *
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: themeConfig.surface }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={themeConfig.primary} />
              <Text style={[styles.dateText, { color: themeConfig.foreground }]}>
                {watchDate.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={watchDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Observações"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Observações adicionais (opcional)"
                multiline
                numberOfLines={3}
                error={errors.notes?.message}
                maxLength={500}
              />
            )}
          />
        </Card>

        {/* Método de Pagamento */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.foreground }]}>
            Método de Pagamento
          </Text>

          <Controller
            control={control}
            name="paymentMethod"
            render={({ field: { value, onChange } }) => (
              <View style={styles.paymentMethods}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentMethod,
                      {
                        backgroundColor: value === method.value 
                          ? themeConfig.primary + '20' 
                          : themeConfig.surface,
                        borderColor: value === method.value 
                          ? themeConfig.primary 
                          : themeConfig.border,
                      }
                    ]}
                    onPress={() => onChange(method.value)}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={20}
                      color={value === method.value ? themeConfig.primary : themeConfig.muted}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        {
                          color: value === method.value 
                            ? themeConfig.primary 
                            : themeConfig.foreground
                        }
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </Card>

        {/* Recorrência */}
        <Card style={styles.section}>
          <View style={styles.recurringHeader}>
            <Text style={[styles.sectionTitle, { color: themeConfig.foreground }]}>
              Transação Recorrente
            </Text>
            <Controller
              control={control}
              name="isRecurring"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: themeConfig.muted + '40', true: themeConfig.primary + '40' }}
                  thumbColor={value ? themeConfig.primary : themeConfig.muted}
                />
              )}
            />
          </View>

          {watchIsRecurring && (
            <View style={styles.recurringOptions}>
              <Controller
                control={control}
                name="recurringFrequency"
                render={({ field: { value, onChange } }) => (
                  <View>
                    <Text style={[styles.label, { color: themeConfig.foreground }]}>
                      Frequência *
                    </Text>
                    <View style={styles.frequencyButtons}>
                      {RECURRING_FREQUENCIES.map((freq) => (
                        <TouchableOpacity
                          key={freq.value}
                          style={[
                            styles.frequencyButton,
                            {
                              backgroundColor: value === freq.value 
                                ? themeConfig.primary 
                                : themeConfig.surface,
                              borderColor: value === freq.value 
                                ? themeConfig.primary 
                                : themeConfig.border,
                            }
                          ]}
                          onPress={() => onChange(freq.value)}
                        >
                          <Text
                            style={[
                              styles.frequencyButtonText,
                              {
                                color: value === freq.value 
                                  ? 'white' 
                                  : themeConfig.foreground
                              }
                            ]}
                          >
                            {freq.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="recurringInterval"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Input
                      label="Intervalo *"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="1"
                      keyboardType="numeric"
                      error={errors.recurringInterval?.message}
                    />
                    <Text style={[styles.helperText, { color: themeConfig.muted }]}>
                      A cada quantos períodos repetir (1-99)
                    </Text>
                  </View>
                )}
              />

              <View style={styles.endConditions}>
                <Text style={[styles.label, { color: themeConfig.foreground }]}>
                  Condição de Parada
                </Text>
                
                <View style={styles.dateContainer}>
                  <Text style={[styles.sublabel, { color: themeConfig.muted }]}>
                    Data de Fim (opcional)
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: themeConfig.surface }]}
                    onPress={() => setShowRecurringEndDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color={themeConfig.primary} />
                    <Text style={[styles.dateText, { color: themeConfig.foreground }]}>
                      {watchRecurringEndDate 
                        ? watchRecurringEndDate.toLocaleDateString('pt-BR')
                        : 'Selecionar data'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                {showRecurringEndDatePicker && (
                  <DateTimePicker
                    value={watchRecurringEndDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleRecurringEndDateChange}
                    minimumDate={new Date()}
                  />
                )}

                <Controller
                  control={control}
                  name="recurringOccurrences"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <Input
                        label="Ou Número de Ocorrências"
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Ex: 12"
                        keyboardType="numeric"
                        error={errors.recurringOccurrences?.message}
                      />
                      <Text style={[styles.helperText, { color: themeConfig.muted }]}>
                        Quantas vezes repetir (opcional se data de fim definida)
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Botão de Salvar */}
        <View style={styles.buttonContainer}>
          <Button
            title={isLoading ? 'Salvando...' : 'Salvar Transação'}
            onPress={onSubmit}
            loading={isLoading}
            disabled={isLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '48%',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringOptions: {
    gap: 16,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  endConditions: {
    gap: 12,
  },
  buttonContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});