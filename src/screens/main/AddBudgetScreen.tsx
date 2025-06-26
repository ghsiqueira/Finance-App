// src/screens/main/AddBudgetScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as yup from 'yup';
import { addMonths, addWeeks, addYears, format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { CategoriesEmptyState } from '../../components/common/EmptyState';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { categoryService } from '../../services/api/categories';
import { parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category, BudgetForm } from '../../types';

type Props = MainStackScreenProps<'AddBudget'>;

const budgetSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  amount: yup.string().required('Valor é obrigatório'),
  categoryId: yup.string().required('Categoria é obrigatória'),
  period: yup.string().required('Período é obrigatório'),
  alertThreshold: yup.number().min(1).max(100).required(),
  notes: yup.string().optional(), // 🔥 CORRIGIDO: Tornar opcional
});

const periodOptions = [
  { value: 'weekly', label: 'Semanal', icon: 'calendar-outline', days: 7 },
  { value: 'monthly', label: 'Mensal', icon: 'calendar-outline', days: 30 },
  { value: 'quarterly', label: 'Trimestral', icon: 'calendar-outline', days: 90 },
  { value: 'yearly', label: 'Anual', icon: 'calendar-outline', days: 365 },
  { value: 'custom', label: 'Personalizado', icon: 'calendar', days: 30 }, // 🔥 NOVO
];

