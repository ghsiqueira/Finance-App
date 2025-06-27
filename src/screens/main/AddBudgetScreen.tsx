import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addWeeks, addMonths, addYears, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { categoryService } from '../../services/api/categories';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps, Category } from '../../types';

type Props = MainStackScreenProps<'AddBudget'>;

interface BudgetFormData {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
  alertThreshold: string;
  notes: string;
  autoRenew: boolean;
}

const periodOptions = [
  { value: 'weekly' as const, label: 'Semanal', icon: 'calendar-outline', duration: 7 },
  { value: 'monthly' as const, label: 'Mensal', icon: 'calendar', duration: 30 },
  { value: 'yearly' as const, label: 'Anual', icon: 'calendar-sharp', duration: 365 },
  { value: 'custom' as const, label: 'Personalizado', icon: 'settings-outline', duration: 0 },
];

export default function AddBudgetScreen({ navigation, route }: Props) {
  const { categoryId: preSelectedCategoryId } = route.params || {};
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    amount: '',
    categoryId: preSelectedCategoryId || '',
    period: 'monthly',
    startDate: new Date(),
    endDate: addMonths(new Date(), 1),
    alertThreshold: '80',
    notes: '',
    autoRenew: false,
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar categorias
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-for-budget'],
    queryFn: () => categoryService.getCategories({ 
      type: 'expense',
      includeInactive: false 
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Criar orçamento
  const createBudgetMutation = useMutation({
    mutationFn: (budgetData: any) => {
      console.log('🚀 Enviando dados para API:', budgetData);
      return budgetService.createBudget(budgetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Sucesso!',
        'Orçamento criado com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      console.error('❌ Erro ao criar orçamento:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao criar orçamento.'
      );
    },
  });

  const categories = categoriesResponse?.data?.categories || [];
  const selectedCategory = categories.find(cat => cat._id === formData.categoryId);

  // Atualizar datas quando o período mudar
  useEffect(() => {
    if (formData.period !== 'custom') {
      const start = startOfDay(formData.startDate);
      let end: Date;
      
      switch (formData.period) {
        case 'weekly':
          end = endOfDay(addWeeks(start, 1));
          break;
        case 'monthly':
          end = endOfDay(addMonths(start, 1));
          break;
        case 'yearly':
          end = endOfDay(addYears(start, 1));
          break;
        default:
          end = formData.endDate;
      }
      
      if (end.getTime() !== formData.endDate.getTime()) {
        setFormData(prev => ({ ...prev, endDate: end }));
      }
    }
  }, [formData.period, formData.startDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.amount.trim() || isNaN(parseFloat(formData.amount.replace(',', '.')))) {
      newErrors.amount = 'Valor deve ser um número válido';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'Data final deve ser posterior à data inicial';
    }

    const threshold = parseFloat(formData.alertThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      newErrors.alertThreshold = 'Limite deve ser entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Preparar dados para a API - enviar datas como objetos Date
    const budgetPayload = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount.replace(',', '.')),
      categoryId: formData.categoryId,
      period: formData.period === 'custom' ? 'monthly' : formData.period,
      startDate: formData.startDate, // Manter como Date object
      endDate: formData.endDate,     // Manter como Date object
      alertThreshold: parseFloat(formData.alertThreshold),
      notes: formData.notes.trim() || undefined,
      autoRenew: formData.autoRenew,
    };

    console.log('🚀 Criando orçamento:', budgetPayload);
    console.log('🗓️ Tipo das datas:', {
      startDate: typeof budgetPayload.startDate,
      endDate: typeof budgetPayload.endDate,
      startDateValue: budgetPayload.startDate,
      endDateValue: budgetPayload.endDate,
    });
    createBudgetMutation.mutate(budgetPayload);
  };

  const renderCategoryItem = ({ item: category }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: themeConfig.colors.surface,
          borderColor: formData.categoryId === category._id 
            ? themeConfig.colors.primary 
            : themeConfig.colors.border,
        },
      ]}
      onPress={() => {
        setFormData(prev => ({ ...prev, categoryId: category._id }));
        setShowCategoryModal(false);
      }}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <Ionicons name={category.icon as any} size={24} color={category.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: themeConfig.colors.text }]}>
          {category.name}
        </Text>
        {category.isDefault && (
          <Text style={[styles.categoryType, { color: themeConfig.colors.textSecondary }]}>
            Padrão
          </Text>
        )}
      </View>
      {formData.categoryId === category._id && (
        <Ionicons name="checkmark-circle" size={24} color={themeConfig.colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderPeriodOption = (option: typeof periodOptions[number]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.periodOption,
        {
          backgroundColor: formData.period === option.value 
            ? themeConfig.colors.primary + '20'
            : themeConfig.colors.surface,
          borderColor: formData.period === option.value 
            ? themeConfig.colors.primary
            : themeConfig.colors.border,
        },
      ]}
      onPress={() => setFormData(prev => ({ ...prev, period: option.value }))}
    >
      <Ionicons 
        name={option.icon as any} 
        size={20} 
        color={formData.period === option.value 
          ? themeConfig.colors.primary 
          : themeConfig.colors.textSecondary
        } 
      />
      <Text style={[
        styles.periodOptionText,
        { 
          color: formData.period === option.value 
            ? themeConfig.colors.primary 
            : themeConfig.colors.text 
        }
      ]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  if (categoriesLoading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="Criar Orçamento"
        leftElement={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={themeConfig.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações Básicas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📝 Informações Básicas
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Nome do Orçamento *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.name ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Ex: Alimentação Janeiro"
              placeholderTextColor={themeConfig.colors.textSecondary}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.name}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Valor do Orçamento *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.amount ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.amount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
              placeholder="0,00"
              placeholderTextColor={themeConfig.colors.textSecondary}
              keyboardType="numeric"
            />
            {errors.amount && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.amount}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Categoria *
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.categorySelector,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.categoryId ? themeConfig.colors.error : themeConfig.colors.border,
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  <View style={[styles.categoryIconSmall, { backgroundColor: selectedCategory.color + '20' }]}>
                    <Ionicons name={selectedCategory.icon as any} size={16} color={selectedCategory.color} />
                  </View>
                  <Text style={[styles.selectedCategoryText, { color: themeConfig.colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: themeConfig.colors.textSecondary }]}>
                  Selecione uma categoria
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={themeConfig.colors.textSecondary} />
            </TouchableOpacity>
            {errors.categoryId && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.categoryId}
              </Text>
            )}
          </View>
        </Card>

        {/* Período */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📅 Período do Orçamento
          </Text>

          <View style={styles.periodGrid}>
            {periodOptions.map(renderPeriodOption)}
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, { color: themeConfig.colors.text }]}>
                Data Inicial
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: themeConfig.colors.surface,
                    borderColor: themeConfig.colors.border,
                  },
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.primary} />
                <Text style={[styles.dateText, { color: themeConfig.colors.text }]}>
                  {format(formData.startDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={[styles.label, { color: themeConfig.colors.text }]}>
                Data Final
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: formData.period === 'custom' 
                      ? themeConfig.colors.surface 
                      : themeConfig.colors.surface + '80',
                    borderColor: errors.endDate ? themeConfig.colors.error : themeConfig.colors.border,
                  },
                ]}
                onPress={() => formData.period === 'custom' && setShowEndDatePicker(true)}
                disabled={formData.period !== 'custom'}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color={formData.period === 'custom' 
                    ? themeConfig.colors.primary 
                    : themeConfig.colors.textSecondary
                  } 
                />
                <Text style={[
                  styles.dateText, 
                  { 
                    color: formData.period === 'custom' 
                      ? themeConfig.colors.text 
                      : themeConfig.colors.textSecondary 
                  }
                ]}>
                  {format(formData.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {errors.endDate && (
            <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
              {errors.endDate}
            </Text>
          )}
        </Card>

        {/* Configurações Avançadas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            ⚙️ Configurações Avançadas
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Limite de Alerta (%)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: errors.alertThreshold ? themeConfig.colors.error : themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.alertThreshold}
              onChangeText={(text) => setFormData(prev => ({ ...prev, alertThreshold: text }))}
              placeholder="80"
              placeholderTextColor={themeConfig.colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={[styles.helperText, { color: themeConfig.colors.textSecondary }]}>
              Receba alertas quando atingir este percentual do orçamento
            </Text>
            {errors.alertThreshold && (
              <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
                {errors.alertThreshold}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeConfig.colors.text }]}>
              Observações (Opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: themeConfig.colors.surface,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.colors.text,
                },
              ]}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Adicione observações sobre este orçamento..."
              placeholderTextColor={themeConfig.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setFormData(prev => ({ ...prev, autoRenew: !prev.autoRenew }))}
          >
            <View>
              <Text style={[styles.toggleLabel, { color: themeConfig.colors.text }]}>
                Renovação Automática
              </Text>
              <Text style={[styles.toggleDescription, { color: themeConfig.colors.textSecondary }]}>
                Criar novo orçamento automaticamente quando este expirar
              </Text>
            </View>
            <View style={[
              styles.toggle,
              {
                backgroundColor: formData.autoRenew 
                  ? themeConfig.colors.primary 
                  : themeConfig.colors.border,
              },
            ]}>
              <View style={[
                styles.toggleIndicator,
                {
                  backgroundColor: themeConfig.colors.surface,
                  transform: [{ translateX: formData.autoRenew ? 20 : 2 }],
                },
              ]} />
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Botões de Ação */}
      <View style={[styles.footer, { backgroundColor: themeConfig.colors.background }]}>
        <Button
          title="Cancelar"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.footerButton}
        />
        <Button
          title="Criar Orçamento"
          onPress={handleSubmit}
          loading={createBudgetMutation.isPending}
          style={styles.footerButton}
        />
      </View>

      {/* Modal de Seleção de Categoria */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeConfig.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeConfig.colors.border }]}>
            <Text style={[styles.modalTitle, { color: themeConfig.colors.text }]}>
              Selecionar Categoria
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color={themeConfig.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.categoriesList}
          />
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, startDate: selectedDate }));
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display="default"
          minimumDate={formData.startDate}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, endDate: selectedDate }));
            }
          }}
        />
      )}
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedCategoryText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  periodOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryType: {
    fontSize: 12,
  },
});