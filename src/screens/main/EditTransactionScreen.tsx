import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { categoryService } from '../../services/api/categories';
import { transactionSchema } from '../../utils/validators';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category } from '../../types';

type Props = MainStackScreenProps<'EditTransaction'>;

interface TransactionForm {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: string;
  date: string;
  notes?: string;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
}

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro', icon: 'cash-outline', color: '#10b981' },
  { value: 'pix', label: 'PIX', icon: 'flash-outline', color: '#3b82f6' },
  { value: 'credit_card', label: 'Crédito', icon: 'card-outline', color: '#8b5cf6' },
  { value: 'debit_card', label: 'Débito', icon: 'card-outline', color: '#06b6d4' },
  { value: 'bank_transfer', label: 'Transferência', icon: 'swap-horizontal-outline', color: '#f59e0b' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal-outline', color: '#6b7280' },
];

export default function EditTransactionScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  
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
  } = useForm<TransactionForm>({
    resolver: yupResolver(transactionSchema) as any,
    defaultValues: {
      description: '',
      amount: '',
      type: 'expense',
      categoryId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      paymentMethod: 'cash',
    },
    mode: 'onChange',
  });

  // Fetch transaction details
  const { data: transaction, isLoading: transactionLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionService.getTransaction(transactionId),
  });

  // Fetch categories based on selected type
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', selectedType],
    queryFn: () => categoryService.getCategories({ type: selectedType }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: (data: any) => transactionService.updateTransaction(transactionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      Alert.alert(
        'Sucesso!',
        'Transação atualizada com sucesso!',
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
        error.response?.data?.message || 'Erro ao atualizar transação. Tente novamente.'
      );
    },
  });

  // Load transaction data when available
  useEffect(() => {
    if (transaction?.data) {
      // Ajuste para acessar corretamente os dados da transação
      const transactionData = transaction.data.transaction ?? transaction.data;

      setSelectedType(transactionData.type);
      setSelectedCategory(transactionData.categoryId || '');
      setSelectedPaymentMethod(transactionData.paymentMethod);

      reset({
        description: transactionData.description,
        amount: transactionData.amount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        type: transactionData.type,
        categoryId: transactionData.categoryId || '',
        date: format(new Date(transactionData.date), 'yyyy-MM-dd'),
        notes: transactionData.notes || '',
        paymentMethod: transactionData.paymentMethod,
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: TransactionForm) => {
    const transactionData = {
      description: data.description,
      amount: parseNumber(data.amount),
      type: selectedType,
      categoryId: selectedCategory || undefined,
      date: new Date(data.date).toISOString(),
      notes: data.notes || undefined,
      paymentMethod: selectedPaymentMethod,
    };

    updateTransactionMutation.mutate(transactionData);
  };

  const handleTypeSelect = (type: 'income' | 'expense') => {
    setSelectedType(type);
    setValue('type', type);
    // Reset category when type changes
    setSelectedCategory('');
    setValue('categoryId', '');
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setValue('categoryId', categoryId, { shouldValidate: true });
  };

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    setValue('paymentMethod', method as any, { shouldValidate: true });
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

  const renderPaymentMethodItem = (item: typeof paymentMethodOptions[0]) => {
    const isSelected = selectedPaymentMethod === item.value;
    
    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.paymentMethodItem,
          {
            backgroundColor: isSelected 
              ? item.color + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? item.color 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => handlePaymentMethodSelect(item.value)}
      >
        <View style={[styles.paymentMethodIcon, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text style={[
          styles.paymentMethodName, 
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

  if (transactionLoading) {
    return <Loading />;
  }

  if (!transaction?.data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Editar Transação" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Transação não encontrada
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            A transação que você está tentando editar não existe ou foi removida.
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
        title="Editar Transação" 
        showBackButton 
        onBackPress={handleCancel}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type Selection */}
        <Card variant="elevated" style={styles.typeCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Tipo de Transação
          </Text>
          
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: selectedType === 'income' 
                    ? themeConfig.colors.success + '20' 
                    : themeConfig.colors.card,
                  borderColor: selectedType === 'income' 
                    ? themeConfig.colors.success 
                    : themeConfig.colors.border,
                }
              ]}
              onPress={() => handleTypeSelect('income')}
            >
              <Ionicons 
                name="trending-up" 
                size={24} 
                color={selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.textSecondary }
              ]}>
                Receita
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: selectedType === 'expense' 
                    ? themeConfig.colors.error + '20' 
                    : themeConfig.colors.card,
                  borderColor: selectedType === 'expense' 
                    ? themeConfig.colors.error 
                    : themeConfig.colors.border,
                }
              ]}
              onPress={() => handleTypeSelect('expense')}
            >
              <Ionicons 
                name="trending-down" 
                size={24} 
                color={selectedType === 'expense' ? themeConfig.colors.error : themeConfig.colors.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: selectedType === 'expense' ? themeConfig.colors.error : themeConfig.colors.textSecondary }
              ]}>
                Gasto
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Transaction Details */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Detalhes da Transação
          </Text>

          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição"
                placeholder="Ex: Compras no supermercado"
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
            render={({ field: { onBlur, value } }) => (
              <Input
                label="Valor"
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
            name="date"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Data"
                placeholder="AAAA-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.date?.message}
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

          <Controller
            name="notes"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Observações (Opcional)"
                placeholder="Adicione detalhes extras..."
                value={value}
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
                Nenhuma categoria encontrada para {selectedType === 'income' ? 'receitas' : 'gastos'}
              </Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryItem)}
            </View>
          )}
        </Card>

        {/* Payment Method Selection */}
        <Card variant="elevated" style={styles.paymentCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Método de Pagamento
          </Text>
          
          <View style={styles.paymentMethodsGrid}>
            {paymentMethodOptions.map(renderPaymentMethodItem)}
          </View>
        </Card>

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
            loading={updateTransactionMutation.isPending}
            disabled={!isValid || !isDirty || updateTransactionMutation.isPending}
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
  typeCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailsCard: {
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
  paymentCard: {
    marginBottom: 16,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '48%',
    gap: 8,
  },
  paymentMethodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
    height: 16,
  }
});