import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { categoryService } from '../../services/api/categories';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Category } from '../../types';

type Props = MainStackScreenProps<'CategoryManagement'>;

interface CategoryForm {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  description?: string;
}

const categorySchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório').max(30, 'Nome muito longo'),
  icon: yup.string().required('Ícone obrigatório'),
  color: yup.string().required('Cor obrigatória'),
  type: yup.string().required('Tipo obrigatório'),
  description: yup.string().optional().max(100, 'Descrição muito longa'),
});

const iconOptions = [
  'home-outline', 'car-outline', 'restaurant-outline', 'medical-outline',
  'school-outline', 'fitness-outline', 'gift-outline', 'shirt-outline',
  'airplane-outline', 'bus-outline', 'phone-outline', 'laptop-outline',
  'game-controller-outline', 'musical-notes-outline', 'camera-outline', 'book-outline',
  'briefcase-outline', 'card-outline', 'cash-outline', 'wallet-outline',
  'cart-outline', 'basket-outline', 'cafe-outline', 'wine-outline',
];

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#6b7280', '#374151',
];

const typeOptions: {
  value: 'expense' | 'income' | 'both';
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: 'expense', label: 'Gasto', icon: 'trending-down', color: '#ef4444' },
  { value: 'income', label: 'Receita', icon: 'trending-up', color: '#10b981' },
  { value: 'both', label: 'Ambos', icon: 'swap-horizontal', color: '#3b82f6' },
];

