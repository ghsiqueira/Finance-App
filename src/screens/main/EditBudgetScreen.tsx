import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { categoryService } from '../../services/api/categories';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category } from '../../types';

type Props = MainStackScreenProps<'EditBudget'>;

interface BudgetFormData {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
  alertThreshold: string;
  notes: string;
  isActive: boolean;
  autoRenew: boolean;
}

const periodOptions = [
  { value: 'weekly' as const, label: 'Semanal', icon: 'calendar-outline', duration: 7 },
  { value: 'monthly' as const, label: 'Mensal', icon: 'calendar', duration: 30 },
  { value: 'quarterly' as const, label: 'Trimestral', icon: 'calendar-sharp', duration: 90 },
  { value: 'yearly' as const, label: 'Anual', icon: 'calendar-sharp', duration: 365 },
  { value: 'custom' as const, label: 'Personalizado', icon: 'settings-outline', duration: 0 },
];

export default function EditBudgetScreen({ navigation, route }: Props) {
  const { budgetId } = route.params;
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    amount: '',
    categoryId: '',
    period: 'monthly',
    startDate: new Date(),
    endDate: addMonths(new Date(), 1),
    alertThreshold: '80',
    notes: '',
    isActive: true,
    autoRenew: false,
  });

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<BudgetFormData | null>(null);

  // Fetch budget details
  const { data: budgetResponse, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetService.getBudget(budgetId),
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-expense'],
    queryFn: () => categoryService.getCategories({ type: 'expense' }),
    staleTime: 5 * 60 * 1000,
  });

  const budget = budgetResponse?.data?.budget;
  const categories = categoriesResponse?.data?.categories || [];
  const selectedCategory = categories.find(cat => cat._id === formData.categoryId);

  // Debug para categorias
  useEffect(() => {
    console.log('🔍 Categories Response:', categoriesResponse);
    console.log('🔍 Categories Array:', categories);
    console.log('🔍 Categories Loading:', categoriesLoading);
  }, [categoriesResponse, categories, categoriesLoading]);

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🔄 Atualizando orçamento:', data);
      return budgetService.updateBudget(budgetId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      Alert.alert(
        'Sucesso!',
        'Orçamento atualizado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      console.error('❌ Erro ao atualizar orçamento:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao atualizar orçamento.'
      );
    },
  });

  // Load budget data when available
  useEffect(() => {
    if (budget) {
      console.log('💾 Carregando dados do orçamento:', budget);
      
      // Garantir que as datas sejam objetos Date válidos
      let startDate: Date;
      let endDate: Date;
      
      try {
        startDate = budget.startDate ? new Date(budget.startDate) : new Date();
        endDate = budget.endDate ? new Date(budget.endDate) : addMonths(new Date(), 1);
        
        // Verificar se as datas são válidas
        if (isNaN(startDate.getTime())) {
          startDate = new Date();
        }
        if (isNaN(endDate.getTime())) {
          endDate = addMonths(new Date(), 1);
        }
      } catch (error) {
        console.error('Erro ao processar datas:', error);
        startDate = new Date();
        endDate = addMonths(new Date(), 1);
      }
      
      const budgetData: BudgetFormData = {
        name: budget.name || '',
        amount: (budget.amount || 0).toString(),
        categoryId: budget.categoryId || '',
        period: budget.period || 'monthly',
        startDate,
        endDate,
        alertThreshold: (budget.alertThreshold || 80).toString(),
        notes: budget.notes || '',
        isActive: budget.isActive ?? true,
        autoRenew: budget.autoRenew ?? false,
      };
      
      console.log('📋 Form data definido:', budgetData);
      setFormData(budgetData);
      setOriginalData(budgetData);
    }
  }, [budget]);

  // Check for changes
  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  // Auto-calculate end date when period changes
  useEffect(() => {
    if (formData.period !== 'custom') {
      const start = startOfDay(formData.startDate);
      let end: Date;
      
      switch (formData.period) {
        case 'weekly':
          end = endOfDay(addWeeks(start, 1));
          break;
        case 'monthly':
          end = endOfDay(addMonths(start, 1));
          break;
        case 'quarterly':
          end = endOfDay(addMonths(start, 3));
          break;
        case 'yearly':
          end = endOfDay(addYears(start, 1));
          break;
        default:
          end = formData.endDate;
      }
      
      if (end.getTime() !== formData.endDate.getTime()) {
        setFormData(prev => ({ ...prev, endDate: end }));
      }
    }
  }, [formData.period, formData.startDate]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    // Melhor validação do valor
    const amountValue = formData.amount.replace(/[^\d,]/g, '').replace(',', '.');
    const parsedAmount = parseFloat(amountValue);
    
    if (!formData.amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Valor deve ser um número válido maior que zero';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    // Validar datas com verificação mais robusta
    if (!formData.startDate) {
      newErrors.startDate = 'Data inicial é obrigatória';
    } else {
      const startDate = formData.startDate instanceof Date ? formData.startDate : new Date(formData.startDate);
      if (isNaN(startDate.getTime())) {
        newErrors.startDate = 'Data inicial inválida';
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Data final é obrigatória';
    } else {
      const endDate = formData.endDate instanceof Date ? formData.endDate : new Date(formData.endDate);
      if (isNaN(endDate.getTime())) {
        newErrors.endDate = 'Data final inválida';
      }
    }

    // Comparar datas apenas se ambas são válidas
    if (formData.startDate && formData.endDate && !newErrors.startDate && !newErrors.endDate) {
      const startDate = formData.startDate instanceof Date ? formData.startDate : new Date(formData.startDate);
      const endDate = formData.endDate instanceof Date ? formData.endDate : new Date(formData.endDate);
      
      if (startDate >= endDate) {
        newErrors.endDate = 'Data final deve ser posterior à data inicial';
      }
    }

    const threshold = parseFloat(formData.alertThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      newErrors.alertThreshold = 'Limite deve ser entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate progress and status
  const budgetStats = useMemo(() => {
    if (!budget) return null;

    const spent = budget.spent || 0;
    const amountValue = formData.amount.replace(/[^\d,]/g, '').replace(',', '.');
    const amount = parseFloat(amountValue) || budget.amount;
    const percentage = amount > 0 ? (spent / amount) * 100 : 0;
    const remaining = amount - spent;
    const threshold = parseFloat(formData.alertThreshold);

    let status: 'safe' | 'warning' | 'critical' | 'exceeded' = 'safe';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= threshold) status = 'critical';
    else if (percentage >= threshold * 0.8) status = 'warning';

    return {
      spent,
      amount,
      percentage,
      remaining,
      status,
      isOverBudget: spent > amount,
    };
  }, [budget, formData.amount, formData.alertThreshold]);

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Converter valor para número corretamente
    const amountValue = formData.amount.replace(/[^\d,]/g, '').replace(',', '.');
    const parsedAmount = parseFloat(amountValue);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Erro', 'Valor do orçamento deve ser maior que zero');
      return;
    }

    // Validar datas - garantir que são objetos Date válidos
    const startDate = formData.startDate instanceof Date ? formData.startDate : new Date(formData.startDate);
    const endDate = formData.endDate instanceof Date ? formData.endDate : new Date(formData.endDate);
    
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert('Erro', 'Datas inválidas');
      return;
    }

    const updateData = {
      name: formData.name.trim(),
      amount: parsedAmount,
      categoryId: formData.categoryId,
      period: formData.period === 'custom' ? 'monthly' : formData.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      alertThreshold: parseFloat(formData.alertThreshold),
      notes: formData.notes.trim() || undefined,
      isActive: formData.isActive,
    };

    console.log('📤 Dados enviados:', updateData);
    console.log('📅 Start Date Object:', startDate);
    console.log('📅 End Date Object:', endDate);
    
    updateBudgetMutation.mutate(updateData);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Descartar Alterações',
        'Você tem alterações não salvas. Deseja realmente sair?',
        [
          { text: 'Continuar Editando', style: 'cancel' },
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

  const handleDuplicate = () => {
    Alert.alert(
      'Duplicar Orçamento',
      'Deseja criar uma cópia deste orçamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Duplicar',
          onPress: () => {
            // Navegar para criação com dados pré-preenchidos
            navigation.navigate('AddBudget', { 
              categoryId: formData.categoryId
            });
          },
        },
      ]
    );
  };

  const toggleBudgetStatus = () => {
    const newStatus = !formData.isActive;
    setFormData(prev => ({ ...prev, isActive: newStatus }));
    
    Alert.alert(
      newStatus ? 'Ativar Orçamento' : 'Pausar Orçamento',
      newStatus 
        ? 'O orçamento será reativado e voltará a rastrear gastos.'
        : 'O orçamento será pausado e não rastreará novos gastos.',
      [
        { 
          text: 'Cancelar', 
          onPress: () => setFormData(prev => ({ ...prev, isActive: !newStatus })),
          style: 'cancel'
        },
        { text: 'Confirmar' },
      ]
    );
  };

  const renderCategoryItem = ({ item: category }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: themeConfig.colors.surface,
          borderColor: formData.categoryId === category._id 
            ? themeConfig.colors.primary 
            : themeConfig.colors.border,
        },
      ]}
      onPress={() => {
        setFormData(prev => ({ ...prev, categoryId: category._id }));
        setShowCategoryModal(false);
      }}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <Ionicons name={category.icon as any} size={24} color={category.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: themeConfig.colors.text }]}>
          {category.name}
        </Text>
        {category.isDefault && (
          <Text style={[styles.categoryType, { color: themeConfig.colors.textSecondary }]}>
            Padrão
          </Text>
        )}
      </View>
      {formData.categoryId === category._id && (
        <Ionicons name="checkmark-circle" size={24} color={themeConfig.colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderPeriodOption = (option: typeof periodOptions[number]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.periodOption,
        {
          backgroundColor: formData.period === option.value 
            ? themeConfig.colors.primary + '20'
            : themeConfig.colors.surface,
          borderColor: formData.period === option.value 
            ? themeConfig.colors.primary
            : themeConfig.colors.border,
        },
      ]}
      onPress={() => setFormData(prev => ({ ...prev, period: option.value }))}
    >
      <Ionicons 
        name={option.icon as any} 
        size={20} 
        color={formData.period === option.value 
          ? themeConfig.colors.primary 
          : themeConfig.colors.textSecondary
        } 
      />
      <Text style={[
        styles.periodOptionText,
        { 
          color: formData.period === option.value 
            ? themeConfig.colors.primary 
            : themeConfig.colors.text 
        }
      ]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  if (budgetLoading || categoriesLoading) {
    return <Loading />;
  }

  if (!budget) {
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
        leftElement={
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color={themeConfig.colors.text} />
          </TouchableOpacity>
        }
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleDuplicate} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={22} color={themeConfig.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleBudgetStatus} style={styles.headerButton}>
              <Ionicons 
                name={formData.isActive ? "pause-circle-outline" : "play-circle-outline"} 
                size={22} 
                color={formData.isActive ? themeConfig.colors.warning : themeConfig.colors.success} 
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        {budgetStats && (
          <Card style={[styles.statusCard, { 
            borderLeftColor: formData.isActive ? themeConfig.colors.primary : themeConfig.colors.textSecondary 
          }]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, { color: themeConfig.colors.text }]}>
                  Status do Orçamento
                </Text>
                <Text style={[
                  styles.statusBadge,
                  {
                    color: formData.isActive ? themeConfig.colors.primary : themeConfig.colors.textSecondary,
                    backgroundColor: formData.isActive 
                      ? themeConfig.colors.primary + '20' 
                      : themeConfig.colors.textSecondary + '20'
                  }
                ]}>
                  {formData.isActive ? 'Ativo' : 'Pausado'}
                </Text>
              </View>
              
              <View style={styles.progressContainer}>
                <Text style={[styles.progressText, { color: themeConfig.colors.text }]}>
                  {formatCurrency(budgetStats.spent)} de {formatCurrency(budgetStats.amount)}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.border }]}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(budgetStats.percentage, 100)}%`,
                      backgroundColor: budgetStats.status === 'exceeded' 
                        ? themeConfig.colors.error
                        : budgetStats.status === 'critical'
                        ? themeConfig.colors.warning
                        : themeConfig.colors.success
                    }
                  ]} />
                </View>
                <Text style={[styles.progressPercentage, { color: themeConfig.colors.textSecondary }]}>
                  {budgetStats.percentage.toFixed(1)}% utilizado
                </Text>
              </View>
            </View>

            {hasChanges && (
              <View style={[styles.changesWarning, { backgroundColor: themeConfig.colors.warning + '20' }]}>
                <Ionicons name="information-circle" size={16} color={themeConfig.colors.warning} />
                <Text style={[styles.changesText, { color: themeConfig.colors.warning }]}>
                  Você tem alterações não salvas
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Basic Information */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📝 Informações Básicas
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Nome do Orçamento *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.name ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Ex: Alimentação Janeiro"
              placeholderTextColor={themeConfig.colors.textSecondary}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.name}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Valor do Orçamento *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.amount ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.amount}
              onChangeText={(text) => {
                // Permitir apenas números e vírgula
                const cleanText = text.replace(/[^\d,]/g, '');
                setFormData(prev => ({ ...prev, amount: cleanText }));
              }}
              placeholder="0,00"
              placeholderTextColor={themeConfig.colors.textSecondary}
              keyboardType="numeric"
            />
            {errors.amount && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.amount}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Categoria *
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.categorySelector,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.categoryId ? themeConfig.colors.error : themeConfig.colors.border,
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  <View style={[styles.categoryIconSmall, { backgroundColor: selectedCategory.color + '20' }]}>
                    <Ionicons name={selectedCategory.icon as any} size={16} color={selectedCategory.color} />
                  </View>
                  <Text style={[styles.selectedCategoryText, { color: themeConfig.colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: themeConfig.colors.textSecondary }]}>
                  Selecione uma categoria
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={themeConfig.colors.textSecondary} />
            </TouchableOpacity>
            {errors.categoryId && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.categoryId}
              </Text>
            )}
          </View>
        </Card>

        {/* Period */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📅 Período do Orçamento
          </Text>

          <View style={styles.periodGrid}>
            {periodOptions.map(renderPeriodOption)}
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, { color: themeConfig.colors.text }]}>
                Data Inicial
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: themeConfig.colors.surface,
                    borderColor: themeConfig.colors.border,
                  },
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.primary} />
                <Text style={[styles.dateText, { color: themeConfig.colors.text }]}>
                  {format(formData.startDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, { color: themeConfig.colors.text }]}>
                Data Final
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: formData.period === 'custom' 
                      ? themeConfig.colors.surface 
                      : themeConfig.colors.surface + '80',
                    borderColor: errors.endDate ? themeConfig.colors.error : themeConfig.colors.border,
                  },
                ]}
                onPress={() => formData.period === 'custom' && setShowEndDatePicker(true)}
                disabled={formData.period !== 'custom'}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color={formData.period === 'custom' 
                    ? themeConfig.colors.primary 
                    : themeConfig.colors.textSecondary
                  } 
                />
                <Text style={[
                  styles.dateText, 
                  { 
                    color: formData.period === 'custom' 
                      ? themeConfig.colors.text 
                      : themeConfig.colors.textSecondary 
                  }
                ]}>
                  {format(formData.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {errors.endDate && (
            <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
              {errors.endDate}
            </Text>
          )}
        </Card>

        {/* Advanced Settings */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            ⚙️ Configurações Avançadas
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Limite de Alerta (%)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.alertThreshold ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.alertThreshold}
              onChangeText={(text) => setFormData(prev => ({ ...prev, alertThreshold: text }))}
              placeholder="80"
              placeholderTextColor={themeConfig.colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={[styles.helperText, { color: themeConfig.colors.textSecondary }]}>
              Receba alertas quando atingir este percentual do orçamento
            </Text>
            {errors.alertThreshold && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.alertThreshold}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Observações (Opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Adicione observações sobre este orçamento..."
              placeholderTextColor={themeConfig.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: themeConfig.colors.text }]}>
                Renovação Automática
              </Text>
              <Text style={[styles.toggleDescription, { color: themeConfig.colors.textSecondary }]}>
                Criar novo orçamento automaticamente quando este expirar
              </Text>
            </View>
            <Switch
              value={formData.autoRenew}
              onValueChange={(value) => setFormData(prev => ({ ...prev, autoRenew: value }))}
              trackColor={{ 
                false: themeConfig.colors.border, 
                true: themeConfig.colors.primary + '60' 
              }}
              thumbColor={formData.autoRenew ? themeConfig.colors.primary : themeConfig.colors.surface}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: themeConfig.colors.background }]}>
        <Button
          title="Cancelar"
          variant="outline"
          onPress={handleCancel}
          style={styles.footerButton}
        />
        <Button
          title="Salvar Alterações"
          onPress={handleSubmit}
          loading={updateBudgetMutation.isPending}
          disabled={!hasChanges || updateBudgetMutation.isPending}
          style={styles.footerButton}
        />
      </View>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeConfig.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeConfig.colors.border }]}>
            <Text style={[styles.modalTitle, { color: themeConfig.colors.text }]}>
              Selecionar Categoria
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color={themeConfig.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.categoriesList}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, startDate: selectedDate }));
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display="default"
          minimumDate={formData.startDate}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, endDate: selectedDate }));
            }
          }}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
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
  statusCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statusHeader: {
    gap: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressContainer: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    textAlign: 'right',
  },
  changesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  changesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedCategoryText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  periodOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryType: {
    fontSize: 12,
  },
});