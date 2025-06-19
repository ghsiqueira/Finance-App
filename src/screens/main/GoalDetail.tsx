import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { goalService } from '../../services/api/goals';
import { formatCurrency, parseNumber, formatInputCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Contribution } from '../../types';

type Props = MainStackScreenProps<'GoalDetail'>;

export default function GoalDetailScreen({ navigation, route }: Props) {
  const { goalId } = route.params;
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');

  // Fetch goal details
  const { data: goalData, isLoading, error } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalService.getGoal(goalId),
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: () => goalService.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Sucesso!',
        'Meta excluída com sucesso.',
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
        error.response?.data?.message || 'Erro ao excluir meta. Tente novamente.'
      );
    },
  });

  // Add contribution mutation
  const addContributionMutation = useMutation({
    mutationFn: (data: { amount: number; note?: string }) => 
      goalService.addContribution(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowContributionModal(false);
      setContributionAmount('');
      setContributionNote('');
      Alert.alert('Sucesso!', 'Contribuição adicionada com sucesso!');
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao adicionar contribuição.'
      );
    },
  });

  const handleEdit = () => {
    navigation.navigate('EditGoal', { goalId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            deleteGoalMutation.mutate();
          },
        },
      ]
    );
  };

  const handleAddContribution = () => {
    if (!contributionAmount) {
      Alert.alert('Erro', 'Digite o valor da contribuição.');
      return;
    }

    const amount = parseNumber(contributionAmount);
    if (amount <= 0) {
      Alert.alert('Erro', 'O valor deve ser maior que zero.');
      return;
    }

    addContributionMutation.mutate({
      amount,
      note: contributionNote || undefined,
    });
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          label: 'Alta',
          color: themeConfig.colors.error,
          icon: 'chevron-up',
        };
      case 'medium':
        return {
          label: 'Média',
          color: themeConfig.colors.warning,
          icon: 'remove',
        };
      case 'low':
        return {
          label: 'Baixa',
          color: themeConfig.colors.success,
          icon: 'chevron-down',
        };
      default:
        return {
          label: priority,
          color: themeConfig.colors.textSecondary,
          icon: 'help',
        };
    }
  };

  const getGoalStatus = (goal: any) => {
    if (goal.isCompleted) {
      return {
        label: 'Concluída',
        color: themeConfig.colors.success,
        icon: 'checkmark-circle',
      };
    }

    if (goal.daysRemaining <= 0) {
      return {
        label: 'Vencida',
        color: themeConfig.colors.error,
        icon: 'time',
      };
    }

    if (goal.daysRemaining <= 7) {
      return {
        label: 'Urgente',
        color: themeConfig.colors.error,
        icon: 'warning',
      };
    }

    if (goal.daysRemaining <= 30) {
      return {
        label: 'Próxima do Prazo',
        color: themeConfig.colors.warning,
        icon: 'alert',
      };
    }

    return {
      label: 'Em Andamento',
      color: themeConfig.colors.primary,
      icon: 'flag',
    };
  };

  const renderContributionItem = ({ item }: { item: Contribution }) => (
    <View style={styles.contributionItem}>
      <View style={styles.contributionIcon}>
        <Ionicons 
          name={item.isAutomatic ? "repeat" : "add"} 
          size={20} 
          color={themeConfig.colors.primary} 
        />
      </View>
      
      <View style={styles.contributionInfo}>
        <Text style={[styles.contributionAmount, { color: themeConfig.colors.success }]}>
          +{formatCurrency(item.amount)}
        </Text>
        <Text style={[styles.contributionDate, { color: themeConfig.colors.textSecondary }]}>
          {format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}
          {item.isAutomatic && ' • Automático'}
        </Text>
        {item.note && (
          <Text style={[styles.contributionNote, { color: themeConfig.colors.textSecondary }]}>
            {item.note}
          </Text>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error || !goalData?.data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Meta" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Meta não encontrada
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            A meta que você está procurando não existe ou foi removida.
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

  const goal = goalData.data.goal;
  const contributionStats = goalData.data.contributionStats;
  const goalStatus = getGoalStatus(goal);
  const priorityInfo = getPriorityInfo(goal.priority);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title={goal.title} 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <Card variant="elevated" style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <View style={styles.goalInfo}>
              <View style={styles.goalTitleRow}>
                <Text style={[styles.goalTitle, { color: themeConfig.colors.text }]}>
                  {goal.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: goalStatus.color + '20' }]}>
                  <Ionicons name={goalStatus.icon as any} size={16} color={goalStatus.color} />
                  <Text style={[styles.statusText, { color: goalStatus.color }]}>
                    {goalStatus.label}
                  </Text>
                </View>
              </View>
              
              <View style={styles.goalMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color + '15' }]}>
                  <Ionicons name={priorityInfo.icon as any} size={14} color={priorityInfo.color} />
                  <Text style={[styles.priorityText, { color: priorityInfo.color }]}>
                    Prioridade {priorityInfo.label}
                  </Text>
                </View>
                
                {goal.category && (
                  <Text style={[styles.goalCategory, { color: themeConfig.colors.textSecondary }]}>
                    • {goal.category.name}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {goal.description && (
            <Text style={[styles.goalDescription, { color: themeConfig.colors.textSecondary }]}>
              {goal.description}
            </Text>
          )}

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: themeConfig.colors.textSecondary }]}>
                Progresso da Meta
              </Text>
              <Text style={[styles.progressPercentage, { color: themeConfig.colors.primary }]}>
                {goal.progressPercentage.toFixed(1)}%
              </Text>
            </View>
            
            <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min(goal.progressPercentage, 100)}%`,
                  backgroundColor: goal.isCompleted 
                    ? themeConfig.colors.success 
                    : goal.progressPercentage >= 75
                      ? themeConfig.colors.warning
                      : themeConfig.colors.primary
                }
              ]} />
            </View>

            <View style={styles.amountsRow}>
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
                  Atual
                </Text>
                <Text style={[styles.amountValue, { color: themeConfig.colors.success }]}>
                  {formatCurrency(goal.currentAmount)}
                </Text>
              </View>
              
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
                  Meta
                </Text>
                <Text style={[styles.amountValue, { color: themeConfig.colors.text }]}>
                  {formatCurrency(goal.targetAmount)}
                </Text>
              </View>
              
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
                  Restante
                </Text>
                <Text style={[styles.amountValue, { 
                  color: goal.remainingAmount <= 0 ? themeConfig.colors.success : themeConfig.colors.primary 
                }]}>
                  {formatCurrency(Math.max(goal.remainingAmount, 0))}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Timeline & Stats Card */}
        <Card variant="elevated" style={styles.timelineCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Cronograma da Meta
          </Text>
          
          <View style={styles.timelineInfo}>
            <View style={styles.timelineItem}>
              <Ionicons name="play" size={20} color={themeConfig.colors.success} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data de Início
                </Text>
                <Text style={[styles.timelineValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(goal.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <Ionicons name="flag" size={20} color={themeConfig.colors.primary} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data da Meta
                </Text>
                <Text style={[styles.timelineValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(goal.targetDate), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <Ionicons 
                name="calendar" 
                size={20} 
                color={goal.daysRemaining > 0 ? themeConfig.colors.primary : themeConfig.colors.error} 
              />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: themeConfig.colors.textSecondary }]}>
                  {goal.daysRemaining > 0 ? 'Dias Restantes' : 'Dias em Atraso'}
                </Text>
                <Text style={[
                  styles.timelineValue, 
                  { color: goal.daysRemaining > 0 ? themeConfig.colors.primary : themeConfig.colors.error }
                ]}>
                  {Math.abs(goal.daysRemaining)} {Math.abs(goal.daysRemaining) === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <Ionicons name="trending-up" size={20} color={themeConfig.colors.warning} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: themeConfig.colors.textSecondary }]}>
                  Economia Necessária (Mensal)
                </Text>
                <Text style={[styles.timelineValue, { color: themeConfig.colors.warning }]}>
                  {formatCurrency(goal.monthlySavingsNeeded)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Contribution Stats Card */}
        {contributionStats && (
          <Card variant="elevated" style={styles.statsCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Estatísticas de Contribuições
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeConfig.colors.primary }]}>
                  {contributionStats.total}
                </Text>
                <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                  Total de Contribuições
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeConfig.colors.success }]}>
                  {formatCurrency(contributionStats.averageAmount)}
                </Text>
                <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                  Valor Médio
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeConfig.colors.warning }]}>
                  {contributionStats.automatic}
                </Text>
                <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                  Automáticas
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeConfig.colors.error }]}>
                  {contributionStats.manual}
                </Text>
                <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                  Manuais
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Add Contribution Card */}
        {!goal.isCompleted && (
          <Card variant="elevated" style={styles.contributionCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Adicionar Contribuição
            </Text>
            
            <View style={styles.contributionForm}>
              <Input
                label="Valor da Contribuição"
                placeholder="R$ 0,00"
                value={contributionAmount}
                onChangeText={(text) => setContributionAmount(formatInputCurrency(text))}
                keyboardType="numeric"
                leftIcon={
                  <Ionicons name="cash-outline" size={20} color={themeConfig.colors.textSecondary} />
                }
              />
              
              <Input
                label="Observação (Opcional)"
                placeholder="Adicione uma nota..."
                value={contributionNote}
                onChangeText={setContributionNote}
                leftIcon={
                  <Ionicons name="document-text-outline" size={20} color={themeConfig.colors.textSecondary} />
                }
              />
              
              <Button
                title="Adicionar Contribuição"
                onPress={handleAddContribution}
                loading={addContributionMutation.isPending}
                disabled={!contributionAmount || addContributionMutation.isPending}
                gradient
                style={styles.addContributionButton}
              />
            </View>
          </Card>
        )}

        {/* Recent Contributions */}
        {goal.contributions && goal.contributions.length > 0 && (
          <Card variant="elevated" style={styles.contributionsCard}>
            <View style={styles.contributionsHeader}>
              <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
                Contribuições Recentes
              </Text>
              <Text style={[styles.contributionsCount, { color: themeConfig.colors.textSecondary }]}>
                {goal.contributions.length} {goal.contributions.length === 1 ? 'contribuição' : 'contribuições'}
              </Text>
            </View>
            
            <FlatList
              data={goal.contributions.slice(0, 10)} // Show only last 10
              keyExtractor={(item) => item._id}
              renderItem={renderContributionItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.contributionSeparator} />}
            />
          </Card>
        )}

        {/* Actions Card */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Ações
          </Text>
          
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.primary + '15' }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={20} color={themeConfig.colors.primary} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.primary }]}>
                Editar Meta
              </Text>
            </TouchableOpacity>

            {!goal.isCompleted && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: themeConfig.colors.success + '15' }]}
                onPress={() => {
                  Alert.alert(
                    'Marcar como Concluída',
                    'Tem certeza que deseja marcar esta meta como concluída?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Concluir', 
                        onPress: () => {
                          // Call complete goal API
                          Alert.alert('Info', 'Funcionalidade será implementada em breve');
                        }
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={themeConfig.colors.success} />
                <Text style={[styles.actionButtonText, { color: themeConfig.colors.success }]}>
                  Marcar como Concluída
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '15' }]}
              onPress={handleDelete}
              disabled={isDeleting || deleteGoalMutation.isPending}
            >
              <Ionicons name="trash" size={20} color={themeConfig.colors.error} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.error }]}>
                {isDeleting || deleteGoalMutation.isPending ? 'Excluindo...' : 'Excluir Meta'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

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
  mainCard: {
    marginBottom: 16,
  },
  mainHeader: {
    marginBottom: 16,
  },
  goalInfo: {
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalCategory: {
    fontSize: 14,
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercentage: {
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
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timelineCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timelineInfo: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    width: '45%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  contributionCard: {
    marginBottom: 16,
  },
  contributionForm: {
    gap: 16,
  },
  addContributionButton: {
    marginTop: 8,
  },
  contributionsCard: {
    marginBottom: 16,
  },
  contributionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contributionsCount: {
    fontSize: 14,
  },
  contributionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  contributionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contributionInfo: {
    flex: 1,
  },
  contributionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contributionDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  contributionNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  contributionSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 52,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 24,
  },
});