export default function CategoryManagementScreen({ navigation }: Props) {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'both'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>(iconOptions[0]);
  const [selectedColor, setSelectedColor] = useState<string>(colorOptions[0]);
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | 'both'>('expense');

  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid },
    watch,
  } = useForm<CategoryForm>({
    resolver: yupResolver(categorySchema) as any,
    defaultValues: {
      name: '',
      icon: iconOptions[0],
      color: colorOptions[0],
      type: 'expense',
      description: '',
    },
  });

  // Fetch categories
  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: ['categories', 'management'],
    queryFn: () => categoryService.getCategories({ includeInactive: true }),
  });

  const categories = categoriesResponse?.data?.categories || [];

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      resetForm();
      Alert.alert('Sucesso!', 'Categoria criada com sucesso!');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar categoria.');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      Alert.alert('Sucesso!', 'Categoria atualizada com sucesso!');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao atualizar categoria.');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Alert.alert('Sucesso!', 'Categoria excluída com sucesso!');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao excluir categoria.');
    },
  });

  // Restore category mutation
  const restoreCategoryMutation = useMutation({
    mutationFn: categoryService.restoreCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Alert.alert('Sucesso!', 'Categoria restaurada com sucesso!');
    },
    onError: (error: any) => {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao restaurar categoria.');
    },
  });

  const resetForm = () => {
    reset();
    setSelectedIcon(iconOptions[0]);
    setSelectedColor(colorOptions[0]);
    setSelectedType('expense');
    setEditingCategory(null);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setSelectedIcon(category.icon);
      setSelectedColor(category.color);
      setSelectedType(category.type);
      
      reset({
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
        description: category.description || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const onSubmit = async (data: CategoryForm) => {
    const categoryData = {
      name: data.name,
      icon: selectedIcon,
      color: selectedColor,
      type: selectedType,
      description: data.description || undefined,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ 
        id: editingCategory._id, 
        data: categoryData 
      });
    } else {
      createCategoryMutation.mutate(categoryData);
    }
  };

  const handleDelete = (category: Category) => {
    if (category.isDefault) {
      Alert.alert('Erro', 'Categorias padrão não podem ser excluídas.');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCategoryMutation.mutate(category._id),
        },
      ]
    );
  };

  const handleRestore = (category: Category) => {
    Alert.alert(
      'Restaurar Categoria',
      `Deseja restaurar a categoria "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => restoreCategoryMutation.mutate(category._id),
        },
      ]
    );
  };

  const getFilteredCategories = () => {
    if (filterType === 'all') return categories;
    return categories.filter(cat => 
      filterType === 'both' ? cat.type === 'both' : cat.type === filterType
    );
  };

  const renderFilterButton = (type: typeof filterType, label: string, icon: string) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.filterButton,
        {
          backgroundColor: filterType === type 
            ? themeConfig.colors.primary + '20' 
            : themeConfig.colors.card,
          borderColor: filterType === type 
            ? themeConfig.colors.primary 
            : themeConfig.colors.border,
        }
      ]}
      onPress={() => setFilterType(type)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={filterType === type ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
      />
      <Text style={[
        styles.filterButtonText,
        { color: filterType === type ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <Card variant="elevated" style={[
      styles.categoryCard,
      !item.isActive && { opacity: 0.6 }
    ]}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          
          <View style={styles.categoryDetails}>
            <Text style={[styles.categoryName, { color: themeConfig.colors.text }]}>
              {item.name}
              {item.isDefault && (
                <Text style={[styles.defaultBadge, { color: themeConfig.colors.textLight }]}>
                  {' '}(Padrão)
                </Text>
              )}
            </Text>
            
            <View style={styles.categoryMeta}>
              <View style={[
                styles.typeBadge, 
                { backgroundColor: typeOptions.find(t => t.value === item.type)?.color + '20' }
              ]}>
                <Ionicons 
                  name={typeOptions.find(t => t.value === item.type)?.icon as any} 
                  size={12} 
                  color={typeOptions.find(t => t.value === item.type)?.color} 
                />
                <Text style={[
                  styles.typeText, 
                  { color: typeOptions.find(t => t.value === item.type)?.color }
                ]}>
                  {typeOptions.find(t => t.value === item.type)?.label}
                </Text>
              </View>
              
              {!item.isActive && (
                <Text style={[styles.inactiveText, { color: themeConfig.colors.error }]}>
                  Inativa
                </Text>
              )}
            </View>
            
            {item.description && (
              <Text style={[styles.categoryDescription, { color: themeConfig.colors.textSecondary }]}>
                {item.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeConfig.colors.primary + '15' }]}
            onPress={() => handleOpenModal(item)}
            disabled={!item.isActive && item.isDefault}
          >
            <Ionicons name="pencil" size={16} color={themeConfig.colors.primary} />
          </TouchableOpacity>

          {item.isActive ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '15' }]}
              onPress={() => handleDelete(item)}
              disabled={item.isDefault}
            >
              <Ionicons 
                name="trash" 
                size={16} 
                color={item.isDefault ? themeConfig.colors.textLight : themeConfig.colors.error} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.success + '15' }]}
              onPress={() => handleRestore(item)}
            >
              <Ionicons name="refresh" size={16} color={themeConfig.colors.success} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  const renderIconSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: themeConfig.colors.text }]}>
        Ícone
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.iconScroll}
        contentContainerStyle={styles.iconScrollContent}
      >
        {iconOptions.map((icon, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iconOption,
              {
                backgroundColor: selectedIcon === icon 
                  ? selectedColor + '20' 
                  : themeConfig.colors.card,
                borderColor: selectedIcon === icon 
                  ? selectedColor 
                  : themeConfig.colors.border,
              }
            ]}
            onPress={() => {
              setSelectedIcon(icon);
              setValue('icon', icon);
            }}
          >
            <Ionicons 
              name={icon as any} 
              size={20} 
              color={selectedIcon === icon ? selectedColor : themeConfig.colors.textSecondary} 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderColorSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: themeConfig.colors.text }]}>
        Cor
      </Text>
      <View style={styles.colorGrid}>
        {colorOptions.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorOption,
              { 
                backgroundColor: color,
                borderColor: selectedColor === color ? themeConfig.colors.text : 'transparent',
                borderWidth: selectedColor === color ? 3 : 0,
              }
            ]}
            onPress={() => {
              setSelectedColor(color);
              setValue('color', color);
            }}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: themeConfig.colors.text }]}>
        Tipo
      </Text>
      <View style={styles.typeGrid}>
        {typeOptions.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeOption,
              {
                backgroundColor: selectedType === type.value 
                  ? type.color + '20' 
                  : themeConfig.colors.card,
                borderColor: selectedType === type.value 
                  ? type.color 
                  : themeConfig.colors.border,
              }
            ]}
            onPress={() => {
              setSelectedType(type.value);
              setValue('type', type.value);
            }}
          >
            <Ionicons 
              name={type.icon as any} 
              size={20} 
              color={selectedType === type.value ? type.color : themeConfig.colors.textSecondary} 
            />
            <Text style={[
              styles.typeOptionText,
              { color: selectedType === type.value ? type.color : themeConfig.colors.text }
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return <Loading />;
  }

  const filteredCategories = getFilteredCategories();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Gerenciar Categorias" 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <View style={styles.filtersContainer}>
            {renderFilterButton('all', 'Todas', 'list-outline')}
            {renderFilterButton('expense', 'Gastos', 'trending-down')}
            {renderFilterButton('income', 'Receitas', 'trending-up')}
            {renderFilterButton('both', 'Ambos', 'swap-horizontal')}
          </View>
          
          <Button
            title="Nova Categoria"
            onPress={() => handleOpenModal()}
            style={styles.addButton}
            size="small"
          />
        </View>

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color={themeConfig.colors.textLight} />
            <Text style={[styles.emptyStateTitle, { color: themeConfig.colors.textSecondary }]}>
              Nenhuma categoria encontrada
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: themeConfig.colors.textLight }]}>
              {filterType === 'all' 
                ? 'Crie sua primeira categoria personalizada'
                : `Nenhuma categoria do tipo "${typeOptions.find(t => t.value === filterType)?.label}" encontrada`
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item._id}
            renderItem={renderCategoryItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          />
        )}
      </View>

      {/* Modal for Create/Edit Category */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeConfig.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeConfig.colors.border }]}>
            <TouchableOpacity onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color={themeConfig.colors.text} />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: themeConfig.colors.text }]}>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            
            <Button
              title="Salvar"
              onPress={handleSubmit(onSubmit) as any}
              loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              disabled={!isValid}
              size="small"
            />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Preview */}
            <Card variant="elevated" style={styles.previewCard}>
              <Text style={[styles.previewTitle, { color: themeConfig.colors.text }]}>
                Prévia da Categoria
              </Text>
              
              <View style={styles.previewCategory}>
                <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
                  <Ionicons name={selectedIcon as any} size={24} color={selectedColor} />
                </View>
                <Text style={[styles.previewName, { color: themeConfig.colors.text }]}>
                  {watch('name') || 'Nome da Categoria'}
                </Text>
                <View style={[
                  styles.previewTypeBadge, 
                  { backgroundColor: typeOptions.find(t => t.value === selectedType)?.color + '20' }
                ]}>
                  <Text style={[
                    styles.previewTypeText, 
                    { color: typeOptions.find(t => t.value === selectedType)?.color }
                  ]}>
                    {typeOptions.find(t => t.value === selectedType)?.label}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Form */}
            <Card variant="elevated" style={styles.formCard}>
              <Controller
                name="name"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nome da Categoria"
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
                name="description"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Descrição (Opcional)"
                    placeholder="Adicione detalhes sobre esta categoria..."
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

              {renderTypeSelector()}
              {renderIconSelector()}
              {renderColorSelector()}
            </Card>

            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerActions: {
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    alignSelf: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    paddingBottom: 24,
  },
  listSeparator: {
    height: 8,
  },
  categoryCard: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '400',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '500',
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  previewCard: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  previewTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: 16,
  },
  selectorContainer: {
    marginTop: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  iconScroll: {
    maxHeight: 60,
  },
  iconScrollContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalBottomSpacer: {
    height: 24,
  },
});
