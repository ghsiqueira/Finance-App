import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { categoryService } from '../../services/api/categories';
import type { MainStackScreenProps, TransactionForm, Category } from '../../types';

interface EnhancedCategory extends Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

type Props = MainStackScreenProps<'AddTransaction'>;

type PaymentMethodType = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Extended form interface to include recurring fields
interface ExtendedTransactionForm extends TransactionForm {
  isRecurring?: boolean;
  recurringConfig?: {
    frequency: RecurrenceType;
    interval: number;
    endDate?: Date;
    remainingOccurrences?: number;
  };
}

const paymentMethodOptions: Array<{
  value: PaymentMethodType;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: 'cash', label: 'Dinheiro', icon: 'cash-outline', color: '#10b981' },
  { value: 'pix', label: 'PIX', icon: 'flash-outline', color: '#3b82f6' },
  { value: 'credit_card', label: 'Crédito', icon: 'card-outline', color: '#8b5cf6' },
  { value: 'debit_card', label: 'Débito', icon: 'card-outline', color: '#06b6d4' },
  { value: 'bank_transfer', label: 'Transferência', icon: 'swap-horizontal-outline', color: '#f59e0b' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal-outline', color: '#6b7280' },
];

const recurrenceOptions = [
  { value: 'daily' as RecurrenceType, label: 'Diariamente', icon: 'calendar-outline' },
  { value: 'weekly' as RecurrenceType, label: 'Semanalmente', icon: 'calendar-outline' },
  { value: 'monthly' as RecurrenceType, label: 'Mensalmente', icon: 'calendar-outline' },
  { value: 'yearly' as RecurrenceType, label: 'Anualmente', icon: 'calendar-outline' },
];

