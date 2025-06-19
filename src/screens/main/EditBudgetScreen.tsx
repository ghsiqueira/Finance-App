import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { categoryService } from '../../services/api/categories';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category } from '../../types';

type Props = MainStackScreenProps<'EditBudget'>;

interface BudgetForm {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: string;
  notes?: string;
  color: string;
}

const budgetSchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório'),
  amount: yup.string().required('Valor obrigatório'),
  categoryId: yup.string().required('Categoria obrigatória'),
  period: yup.string().required('Período obrigatório'),
  startDate: yup.string().required('Data de início obrigatória'),
  endDate: yup.string().required('Data de fim obrigatória'),
  alertThreshold: yup.string().required('Limite de alerta obrigatório'),
  notes: yup.string().optional(),
  color: yup.string().required('Cor obrigatória'),
});

const periodOptions = [
  { value: 'weekly', label: 'Semanal', icon: 'calendar-outline', duration: 7 },
  { value: 'monthly', label: 'Mensal', icon: 'calendar-outline', duration: 30 },
  { value: 'quarterly', label: 'Trimestral', icon: 'calendar-outline', duration: 90 },
  { value: 'yearly', label: 'Anual', icon: 'calendar-outline', duration: 365 },
];

const colorOptions = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#f43f5e',
];

