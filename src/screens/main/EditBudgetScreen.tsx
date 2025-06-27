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
  { value: 'weekly' as const, label: 'Semanal', icon: 'calendar-outline' },
  { value: 'monthly' as const, label: 'Mensal', icon: 'calendar' },
  { value: 'quarterly' as const, label: 'Trimestral', icon: 'calendar-sharp' },
  { value: 'yearly' as const, label: 'Anual', icon: 'calendar-sharp' },
  { value: 'custom' as const, label: 'Personalizado', icon: 'settings-outline' },
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

  // Fetch budget
  const { data: budgetResponse, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetService.getBudget(budgetId),
  });

  const budget = budgetResponse?.data?.budget;

  // Fetch categories for expense type
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-for-budget'],
    queryFn: () => categoryService.getCategories({ 
      type: 'expense',
      includeInactive: false 
    }),
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesResponse?.data?.categories || [];
  
  // ✅ CORREÇÃO COMPLETA: Buscar categoria selecionada corretamente
  const selectedCategory = useMemo((): Category | null => {
    if (!formData.categoryId || !categories.length) return null;
    
    // Primeiro, tentar encontrar pela categoria no formData
    const foundCategory = categories.find(cat => cat._id === formData.categoryId);
    if (foundCategory) return foundCategory;
    
    // Se não encontrar e temos budget com categoria, criar objeto Category válido
    if (budget?.category) {
      // ✅ CORREÇÃO: Verificação mais robusta do tipo
      if (typeof budget.category === 'object' && budget.category !== null && 'name' in budget.category) {
        // Type assertion segura após verificação
        const categoryObj = budget.category as any;
        return {
          _id: categoryObj._id || budget.categoryId || '',
          name: categoryObj.name || 'Categoria',
          icon: categoryObj.icon || 'help-circle',
          color: categoryObj.color || '#666666',
          type: (categoryObj.type as 'expense' | 'income' | 'both') || 'expense',
          userId: categoryObj.userId || '',
          isDefault: categoryObj.isDefault || false,
          isActive: categoryObj.isActive !== false,
        } as Category;
      }
    }
    
    return null;
  }, [formData.categoryId, categories, budget]);

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: (updateData: any) => {
      return budgetService.updateBudget(budgetId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Sucesso!',
        'Orçamento atualizado com sucesso.',
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
      
      // ✅ CORREÇÃO PRINCIPAL: Extração segura do categoryId
      let categoryId = '';
      
      // Caso 1: budget.category é um objeto populado
      if (budget.category && typeof budget.category === 'object' && 'name' in budget.category) {
        const categoryObj = budget.category as any;
        categoryId = categoryObj._id || '';
      }
      // Caso 2: budget.categoryId é string
      else if (typeof budget.categoryId === 'string') {
        categoryId = budget.categoryId;
      }
      // Caso 3: budget.categoryId é objeto com _id
      else if (budget.categoryId && typeof budget.categoryId === 'object') {
        const categoryIdObj = budget.categoryId as any;
        categoryId = categoryIdObj._id || '';
      }
      
      const budgetData: BudgetFormData = {
        name: budget.name || '',
        amount: (budget.amount || 0).toString(),
        categoryId, // ✅ Usar categoryId extraído de forma segura
        period: budget.period || 'monthly',
        startDate,
        endDate,
        alertThreshold: (budget.alertThreshold || 80).toString(),
        notes: budget.notes || '',
        isActive: budget.isActive ?? true,
        autoRenew: budget.autoRenew ?? false,
      };
      
      console.log('📋 Form data definido:', budgetData);
      console.log('🏷️ CategoryId definido como:', categoryId);
      
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

  // Auto-calculate end date when period changes (like in AddBudgetScreen)
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
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'Data final deve ser posterior à data inicial';
    }

    const threshold = parseFloat(formData.alertThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      newErrors.alertThreshold = 'Limite deve ser entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Validar valor
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
        console.log('🏷️ Categoria selecionada:', category.name, category._id);
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
          <TouchableOpacity onPress={toggleBudgetStatus} style={styles.headerButton}>
            <Ionicons 
              name={formData.isActive ? "pause-circle-outline" : "play-circle-outline"} 
              size={22} 
              color={formData.isActive ? themeConfig.colors.warning : themeConfig.colors.success} 
            />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        {!formData.isActive && (
          <View style={[styles.statusBanner, { backgroundColor: themeConfig.colors.warning + '20' }]}>
            <Ionicons name="pause-circle" size={20} color={themeConfig.colors.warning} />
            <Text style={[styles.statusText, { color: themeConfig.colors.warning }]}>
              Este orçamento está pausado
            </Text>
          </View>
        )}

        {/* Nome e Valor */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            💰 Detalhes do Orçamento
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Nome do Orçamento
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
              placeholder="Ex: Alimentação Mensal"
              placeholderTextColor={themeConfig.colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.name}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Valor do Orçamento
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
              placeholder="R$ 0,00"
              placeholderTextColor={themeConfig.colors.textSecondary}
              value={formData.amount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
              keyboardType="numeric"
            />
            {errors.amount && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.amount}
              </Text>
            )}
          </View>
        </Card>

        {/* Categoria */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            🏷️ Categoria
          </Text>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[
                styles.selectButton,
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

        {/* Período - Igual ao AddBudgetScreen */}
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
                    borderColor: themeConfig.colors.border,
                    opacity: formData.period === 'custom' ? 1 : 0.6,
                  },
                ]}
                onPress={() => formData.period === 'custom' && setShowEndDatePicker(true)}
                disabled={formData.period !== 'custom'}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color={formData.period === 'custom' ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
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
          
          {formData.period !== 'custom' && (
            <Text style={[styles.periodInfo, { color: themeConfig.colors.textSecondary }]}>
              A data final é calculada automaticamente com base no período selecionado
            </Text>
          )}
        </Card>

        {/* Configurações Avançadas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            ⚙️ Configurações
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
              placeholder="80"
              placeholderTextColor={themeConfig.colors.textSecondary}
              value={formData.alertThreshold}
              onChangeText={(text) => setFormData(prev => ({ ...prev, alertThreshold: text }))}
              keyboardType="numeric"
            />
            {errors.alertThreshold && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.alertThreshold}
              </Text>
            )}
            <Text style={[styles.helperText, { color: themeConfig.colors.textSecondary }]}>
              Você será notificado quando atingir este percentual do orçamento
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Notas (Opcional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              placeholder="Adicione observações sobre este orçamento..."
              placeholderTextColor={themeConfig.colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: themeConfig.colors.text }]}>
                Renovação Automática
              </Text>
              <Text style={[styles.switchDescription, { color: themeConfig.colors.textSecondary }]}>
                Criar automaticamente um novo orçamento ao final do período
              </Text>
            </View>
            <Switch
              value={formData.autoRenew}
              onValueChange={(value) => setFormData(prev => ({ ...prev, autoRenew: value }))}
              trackColor={{ 
                false: themeConfig.colors.border, 
                true: themeConfig.colors.primary + '40' 
              }}
              thumbColor={formData.autoRenew ? themeConfig.colors.primary : themeConfig.colors.surface}
            />
          </View>
        </Card>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            variant="secondary"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          <Button
            title={updateBudgetMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            onPress={handleSubmit}
            disabled={updateBudgetMutation.isPending || !hasChanges}
            style={styles.saveButton}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
            keyExtractor={(item) => item._id}
            renderItem={renderCategoryItem}
            style={styles.categoryList}
            showsVerticalScrollIndicator={false}
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

      {showEndDatePicker && formData.period === 'custom' && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display="default"
          minimumDate={addDays(formData.startDate, 1)}
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
  headerButton: {
    padding: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
    marginBottom: 16,
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 80,
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    flex: 1,
  },
  periodInfo: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  categoryList: {
    flex: 1,
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryType: {
    fontSize: 12,
    marginTop: 2,
  },
});