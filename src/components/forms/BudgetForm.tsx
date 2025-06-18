import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import Button from '../common/Button';
import Input from '../common/Input';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { categoryService } from '../../services/api/categories';
import { formatInputCurrency } from '../../utils/formatters';
import type { BudgetForm as BudgetFormData, Category } from '../../types';
import * as yup from 'yup';

const budgetFormSchema = yup.object({
  name: yup.string().required('Nome é obrigatório').max(50, 'Nome muito longo'),
  amount: yup.string().required('Valor é obrigatório'),
  categoryId: yup.string().required('Categoria é obrigatória'),
  period: yup.string().oneOf(['weekly', 'monthly', 'quarterly', 'yearly']).required(),
  startDate: yup.date().required('Data de início é obrigatória'),
  endDate: yup.date().required('Data de fim é obrigatória'),
  alertThreshold: yup.number().min(0).max(100).default(80),
  notes: yup.string().optional(),
  color: yup.string().optional(),
});

interface BudgetFormProps {
  onSubmit: (data: BudgetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<BudgetFormData>;
}

const periods = [
  { value: 'weekly', label: 'Semanal', icon: 'calendar-outline' },
  { value: 'monthly', label: 'Mensal', icon: 'calendar-outline' },
  { value: 'quarterly', label: 'Trimestral', icon: 'calendar-outline' },
  { value: 'yearly', label: 'Anual', icon: 'calendar-outline' },
];

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FFB6C1', '#A8A8A8',
  '#00B894', '#6C5CE7', '#FD79A8', '#74B9FF',
];

export default function BudgetForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: BudgetFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [selectedColor, setSelectedColor] = useState<string>(colors[0]);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<BudgetFormData>({
    resolver: yupResolver(budgetFormSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      amount: initialData?.amount || '',
      categoryId: initialData?.categoryId || '',
      period: initialData?.period || 'monthly',
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || getEndDate('monthly'),
      alertThreshold: initialData?.alertThreshold || 80,
      notes: initialData?.notes || '',
      color: initialData?.color || colors[0],
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoryService.getCategories({ type: 'expense' }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  function getEndDate(period: string): Date {
    const start = new Date();
    const end = new Date(start);
    
    switch (period) {
      case 'weekly':
        end.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(start.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(start.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(start.getFullYear() + 1);
        break;
    }
    
    return end;
  }

  useEffect(() => {
    setValue('categoryId', selectedCategory);
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue('period', selectedPeriod as any);
    setValue('endDate', getEndDate(selectedPeriod));
  }, [selectedPeriod, setValue]);

  useEffect(() => {
    setValue('color', selectedColor);
  }, [selectedColor, setValue]);

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('amount', formatted);
  };

  const handleFormSubmit = (data: BudgetFormData) => {
    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria para o orçamento');
      return;
    }
    
    onSubmit({
      ...data,
      categoryId: selectedCategory,
      period: selectedPeriod as any,
      color: selectedColor,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome do Orçamento */}
        <View style={styles.section}>
          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do Orçamento"
                placeholder="Ex: Alimentação Dezembro"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
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

        {/* Valor do Orçamento */}
        <View style={styles.section}>
          <Controller
            name="amount"
            control={control}
            render={({ field: { value } }) => (
              <Input
                label="Valor do Orçamento"
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
            {categories.map((category: Category) => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category._id && styles.categoryItemSelected,
                  selectedCategory === category._id && { borderColor: category.color }
                ]}
                onPress={() => setSelectedCategory(category._id)}
              >
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: category.color + '20' }
                ]}>
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color={category.color} 
                  />
                </View>
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

        {/* Período */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Período
          </Text>
          <View style={styles.periodGrid}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodItem,
                  selectedPeriod === period.value && styles.periodItemSelected,
                  selectedPeriod === period.value && { 
                    backgroundColor: themeConfig.colors.primary + '20',
                    borderColor: themeConfig.colors.primary 
                  }
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Ionicons 
                  name={period.icon as any} 
                  size={20} 
                  color={selectedPeriod === period.value ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
                />
                <Text style={[
                  styles.periodText,
                  { color: selectedPeriod === period.value ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Limite de Alerta */}
        <View style={styles.section}>
          <Controller
            name="alertThreshold"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Limite de Alerta (%)"
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
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Cor do Orçamento
          </Text>
          <View style={styles.colorGrid}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorItem,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorItemSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
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
                placeholder="Informações adicionais sobre o orçamento..."
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
          title="Salvar Orçamento"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isLoading}
          disabled={isLoading || !isValid || !selectedCategory}
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
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
    minWidth: '48%',
  },
  periodItemSelected: {
    borderWidth: 2,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorItemSelected: {
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
