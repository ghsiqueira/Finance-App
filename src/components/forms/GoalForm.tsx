// src/components/forms/GoalForm.tsx
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
import { goalSchema } from '../../utils/validators';
import { formatInputCurrency } from '../../utils/formatters';
import type { GoalForm as GoalFormData, Category } from '../../types';

interface GoalFormProps {
  onSubmit: (data: GoalFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<GoalFormData>;
}

const priorities = [
  { value: 'low', label: 'Baixa', icon: 'remove-circle-outline', color: '#10b981' },
  { value: 'medium', label: 'Média', icon: 'ellipse-outline', color: '#f59e0b' },
  { value: 'high', label: 'Alta', icon: 'add-circle-outline', color: '#ef4444' },
];

const goalColors = [
  '#667eea', '#764ba2', '#10b981', '#f59e0b',
  '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4',
  '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export default function GoalForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: GoalFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(goalColors[0]);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<GoalFormData>({
    // Força o tipo do resolver para evitar conflito de tipos
    resolver: yupResolver(goalSchema) as any,
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      targetAmount: initialData?.targetAmount || '',
      targetDate: initialData?.targetDate || getDefaultTargetDate(),
      categoryId: initialData?.categoryId || '',
      priority: initialData?.priority || 'medium',
      color: initialData?.color || goalColors[0],
    },
  });

  // Buscar categorias
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', 'both'],
    queryFn: () => categoryService.getCategories({ type: 'both' }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  function getDefaultTargetDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // 6 meses a partir de hoje
    return date;
  }

  useEffect(() => {
    setValue('categoryId', selectedCategory);
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue('priority', selectedPriority as any);
  }, [selectedPriority, setValue]);

  useEffect(() => {
    setValue('color', selectedColor);
  }, [selectedColor, setValue]);

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setValue('targetAmount', formatted);
  };

  const handleFormSubmit = (data: GoalFormData) => {
    onSubmit({
      ...data,
      categoryId: selectedCategory || undefined,
      priority: selectedPriority as any,
      color: selectedColor,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título da Meta */}
        <View style={styles.section}>
          <Controller
            name="title"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Título da Meta"
                placeholder="Ex: Viagem para Europa"
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
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição (Opcional)"
                placeholder="Descreva sua meta em detalhes..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
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

        {/* Valor da Meta */}
        <View style={styles.section}>
          <Controller
            name="targetAmount"
            control={control}
            render={({ field: { value } }) => (
              <Input
                label="Valor da Meta"
                placeholder="R$ 0,00"
                value={value}
                onChangeText={handleAmountChange}
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
        </View>

        {/* Data da Meta */}
        <View style={styles.section}>
          <Controller
            name="targetDate"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: themeConfig.colors.border }]}
                onPress={() => {
                  // Aqui você pode implementar um DatePicker
                  Alert.alert('Info', 'DatePicker será implementado em breve');
                }}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color={themeConfig.colors.textSecondary} 
                />
                <Text style={[styles.dateText, { color: themeConfig.colors.text }]}>
                  {value ? value.toLocaleDateString('pt-BR') : 'Selecione a data'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Categoria */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Categoria (Opcional)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && styles.categoryItemSelected,
              ]}
              onPress={() => setSelectedCategory('')}
            >
              <View style={[styles.categoryIcon, { backgroundColor: themeConfig.colors.textLight + '20' }]}>
                <Ionicons 
                  name="help-circle-outline" 
                  size={24} 
                  color={themeConfig.colors.textLight} 
                />
              </View>
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

        {/* Prioridade */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Prioridade
          </Text>
          <View style={styles.priorityGrid}>
            {priorities.map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityItem,
                  selectedPriority === priority.value && styles.priorityItemSelected,
                  selectedPriority === priority.value && { 
                    backgroundColor: priority.color + '20',
                    borderColor: priority.color 
                  }
                ]}
                onPress={() => setSelectedPriority(priority.value)}
              >
                <Ionicons 
                  name={priority.icon as any} 
                  size={20} 
                  color={selectedPriority === priority.value ? priority.color : themeConfig.colors.textSecondary} 
                />
                <Text style={[
                  styles.priorityText,
                  { color: selectedPriority === priority.value ? priority.color : themeConfig.colors.textSecondary }
                ]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Cor da Meta
          </Text>
          <View style={styles.colorGrid}>
            {goalColors.map((color) => (
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
          title="Salvar Meta"
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
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  priorityItemSelected: {
    borderWidth: 2,
  },
  priorityText: {
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
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
  