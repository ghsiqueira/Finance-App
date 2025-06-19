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
import { format } from 'date-fns';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { goalService } from '../../services/api/goals';
import { categoryService } from '../../services/api/categories';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category } from '../../types';

type Props = MainStackScreenProps<'EditGoal'>;

interface GoalForm {
  title: string;
  description?: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  categoryId?: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
}

const goalSchema = yup.object().shape({
  title: yup.string().required('Título obrigatório'),
  description: yup.string().optional(),
  targetAmount: yup.string().required('Valor da meta obrigatório'),
  currentAmount: yup.string().required('Valor atual obrigatório'),
  targetDate: yup.string().required('Data da meta obrigatória'),
  categoryId: yup.string().optional(),
  priority: yup.string().required('Prioridade obrigatória'),
  color: yup.string().required('Cor obrigatória'),
});

const priorityOptions = [
  { value: 'low', label: 'Baixa', icon: 'chevron-down', color: '#10b981' },
  { value: 'medium', label: 'Média', icon: 'remove', color: '#f59e0b' },
  { value: 'high', label: 'Alta', icon: 'chevron-up', color: '#ef4444' },
];

const colorOptions = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#f43f5e',
];

export default function EditGoalScreen({ navigation, route }: Props) {
  const { goalId } = route.params;
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');
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
  } = useForm<GoalForm>({
    resolver: yupResolver(goalSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      priority: 'medium',
      color: colorOptions[0],
    },
    mode: 'onChange',
  });

  // Fetch goal details
  const { data: goalData, isLoading: goalLoading } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalService.getGoal(goalId),
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({ type: 'both' }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: (data: any) => goalService.updateGoal(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      Alert.alert(
        'Sucesso!',
        'Meta atualizada com sucesso!',
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
        error.response?.data?.message || 'Erro ao atualizar meta. Tente novamente.'
      );
    },
  });

  // Load goal data when available
  useEffect(() => {
    if (goalData?.data?.goal) {
      const goal = goalData.data.goal;
      
      setSelectedCategory(goal.categoryId || '');
      setSelectedPriority(goal.priority);
      setSelectedColor(goal.color);
      
      reset({
        title: goal.title,
        description: goal.description || '',
        targetAmount: goal.targetAmount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        currentAmount: goal.currentAmount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        targetDate: format(new Date(goal.targetDate), 'yyyy-MM-dd'),
        categoryId: goal.categoryId || '',
        priority: goal.priority,
        color: goal.color,
      });
    }
  }, [goalData, reset]);

  const onSubmit = async (data: GoalForm) => {
    const goalData = {
      title: data.title,
      description: data.description || undefined,
      targetAmount: parseNumber(data.targetAmount),
      currentAmount: parseNumber(data.currentAmount),
      targetDate: new Date(data.targetDate),
      categoryId: selectedCategory || undefined,
      priority: selectedPriority,
      color: selectedColor,
    };

    updateGoalMutation.mutate(goalData);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setValue('categoryId', categoryId, { shouldValidate: true });
  };

  const handlePrioritySelect = (priority: string) => {
    setSelectedPriority(priority);
    setValue('priority', priority as any, { shouldValidate: true });
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setValue('color', color, { shouldValidate: true });
  };

  const handleAmountChange = (field: 'targetAmount' | 'currentAmount', value: string) => {
    const formatted = formatInputCurrency(value);
    setValue(field, formatted, { shouldValidate: true });
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

  const getProgress = () => {
    const target = parseNumber(watch('targetAmount') || '0');
    const current = parseNumber(watch('currentAmount') || '0');
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getMonthlyContribution = () => {
    const target = parseNumber(watch('targetAmount') || '0');
    const current = parseNumber(watch('currentAmount') || '0');
    const remaining = target - current;
    
    if (remaining <= 0) return 0;
    
    // Calculate months between now and target date
    const targetDate = new Date(watch('targetDate'));
    const now = new Date();
    const monthsDiff = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    return remaining / monthsDiff;
  };

  const renderCategoryItem = (item: Category) => {
    const isSelected = selectedCategory === item._id;
    
    return (
      <TouchableOpacity
        key={item._id}
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

  const renderPriorityItem = (item: typeof priorityOptions[0]) => {
    const isSelected = selectedPriority === item.value;
    
    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.priorityItem,
          {
            backgroundColor: isSelected 
              ? item.color + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? item.color 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => handlePrioritySelect(item.value)}
      >
        <Ionicons 
          name={item.icon as any} 
          size={20} 
          color={isSelected ? item.color : themeConfig.colors.textSecondary} 
        />
        <Text style={[
          styles.priorityName, 
          { 
            color: isSelected 
              ? item.color 
              : themeConfig.colors.text 
          }
        ]}>
          {item.label}
        </Text>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={item.color} 
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

  if (goalLoading) {
    return <Loading />;
  }

  if (!goalData?.data?.goal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Editar Meta" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Meta não encontrada
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            A meta que você está tentando editar não existe ou foi removida.
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
        title="Editar Meta" 
        showBackButton 
        onBackPress={handleCancel}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Goal Details */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Informações da Meta
          </Text>

          <Controller
            name="title"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Título da Meta"
                placeholder="Ex: Viagem para Europa, Carro novo..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.title?.message}
                leftIcon={
                  <Ionicons 
                    name="flag-outline" 
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
                placeholder="Adicione detalhes sobre sua meta..."
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

          <Controller
            name="targetDate"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Data da Meta"
                placeholder="AAAA-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.targetDate?.message}
                leftIcon={
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />
        </Card>

        {/* Amounts */}
        <Card variant="elevated" style={styles.amountsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Valores
          </Text>

          <Controller
            name="targetAmount"
            control={control}
            render={({ field: { onBlur, value } }) => (
              <Input
                label="Valor da Meta"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={(text) => handleAmountChange('targetAmount', text)}
                onBlur={onBlur}
                error={errors.targetAmount?.message}
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
            name="currentAmount"
            control={control}
            render={({ field: { onBlur, value } }) => (
              <Input
                label="Valor Atual (já economizado)"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={(text) => handleAmountChange('currentAmount', text)}
                onBlur={onBlur}
                error={errors.currentAmount?.message}
                keyboardType="numeric"
                leftIcon={
                  <Ionicons 
                    name="wallet-outline" 
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
            Categoria (Opcional)
          </Text>
          
          {categoriesLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: themeConfig.colors.textSecondary }]}>
                Carregando categorias...
              </Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: selectedCategory === '' 
                      ? themeConfig.colors.primary + '20' 
                      : themeConfig.colors.card,
                    borderColor: selectedCategory === '' 
                      ? themeConfig.colors.primary 
                      : themeConfig.colors.border,
                  }
                ]}
                onPress={() => handleCategorySelect('')}
              >
                <View style={[styles.categoryIcon, { backgroundColor: themeConfig.colors.textLight + '20' }]}>
                  <Ionicons name="close" size={20} color={themeConfig.colors.textLight} />
                </View>
                <Text style={[
                  styles.categoryName, 
                  { 
                    color: selectedCategory === '' 
                      ? themeConfig.colors.primary 
                      : themeConfig.colors.text 
                  }
                ]}>
                  Sem categoria
                </Text>
                {selectedCategory === '' && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={themeConfig.colors.primary} 
                  />
                )}
              </TouchableOpacity>
              {categories.map(renderCategoryItem)}
            </View>
          )}
        </Card>

        {/* Priority Selection */}
        <Card variant="elevated" style={styles.priorityCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Prioridade
          </Text>
          
          <View style={styles.priorityGrid}>
            {priorityOptions.map(renderPriorityItem)}
          </View>
        </Card>

        {/* Color Selection */}
        <Card variant="elevated" style={styles.colorCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Cor da Meta
          </Text>
          
          <View style={styles.colorsGrid}>
            {colorOptions.map(renderColorItem)}
          </View>
        </Card>

        {/* Progress Preview */}
        {watch('targetAmount') && watch('currentAmount') && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Prévia da Meta
            </Text>
            
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewColor, { backgroundColor: selectedColor }]} />
                <Text style={[styles.previewTitle, { color: themeConfig.colors.text }]}>
                  {watch('title') || 'Título da Meta'}
                </Text>
                <View style={[styles.priorityBadge, { backgroundColor: priorityOptions.find(p => p.value === selectedPriority)?.color + '20' }]}>
                  <Text style={[styles.priorityBadgeText, { color: priorityOptions.find(p => p.value === selectedPriority)?.color }]}>
                    {priorityOptions.find(p => p.value === selectedPriority)?.label}
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: themeConfig.colors.textSecondary }]}>
                    Progresso
                  </Text>
                  <Text style={[styles.progressValue, { color: themeConfig.colors.primary }]}>
                    {getProgress().toFixed(1)}%
                  </Text>
                </View>
                
                <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${getProgress()}%`,
                        backgroundColor: selectedColor 
                      }
                    ]} 
                  />
                </View>
                
                <View style={styles.progressAmounts}>
                  <Text style={[styles.currentAmount, { color: themeConfig.colors.success }]}>
                    R$ {parseNumber(watch('currentAmount')).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                  <Text style={[styles.targetAmount, { color: themeConfig.colors.text }]}>
                    R$ {parseNumber(watch('targetAmount')).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                </View>
              </View>

              {watch('targetDate') && (
                <View style={styles.calculationContainer}>
                  <View style={styles.calculationItem}>
                    <Text style={[styles.calculationLabel, { color: themeConfig.colors.textSecondary }]}>
                      Faltam
                    </Text>
                    <Text style={[styles.calculationValue, { color: themeConfig.colors.text }]}>
                      R$ {(parseNumber(watch('targetAmount')) - parseNumber(watch('currentAmount'))).toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.calculationItem}>
                    <Text style={[styles.calculationLabel, { color: themeConfig.colors.textSecondary }]}>
                      Contribuição mensal sugerida
                    </Text>
                    <Text style={[styles.calculationValue, { color: themeConfig.colors.primary }]}>
                      R$ {getMonthlyContribution().toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </Text>
                  </View>
                </View>
              )}
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
            loading={updateGoalMutation.isPending}
            disabled={!isValid || !isDirty || updateGoalMutation.isPending}
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
  amountsCard: {
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
  categoriesGrid: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  priorityCard: {
    marginBottom: 16,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  colorCard: {
    marginBottom: 16,
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
    gap: 16,
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
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
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
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  calculationContainer: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  calculationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationLabel: {
    fontSize: 14,
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '500',
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