export default function AddTransactionScreen({ navigation, route }: Props) {
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(
    route.params?.type || 'expense'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cash');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 🔥 Estados para recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState<number | null>(null);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const scaleAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(0);

  const parseCurrencyToNumber = useCallback((currencyString: string): number => {
    if (!currencyString) return 0;
    
    const cleanValue = currencyString
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    return parseFloat(cleanValue) || 0;
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExtendedTransactionForm>({
    defaultValues: {
      description: '',
      amount: '',
      type: selectedType,
      categoryId: '',
      date: new Date(),
      notes: '',
      paymentMethod: 'cash' as PaymentMethodType,
      isRecurring: false,
      recurringConfig: {
        frequency: 'monthly' as RecurrenceType,
        interval: 1,
        endDate: undefined,
        remainingOccurrences: undefined,
      },
    },
    mode: 'onChange', 
  });

  const watchedValues = watch();
  const isFormValid = Boolean(
    watchedValues.description?.trim() && 
    watchedValues.amount && 
    parseCurrencyToNumber(watchedValues.amount) > 0
  );

  // 🔥 Query sem categorias default
  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', selectedType],
    queryFn: () => categoryService.getCategories({ 
      type: selectedType,
      includeInactive: false 
    }),
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesResponse?.data?.categories?.filter(
    (cat: EnhancedCategory) => !cat.isDefault // 🔥 FILTRAR categorias default
  ) || [];

  const createTransactionMutation = useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Alert.alert(
          '🎉 Sucesso!', 
          `${selectedType === 'income' ? 'Receita' : 'Gasto'} ${isRecurring ? 'recorrente ' : ''}adicionado com sucesso!`,
          [
            { 
              text: 'Adicionar Outro', 
              onPress: () => {
                setShowSuccess(false);
                fadeAnim.setValue(0);
                reset();
                setSelectedCategory('');
                setSelectedPaymentMethod('cash');
                setSelectedDate(new Date());
                setIsRecurring(false);
              }
            },
            { 
              text: 'Concluir', 
              onPress: () => navigation.goBack(),
              style: 'default'
            }
          ]
        );
      }, 500);
    },
    onError: (error: any) => {
      Alert.alert(
        '❌ Erro',
        error.response?.data?.message || 'Erro ao criar transação. Tente novamente.',
        [{ text: 'OK' }]
      );
    },
  });

  useEffect(() => {
    setValue('type', selectedType);
    setSelectedCategory('');
    setValue('categoryId', '');
  }, [selectedType, setValue]);

  useEffect(() => {
    setValue('categoryId', selectedCategory);
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue('paymentMethod', selectedPaymentMethod);
  }, [selectedPaymentMethod, setValue]);

  useEffect(() => {
    setValue('date', selectedDate);
  }, [selectedDate, setValue]);

  const onSubmit = async (data: ExtendedTransactionForm) => {
    try {
      if (!data.description?.trim()) {
        Alert.alert('Erro', 'Descrição é obrigatória');
        return;
      }

      const numericAmount = parseCurrencyToNumber(data.amount);
      if (!data.amount || numericAmount <= 0) {
        Alert.alert('Erro', 'Valor deve ser maior que zero');
        return;
      }

      // 🔥 Dados de recorrência
      const transactionData: any = {
        description: data.description.trim(),
        amount: numericAmount.toString(),
        type: selectedType,
        categoryId: selectedCategory || undefined,
        date: selectedDate,
        notes: data.notes?.trim() || undefined,
        paymentMethod: selectedPaymentMethod,
        isRecurring,
      };

      // Adicionar configuração de recorrência se necessário
      if (isRecurring) {
        transactionData.recurringConfig = {
          frequency: recurrenceType,
          interval: recurrenceInterval,
          endDate: recurrenceEndDate,
          remainingOccurrences: recurrenceCount,
        };
      }
      
      console.log('📝 Enviando transação:', transactionData);
      createTransactionMutation.mutate(transactionData);
    } catch (error) {
      console.error('❌ Erro ao processar formulário:', error);
      Alert.alert('Erro', 'Erro ao processar dados do formulário');
    }
  };

  const handleAmountChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (!cleanValue) {
      setValue('amount', '');
      return;
    }
    
    const numericValue = parseInt(cleanValue, 10) / 100;
    
    if (numericValue > 999999.99) {
      return;
    }
    
    const formattedValue = numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    setValue('amount', formattedValue);
  }, [setValue]);

  const handleTypeChange = (type: 'income' | 'expense') => {
    setSelectedType(type);
    
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  };

  // Manipuladores de data
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleRecurrenceEndDateChange = (event: any, date?: Date) => {
    setShowRecurrenceEndPicker(Platform.OS === 'ios');
    if (date) {
      setRecurrenceEndDate(date);
    }
  };

  // Fix for recurrence type setting with proper type assertion
  const handleRecurrenceTypeChange = (value: string) => {
    setRecurrenceType(value as RecurrenceType);
  };

  // Gerador de próximas datas
  const getNextOccurrences = (count: number = 3) => {
    if (!isRecurring) return [];
    
    const dates = [];
    let currentDate = new Date(selectedDate);
    
    for (let i = 0; i < count; i++) {
      switch (recurrenceType) {
        case 'daily':
          currentDate = addDays(currentDate, recurrenceInterval);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, recurrenceInterval);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, recurrenceInterval);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, recurrenceInterval);
          break;
      }
      dates.push(new Date(currentDate));
    }
    
    return dates;
  };

  const quickAmounts = selectedType === 'expense' 
    ? [10, 25, 50, 100, 200] 
    : [100, 500, 1000, 2000, 5000];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={themeConfig.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeConfig.colors.text }]}>
          Nova Transação
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tipo de Transação */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            💰 Tipo de Transação
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === 'expense' && styles.typeButtonActive,
                selectedType === 'expense' && { backgroundColor: themeConfig.colors.error + '20', borderColor: themeConfig.colors.error }
              ]}
              onPress={() => handleTypeChange('expense')}
            >
              <Ionicons 
                name="trending-down" 
                size={28} 
                color={selectedType === 'expense' ? themeConfig.colors.error : themeConfig.colors.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: selectedType === 'expense' ? themeConfig.colors.error : themeConfig.colors.textSecondary }
              ]}>
                Gasto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === 'income' && styles.typeButtonActive,
                selectedType === 'income' && { backgroundColor: themeConfig.colors.success + '20', borderColor: themeConfig.colors.success }
              ]}
              onPress={() => handleTypeChange('income')}
            >
              <Ionicons 
                name="trending-up" 
                size={28} 
                color={selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.textSecondary }
              ]}>
                Receita
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Informações Básicas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📝 Informações Básicas
          </Text>

          <Controller
            name="description"
            control={control}
            rules={{ required: 'Descrição é obrigatória' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição *"
                placeholder="Ex: Almoço no restaurante"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                leftIcon={
                  <Ionicons 
                    name="document-text-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />

          <Controller
            name="amount"
            control={control}
            rules={{ 
              required: 'Valor é obrigatório',
              validate: (value) => {
                const num = parseCurrencyToNumber(value);
                if (num <= 0) return 'Valor deve ser maior que zero';
                if (num > 999999.99) return 'Valor muito alto';
                return true;
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="💵 Valor *"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={handleAmountChange}
                onBlur={onBlur}
                error={errors.amount?.message}
                keyboardType="numeric"
                leftIcon={
                  <Ionicons 
                    name="cash-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />

          {/* Valores rápidos */}
          <View style={styles.quickAmounts}>
            <Text style={[styles.quickAmountsLabel, { color: themeConfig.colors.textSecondary }]}>
              Valores rápidos:
            </Text>
            <View style={styles.quickAmountsContainer}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.quickAmountButton, { borderColor: themeConfig.colors.border }]}
                  onPress={() => handleAmountChange((amount * 100).toString())}
                >
                  <Text style={[styles.quickAmountText, { color: themeConfig.colors.primary }]}>
                    R$ {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Seletor de Data */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📅 Data da Transação
          </Text>
          
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: themeConfig.colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.primary} />
            <Text style={[styles.dateButtonText, { color: themeConfig.colors.text }]}>
              {format(selectedDate, 'dd/MM/yyyy (EEEE)', { locale: ptBR })}
            </Text>
            <Ionicons name="chevron-down" size={16} color={themeConfig.colors.textSecondary} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              locale="pt-BR"
            />
          )}
        </Card>

        {/* Configuração de Recorrência */}
        <Card style={styles.section}>
          <View style={styles.recurrenceHeader}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              🔄 Transação Recorrente (Opcional)
            </Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ 
                false: themeConfig.colors.border, 
                true: themeConfig.colors.primary + '50' 
              }}
              thumbColor={isRecurring ? themeConfig.colors.primary : themeConfig.colors.textSecondary}
            />
          </View>

          {isRecurring && (
            <View style={styles.recurrenceConfig}>
              {/* Tipo de Recorrência */}
              <Text style={[styles.subTitle, { color: themeConfig.colors.textSecondary }]}>
                Frequência:
              </Text>
              <View style={styles.recurrenceOptions}>
                {recurrenceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.recurrenceOption,
                      { borderColor: themeConfig.colors.border },
                      recurrenceType === option.value && {
                        backgroundColor: themeConfig.colors.primary + '20',
                        borderColor: themeConfig.colors.primary,
                      }
                    ]}
                    onPress={() => handleRecurrenceTypeChange(option.value)}
                  >
                    <Text style={[
                      styles.recurrenceOptionText,
                      { color: recurrenceType === option.value ? themeConfig.colors.primary : themeConfig.colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Intervalo */}
              <Text style={[styles.subTitle, { color: themeConfig.colors.textSecondary, marginTop: 16 }]}>
                Repetir a cada:
              </Text>
              <View style={styles.intervalContainer}>
                {/* Fixed: Remove Controller for interval and use direct input */}
                <Input
                  value={recurrenceInterval.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    setRecurrenceInterval(Math.max(1, Math.min(num, 99)));
                  }}
                  keyboardType="numeric"
                  style={styles.intervalInput}
                />
                <Text style={[styles.intervalLabel, { color: themeConfig.colors.text }]}>
                  {recurrenceType === 'daily' ? 'dia(s)' : 
                   recurrenceType === 'weekly' ? 'semana(s)' :
                   recurrenceType === 'monthly' ? 'mês(es)' : 'ano(s)'}
                </Text>
              </View>

              {/* Data de Fim (Opcional) */}
              <Text style={[styles.subTitle, { color: themeConfig.colors.textSecondary, marginTop: 16 }]}>
                Terminar em (opcional):
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { borderColor: themeConfig.colors.border }]}
                onPress={() => setShowRecurrenceEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.primary} />
                <Text style={[styles.dateButtonText, { color: themeConfig.colors.text }]}>
                  {recurrenceEndDate 
                    ? format(recurrenceEndDate, 'dd/MM/yyyy', { locale: ptBR })
                    : 'Sem data limite'
                  }
                </Text>
                {recurrenceEndDate && (
                  <TouchableOpacity onPress={() => setRecurrenceEndDate(null)}>
                    <Ionicons name="close-circle" size={16} color={themeConfig.colors.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showRecurrenceEndPicker && (
                <DateTimePicker
                  value={recurrenceEndDate || addMonths(selectedDate, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleRecurrenceEndDateChange}
                  minimumDate={selectedDate}
                  locale="pt-BR"
                />
              )}

              {/* Preview das próximas ocorrências */}
              <View style={styles.previewContainer}>
                <Text style={[styles.subTitle, { color: themeConfig.colors.textSecondary }]}>
                  Próximas ocorrências:
                </Text>
                {getNextOccurrences().map((date, index) => (
                  <Text key={index} style={[styles.previewDate, { color: themeConfig.colors.primary }]}>
                    • {format(date, 'dd/MM/yyyy (EEEE)', { locale: ptBR })}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Categoria */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            🏷️ Categoria {selectedCategory ? '' : '(Opcional)'}
          </Text>
          
          {loadingCategories ? (
            <Text style={{ color: themeConfig.colors.textSecondary }}>Carregando categorias...</Text>
          ) : categories.length === 0 ? (
            <View style={styles.noCategoriesContainer}>
              <Ionicons name="folder-open-outline" size={48} color={themeConfig.colors.textLight} />
              <Text style={[styles.noCategoriesTitle, { color: themeConfig.colors.textSecondary }]}>
                Nenhuma categoria criada
              </Text>
              <Text style={[styles.noCategoriesSubtitle, { color: themeConfig.colors.textLight }]}>
                Crie categorias para organizar melhor suas transações
              </Text>
              <Button
                title="Criar Categoria"
                onPress={() => navigation.navigate('CategoryManagement')}
                variant="outline"
                style={styles.createCategoryButton}
                leftIcon={<Ionicons name="add" size={16} color={themeConfig.colors.primary} />}
              />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((category: EnhancedCategory) => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category._id && {
                      backgroundColor: category.color + '20',
                      borderColor: category.color,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category._id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text 
                    style={[
                      styles.categoryName,
                      { color: selectedCategory === category._id ? category.color : themeConfig.colors.text }
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Card>

        {/* Método de Pagamento */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            💳 Método de Pagamento
          </Text>
          <View style={styles.paymentMethodsGrid}>
            {paymentMethodOptions.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentMethodButton,
                  { borderColor: themeConfig.colors.border },
                  selectedPaymentMethod === method.value && {
                    backgroundColor: method.color + '20',
                    borderColor: method.color,
                  }
                ]}
                onPress={() => setSelectedPaymentMethod(method.value)}
              >
                <Ionicons 
                  name={method.icon as any} 
                  size={20} 
                  color={selectedPaymentMethod === method.value ? method.color : themeConfig.colors.textSecondary} 
                />
                <Text style={[
                  styles.paymentMethodText,
                  { color: selectedPaymentMethod === method.value ? method.color : themeConfig.colors.textSecondary }
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Observações */}
        <Card style={styles.section}>
          <Controller
            name="notes"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="📋 Observações (Opcional)"
                placeholder="Informações adicionais..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.notes?.message}
                multiline
                numberOfLines={3}
                leftIcon={
                  <Ionicons 
                    name="document-text-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />
        </Card>
      </ScrollView>

      {/* Footer com botão */}
      <Animated.View style={[
        styles.footer, 
        { 
          backgroundColor: themeConfig.colors.card, 
          borderTopColor: themeConfig.colors.border,
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        {showSuccess && (
          <Animated.View style={[styles.successIndicator, { opacity: fadeAnim }]}>
            <Ionicons name="checkmark-circle" size={24} color={themeConfig.colors.success} />
            <Text style={[styles.successText, { color: themeConfig.colors.success }]}>
              Transação salva!
            </Text>
          </Animated.View>
        )}
        
        {/* Debug: Mostrar status da validação */}
        {__DEV__ && (
          <Text style={{ fontSize: 10, color: themeConfig.colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
            DEBUG: Form válido: {isFormValid ? 'SIM' : 'NÃO'} | 
            Desc: {watchedValues.description?.trim() ? 'OK' : 'VAZIO'} | 
            Valor: {parseCurrencyToNumber(watchedValues.amount || '') > 0 ? `R$ ${parseCurrencyToNumber(watchedValues.amount || '')}` : 'INVÁLIDO'}
            {isRecurring && ` | Recorrente: ${recurrenceType}`}
          </Text>
        )}
        
        <Button
          title={createTransactionMutation.isPending ? "Salvando..." : `💾 Salvar Transação${isRecurring ? ' Recorrente' : ''}`}
          onPress={handleSubmit(onSubmit)}
          loading={createTransactionMutation.isPending}
          disabled={createTransactionMutation.isPending || !isFormValid}
          fullWidth
          gradient
          style={{
            ...styles.saveButton,
            opacity: isFormValid ? 1 : 0.6
          }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  quickAmounts: {
    marginTop: 12,
  },
  quickAmountsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recurrenceConfig: {
    paddingTop: 8,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurrenceOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  recurrenceOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    flex: 0,
    minWidth: 80,
  },
  intervalLabel: {
    fontSize: 14,
  },
  previewContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  previewDate: {
    fontSize: 12,
    marginTop: 4,
  },
  noCategoriesContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noCategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  noCategoriesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createCategoryButton: {
    minWidth: 150,
  },
  categoriesScroll: {
    marginVertical: 4,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
  },
});