// src/screens/main/AddTransactionScreen.tsx
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

type Props = MainStackScreenProps<'AddTransaction'>;

const paymentMethodOptions: Array<{
  value: PaymentMethodType;
  label: string;
  icon: string;
}> = [
  { value: 'cash', label: 'Dinheiro', icon: 'cash-outline' },
  { value: 'pix', label: 'PIX', icon: 'flash-outline' },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: 'card-outline' },
  { value: 'debit_card', label: 'Cartão de Débito', icon: 'card-outline' },
  { value: 'bank_transfer', label: 'Transferência', icon: 'swap-horizontal-outline' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal-outline' },
];

type PaymentMethodType = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';

export default function AddTransactionScreen({ navigation, route }: Props) {
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(
    route.params?.type || 'expense'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cash');
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
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
  });

  // Buscar categorias
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', selectedType],
    queryFn: () => categoryService.getCategories({ type: selectedType }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Mutation para criar transação
  const createTransactionMutation = useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Sucesso', 'Transação criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao criar transação'
      );
    },
  });

  // Atualizar tipo quando mudar
  useEffect(() => {
    setValue('type', selectedType);
    setSelectedCategory('');
    setValue('categoryId', '');
  }, [selectedType, setValue]);

  // Atualizar categoria quando mudar
  useEffect(() => {
    setValue('categoryId', selectedCategory);
  }, [selectedCategory, setValue]);

  // Atualizar método de pagamento quando mudar
  useEffect(() => {
    setValue('paymentMethod', selectedPaymentMethod);
  }, [selectedPaymentMethod, setValue]);

  const onSubmit = async (data: any) => {
    const transactionData: TransactionForm = {
      description: data.description,
      amount: parseNumber(data.amount).toString(),
      type: data.type,
      categoryId: selectedCategory || undefined,
      date: data.date,
      notes: data.notes || undefined,
      paymentMethod: selectedPaymentMethod,
    };
    
    createTransactionMutation.mutate(transactionData);
  };

  const handleAmountChange = (value: string) => {
    const formattedValue = formatInputCurrency(value);
    setValue('amount', formattedValue);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
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
            Tipo de Transação
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === 'expense' && { backgroundColor: themeConfig.colors.error + '15' },
                { borderColor: selectedType === 'expense' ? themeConfig.colors.error : themeConfig.colors.border }
              ]}
              onPress={() => setSelectedType('expense')}
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

            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === 'income' && { backgroundColor: themeConfig.colors.success + '15' },
                { borderColor: selectedType === 'income' ? themeConfig.colors.success : themeConfig.colors.border }
              ]}
              onPress={() => setSelectedType('income')}
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
          </View>
        </Card>

        {/* Informações Básicas */}
        <Card style={styles.section}>
          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição"
                placeholder="Ex: Almoço no restaurante"
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

          <Controller
            name="amount"
            control={control}
            render={({ field: { value } }) => (
              <Input
                label="Valor"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={handleAmountChange}
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
                placeholder="Informações adicionais"
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

        {/* Categoria */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Categoria
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && { backgroundColor: themeConfig.colors.primary + '15' },
                { borderColor: !selectedCategory ? themeConfig.colors.primary : themeConfig.colors.border }
              ]}
              onPress={() => setSelectedCategory('')}
            >
              <Ionicons 
                name="help-circle-outline" 
                size={24} 
                color={!selectedCategory ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
              />
              <Text style={[
                styles.categoryText,
                { color: !selectedCategory ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
              ]}>
                Sem categoria
              </Text>
            </TouchableOpacity>

            {categories.map((category: Category) => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category._id && { backgroundColor: category.color + '15' },
                  { borderColor: selectedCategory === category._id ? category.color : themeConfig.colors.border }
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
        </Card>

        {/* Método de Pagamento */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Método de Pagamento
          </Text>
          <View style={styles.paymentMethodGrid}>
            {paymentMethodOptions.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentMethod === method.value && { backgroundColor: themeConfig.colors.primary + '15' },
                  { borderColor: selectedPaymentMethod === method.value ? themeConfig.colors.primary : themeConfig.colors.border }
                ]}
                onPress={() => setSelectedPaymentMethod(method.value)}
              >
                <Ionicons 
                  name={method.icon as any} 
                  size={20} 
                  color={selectedPaymentMethod === method.value ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
                />
                <Text style={[
                  styles.paymentMethodText,
                  { color: selectedPaymentMethod === method.value ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Footer com botão */}
      <View style={[styles.footer, { backgroundColor: themeConfig.colors.card, borderTopColor: themeConfig.colors.border }]}>
        <Button
          title="Salvar Transação"
          onPress={handleSubmit(onSubmit)}
          loading={createTransactionMutation.isPending}
          disabled={createTransactionMutation.isPending}
          fullWidth
          gradient
        />
      </View>
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
    marginBottom: 12,
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  categoryText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
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
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '48%',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});