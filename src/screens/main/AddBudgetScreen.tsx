// src/screens/main/AddBudgetScreen.tsx - Criar orçamento com seleção de categorias

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
import * as yup from 'yup';
import { addMonths, addWeeks, addYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps, Category, BudgetForm } from '../../types';

type Props = MainStackScreenProps<'AddBudget'>;

const budgetSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  amount: yup.string().required('Valor é obrigatório'),
  categoryId: yup.string().required('Categoria é obrigatória'),
  period: yup.string().required('Período é obrigatório'),
  alertThreshold: yup.number().min(1).max(100).required(),
  notes: yup.string().optional(),
});

const periodOptions = [
  { value: 'weekly', label: 'Semanal', icon: 'calendar-outline', days: 7 },
  { value: 'monthly', label: 'Mensal', icon: 'calendar-outline', days: 30 },
  { value: 'quarterly', label: 'Trimestral', icon: 'calendar-outline', days: 90 },
  { value: 'yearly', label: 'Anual', icon: 'calendar-outline', days: 365 },
];

export default function AddBudgetScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [showSuggestion, setShowSuggestion] = useState(false);
  
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

  // Fetch categorias disponíveis
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['available-categories'],
    queryFn: () => budgetService.getAvailableCategories(),
  });

  // Fetch sugestão de valor
  const { data: suggestionResponse, isLoading: suggestionLoading } = useQuery({
    queryKey: ['budget-suggestion', selectedCategory, selectedPeriod],
    queryFn: () => budgetService.suggestBudgetAmount(selectedCategory, selectedPeriod),
    enabled: !!selectedCategory && !!selectedPeriod,
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: (data: BudgetForm) => budgetService.createBudget(data),
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

  const categories = categoriesResponse?.data?.categories || [];
  const suggestion = suggestionResponse?.data;

  useEffect(() => {
    if (selectedCategory) {
      setValue('categoryId', selectedCategory);
      
      // Auto-gerar nome do orçamento
      const category = categories.find(c => c._id === selectedCategory);
      if (category) {
        const periodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || 'Mensal';
        const currentMonth = format(new Date(), 'MMM/yyyy', { locale: ptBR });
        setValue('name', `${category.name} - ${periodLabel} ${currentMonth}`);
      }
    }
  }, [selectedCategory, selectedPeriod, categories, setValue]);

  useEffect(() => {
    setValue('period', selectedPeriod as any);
  }, [selectedPeriod, setValue]);

  const onSubmit = async (data: BudgetForm) => {
    const budgetData = {
      ...data,
      categoryId: selectedCategory,
      period: selectedPeriod as any,
    };

    createBudgetMutation.mutate(budgetData);
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('amount', formatted, { shouldValidate: true });
  };

  const applySuggestion = () => {
    if (suggestion) {
      handleAmountChange((suggestion.suggestedAmount * 100).toString());
      setShowSuggestion(false);
    }
  };

  const getEndDate = () => {
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
    const period = periodOptions.find(p => p.value === selectedPeriod);
    return period ? amount / period.days : 0;
  };

  const renderCategoryItem = (category: any) => {
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
          }
        ]}
        onPress={() => setSelectedCategory(category._id)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
        </View>
        
        <View style={styles.categoryContent}>
          <Text style={[
            styles.categoryName, 
            { color: isSelected ? category.color : themeConfig.colors.text }
          ]}>
            {category.name}
          </Text>
          
          {category.hasBudget && (
            <Text style={[styles.categoryStatus, { color: themeConfig.colors.warning }]}>
              ⚠️ Já tem orçamento
            </Text>
          )}
        </View>

        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={category.color} 
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderPeriodButton = (period: typeof periodOptions[0]) => {
    const isSelected = selectedPeriod === period.value;
    
    return (
      <TouchableOpacity
        key={period.value}
        style={[
          styles.periodButton,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '20' 
              : 'transparent',
            borderColor: isSelected 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => setSelectedPeriod(period.value)}
      >
        <Ionicons 
          name={period.icon as any} 
          size={20} 
          color={isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
        />
        <Text style={[
          styles.periodButtonText,
          { color: isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
        ]}>
          {period.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (categoriesLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Criar Orçamento" showBackButton onBackPress={() => navigation.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="💰 Criar Orçamento" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Básico */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📝 Informações Básicas
          </Text>

          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do Orçamento"
                placeholder="Ex: Alimentação - Mensal Dez/24"
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
            )}
          />

          <Controller
            name="amount"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="💰 Valor do Orçamento"
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

          {/* Preview do orçamento */}
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

        {/* Período */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📅 Período do Orçamento
          </Text>
          
          <View style={styles.periodGrid}>
            {periodOptions.map(renderPeriodButton)}
          </View>
        </Card>

        {/* Categorias */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            🏷️ Escolha a Categoria
          </Text>
          
          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={themeConfig.colors.textLight} />
              <Text style={[styles.emptyStateTitle, { color: themeConfig.colors.textSecondary }]}>
                Nenhuma categoria encontrada
              </Text>
              <Button
                title="Criar Categoria"
                onPress={() => navigation.navigate('CategoryManagement')}
                variant="outline"
                style={styles.createCategoryButton}
              />
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={({ item }) => renderCategoryItem(item)}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={styles.categoryRow}
              scrollEnabled={false}
            />
          )}
        </Card>

        {/* Sugestão IA */}
        {suggestion && selectedCategory && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              🤖 Sugestão Inteligente
            </Text>
            
            <View style={[styles.suggestionCard, { backgroundColor: themeConfig.colors.success + '10' }]}>
              <View style={styles.suggestionHeader}>
                <Ionicons name="bulb" size={20} color={themeConfig.colors.success} />
                <Text style={[styles.suggestionTitle, { color: themeConfig.colors.success }]}>
                  Baseado no seu histórico
                </Text>
              </View>
              
              <Text style={[styles.suggestionAmount, { color: themeConfig.colors.text }]}>
                Valor sugerido: R$ {suggestion.suggestedAmount.toFixed(2)}
              </Text>
              
              <Text style={[styles.suggestionDetail, { color: themeConfig.colors.textSecondary }]}>
                Baseado em {suggestion.basedOnMonths} meses de gastos
              </Text>
              
              <Button
                title="Aplicar Sugestão"
                onPress={applySuggestion}
                variant="outline"
                style={styles.suggestionButton}
                leftIcon={<Ionicons name="checkmark" size={16} color={themeConfig.colors.success} />}
              />
            </View>
          </Card>
        )}

        {/* Configurações */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            ⚙️ Configurações
          </Text>

          <Controller
            name="alertThreshold"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="🚨 Alerta aos (% do limite)"
                placeholder="80"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseInt(text) || 80)}
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

          <Controller
            name="notes"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="📝 Observações (Opcional)"
                placeholder="Notas sobre este orçamento..."
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: themeConfig.colors.card, borderTopColor: themeConfig.colors.border }]}>
        <View style={styles.actionButtons}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          />
          
          <Button
            title={createBudgetMutation.isPending ? "Criando..." : "💾 Criar Orçamento"}
            onPress={handleSubmit(onSubmit)}
            loading={createBudgetMutation.isPending}
            disabled={createBudgetMutation.isPending || !isValid || !selectedCategory}
            gradient
            style={styles.createButton}
          />
        </View>
      </View>
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    fontSize: 14,
    marginBottom: 4,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '45%',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryStatus: {
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  createCategoryButton: {
    minWidth: 150,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionDetail: {
    fontSize: 12,
    marginBottom: 12,
  },
  suggestionButton: {
    alignSelf: 'flex-start',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 2,
  },
  bottomSpacer: {
    height: 20,
  },
});