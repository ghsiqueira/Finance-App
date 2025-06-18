import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { categoryService } from '../../services/api/categories';
import { transactionSchema } from '../../utils/validators';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../utils/constants';
import type { MainStackScreenProps, TransactionForm, Category } from '../../types';

interface EnhancedCategory extends Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

type Props = MainStackScreenProps<'AddTransaction'>;

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

type PaymentMethodType = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';

export default function AddTransactionScreen({ navigation, route }: Props) {
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(
    route.params?.type || 'expense'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const scaleAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(0);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(transactionSchema) as any,
    defaultValues: {
      description: '',
      amount: '',
      type: selectedType,
      categoryId: '',
      date: new Date(),
      notes: '',
      paymentMethod: 'cash' as PaymentMethodType,
    },
    mode: 'onChange', 
  });

  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', selectedType],
    queryFn: () => categoryService.getCategories({ type: selectedType }),
  });

  const categories = categoriesResponse?.data?.categories || [];

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
          `${selectedType === 'income' ? 'Receita' : 'Gasto'} adicionado com sucesso!`,
          [
            { 
              text: 'Adicionar Outro', 
              onPress: () => {
                setShowSuccess(false);
                fadeAnim.setValue(0);
                reset();
                setSelectedCategory('');
                setSelectedPaymentMethod('cash');
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

  const onSubmit = async (data: any) => {
    try {
      const transactionData: TransactionForm = {
        description: data.description.trim(),
        amount: parseNumber(data.amount).toString(),
        type: data.type,
        categoryId: selectedCategory || undefined,
        date: data.date,
        notes: data.notes?.trim() || undefined,
        paymentMethod: selectedPaymentMethod,
      };
      
      console.log('📝 Enviando transação:', transactionData);
      createTransactionMutation.mutate(transactionData);
    } catch (error) {
      console.error('❌ Erro ao processar formulário:', error);
    }
  };

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    const numericValue = parseFloat(cleanValue.replace(',', '.')) / 100 || 0;
    
    const formattedValue = numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    
    setValue('amount', formattedValue);
  };

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

        {/* Valor */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            💵 Valor
          </Text>
          
          <Controller
            name="amount"
            control={control}
            render={({ field: { value } }) => (
              <Input
                label="Quanto foi?"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={handleAmountChange}
                error={errors.amount?.message}
                keyboardType="numeric"
                style={styles.amountInput}
                inputStyle={{
                  ...styles.amountInputText,
                  color: selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.error,
                }}
                leftIcon={
                  <Ionicons 
                    name="cash-outline" 
                    size={24} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />

          {/* Valores Rápidos */}
          <View style={styles.quickAmountsContainer}>
            <Text style={[styles.quickAmountsLabel, { color: themeConfig.colors.textSecondary }]}>
              Valores rápidos:
            </Text>
            <View style={styles.quickAmounts}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.quickAmount, { backgroundColor: themeConfig.colors.surface }]}
                  onPress={() => {
                    const formatted = amount.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    });
                    setValue('amount', formatted);
                  }}
                >
                  <Text style={[styles.quickAmountText, { color: themeConfig.colors.text }]}>
                    R$ {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Descrição */}
        <Card style={styles.section}>
          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="📝 Descrição"
                placeholder={selectedType === 'expense' ? "Ex: Almoço no restaurante" : "Ex: Freelance projeto X"}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                leftIcon={
                  <Ionicons 
                    name="create-outline" 
                    size={20} 
                    color={themeConfig.colors.textSecondary} 
                  />
                }
              />
            )}
          />
        </Card>

        {/* Categoria */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📂 Categoria
          </Text>
          
          {loadingCategories ? (
            <Text style={[styles.loadingText, { color: themeConfig.colors.textSecondary }]}>
              Carregando categorias...
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  !selectedCategory && styles.categoryItemSelected,
                  !selectedCategory && { backgroundColor: themeConfig.colors.textLight + '20', borderColor: themeConfig.colors.textLight }
                ]}
                onPress={() => setSelectedCategory('')}
              >
                <Ionicons 
                  name="help-circle-outline" 
                  size={24} 
                  color={!selectedCategory ? themeConfig.colors.textLight : themeConfig.colors.textSecondary} 
                />
                <Text style={[
                  styles.categoryText,
                  { color: !selectedCategory ? themeConfig.colors.textLight : themeConfig.colors.textSecondary }
                ]}>
                  Sem categoria
                </Text>
              </TouchableOpacity>

              {categories.map((category: EnhancedCategory) => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category._id && styles.categoryItemSelected,
                    selectedCategory === category._id && { backgroundColor: category.color + '20', borderColor: category.color }
                  ]}
                  onPress={() => setSelectedCategory(category._id)}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color={selectedCategory === category._id ? category.color : themeConfig.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.categoryText,
                    { color: selectedCategory === category._id ? category.color : themeConfig.colors.textSecondary }
                  ]}>
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
          <View style={styles.paymentMethodGrid}>
            {paymentMethodOptions.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentMethod === method.value && styles.paymentMethodSelected,
                  selectedPaymentMethod === method.value && { backgroundColor: method.color + '15', borderColor: method.color }
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
        
        <Button
          title={createTransactionMutation.isPending ? "Salvando..." : "💾 Salvar Transação"}
          onPress={handleSubmit(onSubmit)}
          loading={createTransactionMutation.isPending}
          disabled={createTransactionMutation.isPending || !isValid}
          fullWidth
          gradient
          style={{
            ...styles.saveButton,
            ...(isValid ? {} : { opacity: 0.6 }),
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
    fontWeight: '600',
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
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountInput: {
    marginBottom: 16,
  },
  amountInputText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickAmountsContainer: {
    marginTop: 8,
  },
  quickAmountsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
  },
  categoryItemSelected: {
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
    minWidth: '48%',
  },
  paymentMethodSelected: {
    borderWidth: 2,
  },
  paymentMethodText: {
    fontSize: 14,
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
    gap: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    minHeight: 56,
  },
});