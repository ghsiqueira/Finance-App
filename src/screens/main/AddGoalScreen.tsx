import React, { useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as yup from 'yup';

import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { goalService } from '../../services/api/goals';
import { formatInputCurrency, parseNumber } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';

type Props = MainStackScreenProps<'AddGoal'>;

interface GoalForm {
  name: string;
  targetAmount: string;
  currentAmount: string;
  description?: string;
  targetDate: string;
}

const goalSchema = yup.object().shape({
  name: yup.string().required('Nome obrigatório'),
  targetAmount: yup.string().required('Valor da meta obrigatório'),
  currentAmount: yup.string().required('Valor atual obrigatório'),
  description: yup.string().optional(),
  targetDate: yup.string().required('Data da meta obrigatória'),
});

const goalTemplates = [
  {
    icon: 'home-outline',
    name: 'Casa Própria',
    description: 'Entrada para financiamento',
    targetAmount: 50000,
    color: '#3b82f6',
    months: 24,
  },
  {
    icon: 'car-outline',
    name: 'Carro Novo',
    description: 'Compra à vista ou entrada',
    targetAmount: 30000,
    color: '#10b981',
    months: 18,
  },
  {
    icon: 'airplane-outline',
    name: 'Viagem dos Sonhos',
    description: 'Férias especiais',
    targetAmount: 8000,
    color: '#f59e0b',
    months: 12,
  },
  {
    icon: 'school-outline',
    name: 'Educação',
    description: 'Curso ou especialização',
    targetAmount: 5000,
    color: '#8b5cf6',
    months: 8,
  },
  {
    icon: 'medical-outline',
    name: 'Reserva de Emergência',
    description: '6 meses de gastos',
    targetAmount: 15000,
    color: '#ef4444',
    months: 12,
  },
  {
    icon: 'gift-outline',
    name: 'Presente Especial',
    description: 'Para alguém querido',
    targetAmount: 2000,
    color: '#ec4899',
    months: 6,
  },
];

export default function AddGoalScreen({ navigation }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<GoalForm>({
    resolver: yupResolver(goalSchema) as any,
    defaultValues: {
      name: '',
      targetAmount: '',
      currentAmount: '0,00',
      description: '',
      targetDate: '',
    },
  });

  const targetAmount = watch('targetAmount');
  const currentAmount = watch('currentAmount');

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (data: any) => goalService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      Alert.alert(
        'Sucesso!',
        'Meta criada com sucesso!',
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
        error.response?.data?.message || 'Erro ao criar meta. Tente novamente.'
      );
    },
  });

  const onSubmit = async (data: GoalForm) => {
    const goalData = {
      title: data.name, // Map name to title
      targetAmount: parseNumber(data.targetAmount),
      currentAmount: parseNumber(data.currentAmount),
      description: data.description || '',
      targetDate: new Date(data.targetDate),
      priority: 'medium' as const,
      color: '#3b82f6',
    };

    createGoalMutation.mutate(goalData);
  };

  const handleTemplateSelect = (templateIndex: number) => {
    const template = goalTemplates[templateIndex];
    setSelectedTemplate(templateIndex);
    
    setValue('name', template.name);
    setValue('targetAmount', template.targetAmount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
    setValue('description', template.description);
    
    // Set target date based on template months
    const targetDate = addMonths(new Date(), template.months);
    setValue('targetDate', format(targetDate, 'yyyy-MM-dd'));
  };

  const handleAmountChange = (field: 'targetAmount' | 'currentAmount', value: string) => {
    const formatted = formatInputCurrency(value);
    setValue(field, formatted, { shouldValidate: true });
  };

  const getProgress = () => {
    const target = parseNumber(targetAmount);
    const current = parseNumber(currentAmount);
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getMonthlyContribution = () => {
    const target = parseNumber(targetAmount);
    const current = parseNumber(currentAmount);
    const remaining = target - current;
    
    if (remaining <= 0) return 0;
    
    // Calculate months between now and target date
    const targetDate = new Date(watch('targetDate'));
    const now = new Date();
    const monthsDiff = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    return remaining / monthsDiff;
  };

  const renderTemplateItem = (template: typeof goalTemplates[0], index: number) => {
    const isSelected = selectedTemplate === index;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.templateItem,
          {
            backgroundColor: isSelected 
              ? template.color + '20' 
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? template.color 
              : themeConfig.colors.border,
          }
        ]}
        onPress={() => handleTemplateSelect(index)}
      >
        <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
          <Ionicons name={template.icon as any} size={24} color={template.color} />
        </View>
        <View style={styles.templateInfo}>
          <Text style={[
            styles.templateName, 
            { 
              color: isSelected 
                ? template.color 
                : themeConfig.colors.text 
            }
          ]}>
            {template.name}
          </Text>
          <Text style={[styles.templateDescription, { color: themeConfig.colors.textSecondary }]}>
            {template.description}
          </Text>
          <Text style={[styles.templateAmount, { color: template.color }]}>
            R$ {template.targetAmount.toLocaleString('pt-BR')}
          </Text>
        </View>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={template.color} 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Nova Meta" 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Templates */}
        <Card variant="elevated" style={styles.templatesCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Escolha um modelo ou crie personalizada
          </Text>
          
          <View style={styles.templatesGrid}>
            {goalTemplates.map((template, index) => renderTemplateItem(template, index))}
          </View>
          
          {selectedTemplate !== null && (
            <Button
              title="Personalizar"
              variant="outline"
              onPress={() => setSelectedTemplate(null)}
              style={styles.customizeButton}
            />
          )}
        </Card>

        {/* Goal Form */}
        <Card variant="elevated" style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Detalhes da Meta
          </Text>

          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome da Meta"
                placeholder="Ex: Casa própria, Viagem, Carro..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
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
        </Card>

        {/* Progress Preview */}
        {targetAmount && currentAmount && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Resumo da Meta
            </Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: themeConfig.colors.textSecondary }]}>
                  Progresso atual
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
                      backgroundColor: themeConfig.colors.primary 
                    }
                  ]} 
                />
              </View>
              
              <View style={styles.progressAmounts}>
                <Text style={[styles.currentAmountText, { color: themeConfig.colors.textSecondary }]}>
                  R$ {parseNumber(currentAmount).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </Text>
                <Text style={[styles.targetAmountText, { color: themeConfig.colors.text }]}>
                  R$ {parseNumber(targetAmount).toLocaleString('pt-BR', { 
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
                    R$ {(parseNumber(targetAmount) - parseNumber(currentAmount)).toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                </View>
                
                <View style={styles.calculationItem}>
                  <Text style={[styles.calculationLabel, { color: themeConfig.colors.textSecondary }]}>
                    Contribuição mensal
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
          </Card>
        )}

        {/* Quick Actions */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Dicas para alcançar sua meta
          </Text>
          
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="calendar-outline" size={16} color={themeConfig.colors.primary} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Defina uma data realista baseada na sua capacidade de poupança
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="repeat-outline" size={16} color={themeConfig.colors.success} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Configure transferências automáticas para sua meta
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="trending-up-outline" size={16} color={themeConfig.colors.warning} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Revise o progresso mensalmente e ajuste se necessário
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <Ionicons name="star-outline" size={16} color={themeConfig.colors.error} />
              <Text style={[styles.tipText, { color: themeConfig.colors.textSecondary }]}>
                Celebre marcos importantes para manter a motivação
              </Text>
            </View>
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title="Salvar Meta"
          onPress={handleSubmit(onSubmit) as any}
          loading={createGoalMutation.isPending}
          disabled={!isValid || createGoalMutation.isPending}
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
  templatesCard: {
    marginBottom: 16,
  },
  formCard: {
    marginBottom: 16,
  },
  previewCard: {
    marginBottom: 16,
  },
  actionsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  templatesGrid: {
    gap: 12,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
  },
  templateDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  templateAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  customizeButton: {
    marginTop: 16,
  },
  progressContainer: {
    gap: 12,
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
  currentAmountText: {
    fontSize: 12,
  },
  targetAmountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calculationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
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
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    flex: 1,
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