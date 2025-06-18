import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import Button from '../common/Button';
import Input from '../common/Input';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { categoryService } from '../../services/api/categories';
import { transactionSchema } from '../../utils/validators';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { TransactionForm as TransactionFormData, Category } from '../../types';

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<TransactionFormData>;
  defaultType?: 'income' | 'expense';
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro', icon: 'cash-outline' },
  { value: 'pix', label: 'PIX', icon: 'flash-outline' },
  { value: 'credit_card', label: 'Crédito', icon: 'card-outline' },
  { value: 'debit_card', label: 'Débito', icon: 'card-outline' },
  { value: 'bank_transfer', label: 'Transferência', icon: 'swap-horizontal-outline' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal-outline' },
] as const;

export default function TransactionForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  defaultType = 'expense',
}: TransactionFormProps) {
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(defaultType);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<TransactionFormData>({
    resolver: yupResolver(transactionSchema) as any,
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || '',
      type: initialData?.type || defaultType,
      categoryId: initialData?.categoryId || undefined,
      date: initialData?.date || new Date(),
      notes: initialData?.notes || undefined, 
      paymentMethod: initialData?.paymentMethod || 'cash',
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', selectedType],
    queryFn: () => categoryService.getCategories({ type: selectedType }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  useEffect(() => {
    setValue('type', selectedType);
    setSelectedCategory('');
    setValue('categoryId', undefined); 
  }, [selectedType, setValue]);

  useEffect(() => {
    setValue('categoryId', selectedCategory || undefined); 
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue('paymentMethod', selectedPaymentMethod as TransactionFormData['paymentMethod']);
  }, [selectedPaymentMethod, setValue]);

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('amount', formatted);
  };

  const handleFormSubmit = (data: TransactionFormData) => {
    const formattedData: TransactionFormData = {
      ...data,
      amount: parseNumber(data.amount).toString(),
      categoryId: selectedCategory || undefined,
      paymentMethod: selectedPaymentMethod as TransactionFormData['paymentMethod'],
    };
    onSubmit(formattedData);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tipo de Transação */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Tipo de Transação
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === 'expense' && styles.typeButtonActive,
                selectedType === 'expense' && { 
                  backgroundColor: themeConfig.colors.error + '20', 
                  borderColor: themeConfig.colors.error 
                }
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
                selectedType === 'income' && styles.typeButtonActive,
                selectedType === 'income' && { 
                  backgroundColor: themeConfig.colors.success + '20', 
                  borderColor: themeConfig.colors.success 
                }
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
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição"
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
        </View>

        {/* Valor */}
        <View style={styles.section}>
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
        </View>

        {/* Categoria */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Categoria
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && styles.categoryItemSelected,
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
                  selectedCategory === category._id && styles.categoryItemSelected,
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
        </View>

        {/* Método de Pagamento */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Método de Pagamento
          </Text>
          <View style={styles.paymentMethodGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentMethod === method.value && styles.paymentMethodSelected,
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
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Controller
            name="notes"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Observações (Opcional)"
                placeholder="Informações adicionais..."
                value={value || ''} 
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
        </View>
      </ScrollView>

      {/* Footer com botões */}
      <View style={[styles.footer, { borderTopColor: themeConfig.colors.border }]}>
        <Button
          title="Cancelar"
          variant="outline"
          onPress={onCancel}
          style={styles.cancelButton}
        />
        
        <Button
          title="Salvar"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isLoading}
          disabled={isLoading || !isValid}
          gradient
          style={styles.saveButton}
        />
      </View>
    </View>
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
    marginBottom: 24,
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
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  categoryItemSelected: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 12,
    marginTop: 6,
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
    borderColor: '#667eea',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});