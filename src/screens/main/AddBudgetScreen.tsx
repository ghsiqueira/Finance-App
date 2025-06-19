import React, { useState } from 'react';
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

type Props = MainStackScreenProps<'AddBudget'>;

interface BudgetForm {
  name: string;
  amount: string;
  categoryId: string;
  description?: string;
}

const budgetSchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório'),
  amount: yup.string().required('Valor obrigatório'),
  categoryId: yup.string().required('Categoria obrigatória'),
  description: yup.string().optional(),
});

export default function AddBudgetScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<BudgetForm>({
    resolver: yupResolver(budgetSchema) as any,
    defaultValues: {
      name: '',
      amount: '',
      categoryId: '',
      description: '',
    },
  });

  const amount = watch('amount');

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: (data: any) => budgetService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      Alert.alert(
        'Sucesso!',
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

  const onSubmit = async (data: BudgetForm) => {
    const budgetData = {
      name: data.name,
      amount: parseNumber(data.amount),
      categoryId: data.categoryId,
      description: data.description || '',
      period: 'monthly' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      alertThreshold: 80,
      color: '#3b82f6',
    };

    createBudgetMutation.mutate(budgetData);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setValue('categoryId', categoryId, { shouldValidate: true });
    
    // Auto-fill budget name with category name if name is empty
    const category = categories?.data?.categories?.find((c: any) => c._id === categoryId);
    if (category && !watch('name')) {
      setValue('name', `Orçamento ${category.name}`);
    }
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('amount', formatted, { shouldValidate: true });
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
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        </View>
        <View style={styles.categoryInfo}>
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
          {item.description && (
            <Text style={[styles.categoryDescription, { color: themeConfig.colors.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
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

  if (categoriesLoading) {
    return <Loading />;
  }

  const expenseCategories = categories?.data?.categories?.filter((cat: any) => 
    cat.type === 'expense' || cat.type === 'both'
  ) || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Novo Orçamento" 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Budget Info Card */}
        <Card variant="elevated" style={styles.infoCard}>
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
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição (Opcional)"
                placeholder="Adicione uma descrição para este orçamento..."
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
          <View style={styles.categoryHeader}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Selecionar Categoria
            </Text>
            {errors.categoryId && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.categoryId.message}
              </Text>
            )}
          </View>

          {expenseCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name="folder-outline" 
                size={48} 
                color={themeConfig.colors.textLight} 
              />
              <Text style={[styles.emptyStateText, { color: themeConfig.colors.textSecondary }]}>
                Nenhuma categoria de despesa encontrada
              </Text>
              <Button
                title="Criar Categoria"
                variant="outline"
                onPress={() => {
                  // Navigate to category management
                  Alert.alert('Info', 'Funcionalidade será implementada em breve');
                }}
                style={styles.createCategoryButton}
              />
            </View>
          ) : (
            <FlatList
              data={expenseCategories}
              keyExtractor={(item) => item._id}
              renderItem={renderCategoryItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Card>

        {/* Budget Preview */}
        {amount && selectedCategory && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Resumo do Orçamento
            </Text>
            
            <View style={styles.previewContent}>
              <View style={styles.previewItem}>
                <Text style={[styles.previewLabel, { color: themeConfig.colors.textSecondary }]}>
                  Categoria
                </Text>
                <Text style={[styles.previewValue, { color: themeConfig.colors.text }]}>
                  {categories?.data?.categories?.find((c: any) => c._id === selectedCategory)?.name}
                </Text>
              </View>
              
              <View style={styles.previewItem}>
                <Text style={[styles.previewLabel, { color: themeConfig.colors.textSecondary }]}>
                  Valor Mensal
                </Text>
                <Text style={[styles.previewValue, { color: themeConfig.colors.primary }]}>
                  R$ {parseNumber(amount).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>

              <View style={styles.previewItem}>
                <Text style={[styles.previewLabel, { color: themeConfig.colors.textSecondary }]}>
                  Valor Diário Médio
                </Text>
                <Text style={[styles.previewValue, { color: themeConfig.colors.textSecondary }]}>
                  R$ {(parseNumber(amount) / 30).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Tips Card */}
        <Card variant="elevated" style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={themeConfig.colors.warning} />
            <Text style={[styles.tipsTitle, { color: themeConfig.colors.text }]}>
              Dicas para um bom orçamento
            </Text>
          </View>
          
          <View style={styles.tipsList}>
            <Text style={[styles.tipItem, { color: themeConfig.colors.textSecondary }]}>
              • Use a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança
            </Text>
            <Text style={[styles.tipItem, { color: themeConfig.colors.textSecondary }]}>
              • Monitore seus gastos semanalmente
            </Text>
            <Text style={[styles.tipItem, { color: themeConfig.colors.textSecondary }]}>
              • Deixe uma margem de 10% para imprevistos
            </Text>
            <Text style={[styles.tipItem, { color: themeConfig.colors.textSecondary }]}>
              • Revise e ajuste mensalmente conforme necessário
            </Text>
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title="Salvar Orçamento"
          onPress={handleSubmit(onSubmit) as any}
          loading={createBudgetMutation.isPending}
          disabled={!isValid || createBudgetMutation.isPending}
          style={styles.saveButton}
          gradient
        />

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
  infoCard: {
    marginBottom: 16,
  },
  categoryCard: {
    marginBottom: 16,
  },
  previewCard: {
    marginBottom: 16,
  },
  tipsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoryHeader: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createCategoryButton: {
    minWidth: 120,
  },
  previewContent: {
    gap: 12,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 24,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 24,
  },
});