export default function AddBudgetScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(addMonths(new Date(), 1));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [rawAmount, setRawAmount] = useState('');
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<BudgetForm>({
    resolver: yupResolver(budgetSchema) as any,
    defaultValues: {
      name: '',
      amount: '',
      categoryId: '',
      period: 'monthly' as any,
      alertThreshold: 80,
      notes: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedName = watch('name');

  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-for-budget'],
    queryFn: () => categoryService.getCategories({ 
      type: 'expense',
      includeInactive: false 
    }),
    staleTime: 5 * 60 * 1000,
  });

  const createBudgetMutation = useMutation({
    mutationFn: budgetService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        '🎉 Sucesso!',
        'Orçamento criado com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao criar orçamento. Tente novamente.'
      );
    },
  });

  const categories = categoriesResponse?.data?.categories?.filter(
    (cat: Category) => !cat.isDefault
  ) || [];

  useEffect(() => {
    if (selectedCategory) {
      setValue('categoryId', selectedCategory);
    }
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue('period', selectedPeriod as any);
    setIsCustomPeriod(selectedPeriod === 'custom'); // 🔥 NOVO
  }, [selectedPeriod, setValue]);

  const onSubmit = async (data: BudgetForm) => {
    try {
      // 🔥 CORRIGIDO: Converter valor corretamente
      const numericAmount = parseNumber(data.amount);
      
      if (!numericAmount || numericAmount <= 0) {
        Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero');
        return;
      }

      const budgetData = {
        ...data,
        amount: numericAmount.toString(), // 🔥 CORRIGIDO: Manter como string
        categoryId: selectedCategory,
        period: isCustomPeriod ? 'custom' : selectedPeriod as any,
        startDate: isCustomPeriod ? customStartDate : new Date(),
        endDate: isCustomPeriod ? customEndDate : getEndDate(),
        alertThreshold: 80,
        notes: data.notes?.trim() || undefined, // 🔥 CORRIGIDO: Undefined se vazio
        color: '#3b82f6',
      };

      console.log('📝 Enviando orçamento:', budgetData); // Debug
      createBudgetMutation.mutate(budgetData);
    } catch (error) {
      console.error('Erro ao processar orçamento:', error);
      Alert.alert('Erro', 'Erro ao processar dados do orçamento');
    }
  };

  const handleAmountChange = (value: string) => {
    if (!isEditingAmount) {
      setIsEditingAmount(true);
      setRawAmount('');
    }

    // Se o usuário está apagando tudo
    if (!value || value === 'R$ ' || value === 'R$') {
      setRawAmount('');
      setValue('amount', '');
      return;
    }

    // Extrair apenas números
    const numbersOnly = value.replace(/\D/g, '');
    
    if (!numbersOnly) {
      setRawAmount('');
      setValue('amount', '');
      return;
    }

    // Armazenar valor bruto para manipulação
    setRawAmount(numbersOnly);
    
    // Converter para número (centavos)
    const numericValue = parseInt(numbersOnly, 10);
    
    // Limitar valor máximo
    if (numericValue > 99999999) { // R$ 999.999,99
      return;
    }
    
    // Converter centavos para reais
    const realValue = numericValue / 100;
    
    // Formatar como moeda
    const formattedValue = realValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    setValue('amount', formattedValue);
  };

  const handleAmountFocus = () => {
    setIsEditingAmount(true);
  };

  const handleAmountBlur = () => {
    setIsEditingAmount(false);
    setRawAmount('');
  };

  const handleQuickAmount = (amount: string) => {
    setIsEditingAmount(false);
    setRawAmount('');
    
    const numericValue = parseFloat(amount);
    const formattedValue = numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValue('amount', formattedValue);
  };

  const getEndDate = () => {
    if (isCustomPeriod) {
      return customEndDate;
    }
    
    const now = new Date();
    switch (selectedPeriod) {
      case 'weekly':
        return addWeeks(now, 1);
      case 'quarterly':
        return addMonths(now, 3);
      case 'yearly':
        return addYears(now, 1);
      default:
        return addMonths(now, 1);
    }
  };

  const getDailyBudget = () => {
    const amount = parseNumber(watchedAmount);
    
    if (isCustomPeriod) {
      const diffTime = Math.abs(customEndDate.getTime() - customStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? amount / diffDays : 0;
    }
    
    const period = periodOptions.find(p => p.value === selectedPeriod);
    return period ? amount / period.days : 0;
  };

  const renderPeriodButton = (option: any) => {
    const isSelected = selectedPeriod === option.value;
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.periodButton,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          },
        ]}
        onPress={() => setSelectedPeriod(option.value)}
      >
        <Ionicons 
          name={option.icon as any} 
          size={20} 
          color={isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
        />
        <Text style={[
          styles.periodText,
          { 
            color: isSelected ? themeConfig.colors.primary : themeConfig.colors.text 
          }
        ]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date, type: 'start' | 'end' = 'start') => {
    // Sempre fechar o picker no Android
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    
    if (selectedDate) {
      if (type === 'start') {
        setCustomStartDate(selectedDate);
        // Se data de início for depois da data de fim, ajustar
        if (selectedDate >= customEndDate) {
          setCustomEndDate(addMonths(selectedDate, 1));
        }
      } else {
        setCustomEndDate(selectedDate);
      }
    }
  };

  const renderCategoryItem = (category: Category) => {
    const isSelected = selectedCategory === category._id;
    
    return (
      <TouchableOpacity
        key={category._id}
        style={[
          styles.categoryItem,
          {
            backgroundColor: isSelected 
              ? category.color + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? category.color 
              : themeConfig.colors.border,
          },
        ]}
        onPress={() => setSelectedCategory(
          selectedCategory === category._id ? '' : category._id
        )}
      >
        <Ionicons 
          name={category.icon as any} 
          size={24} 
          color={category.color} 
        />
        <Text style={[
          styles.categoryText,
          { 
            color: isSelected ? category.color : themeConfig.colors.text 
          }
        ]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (categoriesLoading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="Criar Orçamento"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelText, { color: themeConfig.colors.primary }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            🏷️ Escolha a Categoria Primeiro
          </Text>
          
          {categories.length === 0 ? (
            <CategoriesEmptyState 
              onButtonPress={() => navigation.navigate('CategoryManagement')}
              buttonTitle="Criar Categoria"
            />
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryItem)}
            </View>
          )}
        </Card>

        {selectedCategory && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              📝 Dados do Orçamento
            </Text>

            <Controller
              name="name"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Nome do Orçamento"
                    placeholder="Ex: Alimentação - Dezembro 2024"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    leftIcon={
                      <Ionicons 
                        name="document-text-outline" 
                        size={20} 
                        color={themeConfig.colors.textSecondary} 
                      />
                    }
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const category = categories.find(c => c._id === selectedCategory);
                      if (category) {
                        const periodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || 'Mensal';
                        const currentMonth = format(new Date(), 'MMM/yyyy', { locale: ptBR });
                        setValue('name', `${category.name} - ${periodLabel} ${currentMonth}`);
                      }
                    }}
                    style={[styles.autoGenerateButton, { backgroundColor: themeConfig.colors.primary + '10' }]}
                  >
                    <Ionicons name="refresh" size={16} color={themeConfig.colors.primary} />
                    <Text style={[styles.autoGenerateText, { color: themeConfig.colors.primary }]}>
                      Gerar Nome Automático
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <Controller
              name="amount"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="💰 Valor do Orçamento"
                    placeholder="Digite o valor em reais (ex: 450)"
                    value={value}
                    onChangeText={handleAmountChange}
                    onBlur={(e) => {
                      onBlur();
                      handleAmountBlur();
                    }}
                    onFocus={handleAmountFocus}
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
                  <View style={styles.amountSuggestions}>
                    <Text style={[styles.suggestionsLabel, { color: themeConfig.colors.textSecondary }]}>
                      Valores Rápidos:
                    </Text>
                    {['500', '1000', '2000'].map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        onPress={() => handleQuickAmount(amount)}
                        style={[styles.quickAmountButton, { 
                          borderColor: themeConfig.colors.border,
                          backgroundColor: themeConfig.colors.card 
                        }]}
                      >
                        <Text style={[styles.quickAmountText, { color: themeConfig.colors.text }]}>
                          R$ {amount}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={[styles.helpText, { backgroundColor: themeConfig.colors.primary + '05' }]}>
                    <Ionicons name="information-circle-outline" size={14} color={themeConfig.colors.primary} />
                    <Text style={[styles.helpTextContent, { color: themeConfig.colors.primary }]}>
                      💡 Digite normalmente: 450 = R$ 450,00
                    </Text>
                  </View>
                </View>
              )}
            />

            <Controller
              name="notes"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Observações (opcional)"
                  placeholder="Adicione detalhes sobre o orçamento"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={3}
                  leftIcon={
                    <Ionicons 
                      name="chatbubble-outline" 
                      size={20} 
                      color={themeConfig.colors.textSecondary} 
                    />
                  }
                />
              )}
            />

            {parseNumber(watchedAmount) > 0 && (
              <View style={[styles.previewCard, { backgroundColor: themeConfig.colors.primary + '10' }]}>
                <Text style={[styles.previewTitle, { color: themeConfig.colors.primary }]}>
                  💡 Preview do Orçamento
                </Text>
                <Text style={[styles.previewText, { color: themeConfig.colors.text }]}>
                  • Valor total: {watchedAmount}
                </Text>
                <Text style={[styles.previewText, { color: themeConfig.colors.text }]}>
                  • Período: {format(new Date(), 'dd/MM')} até {format(getEndDate(), 'dd/MM/yyyy')}
                </Text>
                <Text style={[styles.previewText, { color: themeConfig.colors.text }]}>
                  • Limite diário: R$ {getDailyBudget().toFixed(2)}
                </Text>
              </View>
            )}
          </Card>
        )}

        {selectedCategory && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              📅 Período do Orçamento
            </Text>
            
            <View style={styles.periodGrid}>
              {periodOptions.map(renderPeriodButton)}
            </View>
            
            {/* 🔥 NOVO: Datas personalizadas */}
            {isCustomPeriod && (
              <View style={styles.customDatesContainer}>
                <Text style={[styles.customDatesTitle, { color: themeConfig.colors.text }]}>
                  📅 Datas Personalizadas
                </Text>
                
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={[styles.dateLabel, { color: themeConfig.colors.textSecondary }]}>
                      Data de Início
                    </Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: themeConfig.colors.border }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={themeConfig.colors.textSecondary} />
                      <Text style={[styles.dateText, { color: themeConfig.colors.text }]}>
                        {format(customStartDate, 'dd/MM/yyyy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateField}>
                    <Text style={[styles.dateLabel, { color: themeConfig.colors.textSecondary }]}>
                      Data de Fim
                    </Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: themeConfig.colors.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={themeConfig.colors.textSecondary} />
                      <Text style={[styles.dateText, { color: themeConfig.colors.text }]}>
                        {format(customEndDate, 'dd/MM/yyyy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={[styles.periodInfo, { backgroundColor: themeConfig.colors.primary + '10' }]}>
                  <Ionicons name="information-circle" size={16} color={themeConfig.colors.primary} />
                  <Text style={[styles.periodInfoText, { color: themeConfig.colors.primary }]}>
                    Duração: {Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24))} dias
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: themeConfig.colors.card, borderTopColor: themeConfig.colors.border }]}>
        <Button
          title={createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
          onPress={handleSubmit(onSubmit)}
          loading={createBudgetMutation.isPending}
          disabled={!isValid || !selectedCategory || createBudgetMutation.isPending}
          style={styles.submitButton}
        />
      </View>

      {/* Date Pickers para Android */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleDateChange(event, date, 'start')}
          minimumDate={new Date()}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleDateChange(event, date, 'end')}
          minimumDate={customStartDate}
        />
      )}
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 12,
    marginBottom: 4,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '48%',
    gap: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '48%',
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    width: '100%',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  autoGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  autoGenerateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountSuggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickAmountButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  helpTextContent: {
    fontSize: 11,
    fontWeight: '500',
  },
  customDatesContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
    gap: 6,
  },
  periodInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});