export default function EditBudgetScreen({ navigation, route }: Props) {
  const { budgetId } = route.params;
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [selectedColor, setSelectedColor] = useState<string>(colorOptions[0]);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<BudgetForm>({
    resolver: yupResolver(budgetSchema) as any,
    defaultValues: {
      name: '',
      amount: '',
      categoryId: '',
      period: 'monthly',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      alertThreshold: '80',
      notes: '',
      color: colorOptions[0],
    },
    mode: 'onChange',
  });

  // Fetch budget details
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetService.getBudget(budgetId),
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({ type: 'expense' }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: (data: any) => budgetService.updateBudget(budgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      Alert.alert(
        'Sucesso!',
        'Orçamento atualizado com sucesso!',
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
        error.response?.data?.message || 'Erro ao atualizar orçamento. Tente novamente.'
      );
    },
  });

  // Load budget data when available
  useEffect(() => {
    if (budgetData?.data?.budget) {
      const budget = budgetData.data.budget;
      
      setSelectedCategory(budget.categoryId);
      setSelectedPeriod(budget.period);
      setSelectedColor(budget.color);
      
      reset({
        name: budget.name,
        amount: budget.amount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        categoryId: budget.categoryId,
        period: budget.period,
        startDate: format(new Date(budget.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(budget.endDate), 'yyyy-MM-dd'),
        alertThreshold: (budget.alertThreshold || 80).toString(),
        notes: budget.notes || '',
        color: budget.color,
      });
    }
  }, [budgetData, reset]);

  const onSubmit = async (data: BudgetForm) => {
    const budgetData = {
      name: data.name,
      amount: parseNumber(data.amount),
      categoryId: selectedCategory,
      period: selectedPeriod,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      alertThreshold: parseInt(data.alertThreshold),
      notes: data.notes || undefined,
      color: selectedColor,
    };

    updateBudgetMutation.mutate(budgetData);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setValue('categoryId', categoryId, { shouldValidate: true });
  };

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setValue('period', period as any, { shouldValidate: true });
    
    // Auto-calculate end date based on period
    const startDate = new Date(watch('startDate'));
    let endDate: Date;
    
    switch (period) {
      case 'weekly':
        endDate = addWeeks(startDate, 1);
        break;
      case 'quarterly':
        endDate = addMonths(startDate, 3);
        break;
      case 'yearly':
        endDate = addYears(startDate, 1);
        break;
      default: // monthly
        endDate = addMonths(startDate, 1);
        break;
    }
    
    setValue('endDate', format(endDate, 'yyyy-MM-dd'));
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setValue('color', color, { shouldValidate: true });
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('amount', formatted, { shouldValidate: true });
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Descartar Alterações',
        'Você tem alterações não salvas. Deseja realmente sair?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => handleCategorySelect(item._id)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text style={[
          styles.categoryName, 
          { 
            color: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.text 
          }
        ]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={themeConfig.colors.primary} 
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderPeriodItem = (item: typeof periodOptions[0]) => {
    const isSelected = selectedPeriod === item.value;
    
    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.periodItem,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => handlePeriodSelect(item.value)}
      >
        <Ionicons 
          name={item.icon as any} 
          size={20} 
          color={isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
        />
        <Text style={[
          styles.periodName, 
          { 
            color: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.text 
          }
        ]}>
          {item.label}
        </Text>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={themeConfig.colors.primary} 
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderColorItem = (color: string, index: number) => {
    const isSelected = selectedColor === color;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.colorItem,
          { 
            backgroundColor: color,
            borderColor: isSelected ? themeConfig.colors.text : 'transparent',
            borderWidth: isSelected ? 3 : 0,
          }
        ]}
        onPress={() => handleColorSelect(color)}
      >
        {isSelected && (
          <Ionicons 
            name="checkmark" 
            size={16} 
            color="#ffffff" 
          />
        )}
      </TouchableOpacity>
    );
  };

  if (budgetLoading) {
    return <Loading />;
  }

  if (!budgetData?.data?.budget) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Editar Orçamento" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Orçamento não encontrado
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            O orçamento que você está tentando editar não existe ou foi removido.
          </Text>
          <Button
            title="Voltar"
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Editar Orçamento" 
        showBackButton 
        onBackPress={handleCancel}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Budget Details */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Informações do Orçamento
          </Text>

          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do Orçamento"
                placeholder="Ex: Alimentação, Transporte..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                leftIcon={
                  <Ionicons 
                    name="pricetag-outline" 
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
            render={({ field: { onBlur, value } }) => (
              <Input
                label="Valor do Orçamento"
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

          <Controller
            name="notes"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Observações (Opcional)"
                placeholder="Adicione detalhes sobre este orçamento..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
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

        {/* Category Selection */}
        <Card variant="elevated" style={styles.categoryCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Categoria
          </Text>
          
          {categoriesLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: themeConfig.colors.textSecondary }]}>
                Carregando categorias...
              </Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color={themeConfig.colors.textLight} />
              <Text style={[styles.emptyStateText, { color: themeConfig.colors.textSecondary }]}>
                Nenhuma categoria de despesa encontrada
              </Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item._id}
              renderItem={renderCategoryItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Card>

        {/* Period Selection */}
        <Card variant="elevated" style={styles.periodCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Período do Orçamento
          </Text>
          
          <View style={styles.periodGrid}>
            {periodOptions.map(renderPeriodItem)}
          </View>
        </Card>

        {/* Date Range */}
        <Card variant="elevated" style={styles.dateCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Período de Vigência
          </Text>

          <View style={styles.dateRow}>
            <Controller
              name="startDate"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.dateInput}>
                  <Input
                    label="Data de Início"
                    placeholder="AAAA-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.startDate?.message}
                    leftIcon={
                      <Ionicons 
                        name="play" 
                        size={20} 
                        color={themeConfig.colors.textSecondary} 
                      />
                    }
                  />
                </View>
              )}
            />

            <Controller
              name="endDate"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.dateInput}>
                  <Input
                    label="Data de Fim"
                    placeholder="AAAA-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.endDate?.message}
                    leftIcon={
                      <Ionicons 
                        name="stop" 
                        size={20} 
                        color={themeConfig.colors.textSecondary} 
                      />
                    }
                  />
                </View>
              )}
            />
          </View>
        </Card>

        {/* Settings */}
        <Card variant="elevated" style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Configurações
          </Text>

          <Controller
            name="alertThreshold"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Limite de Alerta (%)"
                placeholder="80"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.alertThreshold?.message}
                keyboardType="numeric"
                leftIcon={
                  <Ionicons 
                    name="warning-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />

          <View style={styles.colorSection}>
            <Text style={[styles.colorLabel, { color: themeConfig.colors.text }]}>
              Cor do Orçamento
            </Text>
            <View style={styles.colorsGrid}>
              {colorOptions.map(renderColorItem)}
            </View>
          </View>
        </Card>

        {/* Preview */}
        {watch('amount') && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Prévia do Orçamento
            </Text>
            
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewColor, { backgroundColor: selectedColor }]} />
                <Text style={[styles.previewName, { color: themeConfig.colors.text }]}>
                  {watch('name') || 'Nome do Orçamento'}
                </Text>
              </View>
              
              <View style={styles.previewAmounts}>
                <Text style={[styles.previewAmount, { color: themeConfig.colors.primary }]}>
                  R$ {parseNumber(watch('amount')).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </Text>
                <Text style={[styles.previewPeriod, { color: themeConfig.colors.textSecondary }]}>
                  {periodOptions.find(p => p.value === selectedPeriod)?.label}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit(onSubmit) as any}
            loading={updateBudgetMutation.isPending}
            disabled={!isValid || !isDirty || updateBudgetMutation.isPending}
            gradient
            style={styles.saveButton}
          />
        </View>

        <View style={styles.bottomSpacer} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoryCard: {
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  separator: {
    height: 8,
  },
  periodCard: {
    marginBottom: 16,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '48%',
    gap: 8,
  },
  periodName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dateCard: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  settingsCard: {
    marginBottom: 16,
  },
  colorSection: {
    marginTop: 16,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCard: {
    marginBottom: 16,
  },
  previewContent: {
    gap: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewAmounts: {
    alignItems: 'center',
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewPeriod: {
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  bottomSpacer: {
    height: 24,
  },
});