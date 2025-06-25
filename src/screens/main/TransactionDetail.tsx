import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';

type Props = MainStackScreenProps<'TransactionDetail'>;

export default function TransactionDetailScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch transaction details
  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionService.getTransaction(transactionId),
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: () => transactionService.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Sucesso!',
        'Transação excluída com sucesso.',
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
        error.response?.data?.message || 'Erro ao excluir transação. Tente novamente.'
      );
    },
  });

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      bank_transfer: 'Transferência',
      pix: 'PIX',
      other: 'Outro',
    };
    
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      cash: 'cash-outline',
      credit_card: 'card-outline',
      debit_card: 'card-outline',
      bank_transfer: 'swap-horizontal-outline',
      pix: 'flash-outline',
      other: 'ellipsis-horizontal-outline',
    };
    
    return icons[method] || 'help-outline';
  };

  const getRecurrenceLabel = (config?: any): string => {
    if (!config) return '';
    
    const frequencyLabels: Record<string, string> = {
      daily: 'diariamente',
      weekly: 'semanalmente',
      monthly: 'mensalmente',
      yearly: 'anualmente',
    };
    
    const interval = config.interval || 1;
    const frequency = frequencyLabels[config.frequency] || '';
    
    if (interval === 1) {
      return frequency;
    }
    
    return `a cada ${interval} ${config.frequency === 'daily' ? 'dias' : 
                                 config.frequency === 'weekly' ? 'semanas' :
                                 config.frequency === 'monthly' ? 'meses' : 'anos'}`;
  };

  const handleEdit = () => {
    navigation.navigate('EditTransaction', { transactionId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
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
            deleteTransactionMutation.mutate();
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    if (!transaction?.data?.transaction) return;

    const transactionData = transaction.data.transaction;
    navigation.navigate('AddTransaction', {
      type: transactionData.type,
      initialData: {
        description: `${transactionData.description} (Cópia)`,
        amount: transactionData.amount.toString(),
        categoryId: transactionData.categoryId ?? '',
        notes: transactionData.notes,
        paymentMethod: transactionData.paymentMethod,
      }
    });
  };

  const handleShare = async () => {
    if (!transaction?.data?.transaction) return;

    const transactionData = transaction.data.transaction;
    const shareText = `
💰 ${transactionData.type === 'income' ? 'Receita' : 'Gasto'}: ${transactionData.description}
💵 Valor: ${formatCurrency(transactionData.amount)}
📅 Data: ${format(new Date(transactionData.date), 'dd/MM/yyyy', { locale: ptBR })}
🏷️ Categoria: ${transactionData.category?.name || 'Sem categoria'}
💳 Pagamento: ${getPaymentMethodLabel(transactionData.paymentMethod)}
${transactionData.notes ? `📝 Notas: ${transactionData.notes}` : ''}
${transactionData.isRecurring ? `🔄 Recorrente: ${getRecurrenceLabel(transactionData.recurringConfig)}` : ''}

📱 Gerado pelo App Financeiro
    `.trim();

    try {
      await Share.share({
        message: shareText,
        title: `Transação: ${transactionData.description}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Detalhes da Transação" showBackButton onBackPress={() => navigation.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }

  if (error || !transaction?.data?.transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Detalhes da Transação" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Transação não encontrada
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            A transação que você está procurando não existe ou foi removida.
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

  const transactionData = transaction.data.transaction;
  const isIncome = transactionData.type === 'income';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="Detalhes da Transação"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={themeConfig.colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <Card variant="elevated" style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <View style={[
              styles.typeIcon,
              { backgroundColor: isIncome ? themeConfig.colors.success + '20' : themeConfig.colors.error + '20' }
            ]}>
              <Ionicons
                name={isIncome ? 'trending-up' : 'trending-down'}
                size={32}
                color={isIncome ? themeConfig.colors.success : themeConfig.colors.error}
              />
            </View>

            <View style={styles.mainInfo}>
              <Text style={[styles.transactionType, { color: themeConfig.colors.textSecondary }]}>
                {isIncome ? 'Receita' : 'Gasto'}
                {transactionData.isRecurring && (
                  <Text style={[styles.recurrentBadge, { color: themeConfig.colors.primary }]}>
                    {' '}• Recorrente
                  </Text>
                )}
              </Text>
              <Text style={[styles.transactionDescription, { color: themeConfig.colors.text }]}>
                {transactionData.description}
              </Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[
              styles.amount,
              { color: isIncome ? themeConfig.colors.success : themeConfig.colors.error }
            ]}>
              {isIncome ? '+' : '-'}{formatCurrency(transactionData.amount)}
            </Text>
          </View>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Detalhes
          </Text>

          <View style={styles.detailsList}>
            {/* Data */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data
                </Text>
                <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(transactionData.date), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })}
                </Text>
              </View>
            </View>

            {/* Categoria */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons 
                  name="pricetag-outline" 
                  size={20} 
                  color={transactionData.category?.color || themeConfig.colors.textSecondary} 
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Categoria
                </Text>
                <View style={styles.categoryInfo}>
                  {transactionData.category ? (
                    <>
                      <Text style={styles.categoryIcon}>{transactionData.category.icon}</Text>
                      <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                        {transactionData.category.name}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.detailValue, { color: themeConfig.colors.textLight }]}>
                      Sem categoria
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Método de Pagamento */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons 
                  name={getPaymentMethodIcon(transactionData.paymentMethod)} 
                  size={20} 
                  color={themeConfig.colors.primary} 
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Método de Pagamento
                </Text>
                <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                  {getPaymentMethodLabel(transactionData.paymentMethod)}
                </Text>
              </View>
            </View>

            {/* Recorrência */}
            {transactionData.isRecurring && (
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="repeat-outline" size={20} color={themeConfig.colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                    Recorrência
                  </Text>
                  <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                    Repete {getRecurrenceLabel(transactionData.recurringConfig)}
                  </Text>
                  {transactionData.recurringConfig?.endDate && (
                    <Text style={[styles.detailSubValue, { color: themeConfig.colors.textLight }]}>
                      Até {format(new Date(transactionData.recurringConfig.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Data de Criação */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={20} color={themeConfig.colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Criada em
                </Text>
                <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(transactionData.createdAt), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Notes Card */}
        {transactionData.notes && (
          <Card variant="elevated" style={styles.notesCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Observações
            </Text>
            <Text style={[styles.notesText, { color: themeConfig.colors.textSecondary }]}>
              {transactionData.notes}
            </Text>
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
                Editar Transação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.warning + '15' }]}
              onPress={handleDuplicate}
            >
              <Ionicons name="copy" size={20} color={themeConfig.colors.warning} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.warning }]}>
                Duplicar Transação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '15' }]}
              onPress={handleDelete}
              disabled={deleteTransactionMutation.isPending}
            >
              <Ionicons 
                name={deleteTransactionMutation.isPending ? "hourglass" : "trash"} 
                size={20} 
                color={themeConfig.colors.error} 
              />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.error }]}>
                {deleteTransactionMutation.isPending ? 'Excluindo...' : 'Excluir Transação'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Espaçamento inferior */}
        <View style={{ height: 20 }} />
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
  shareButton: {
    padding: 8,
  },
  mainCard: {
    marginBottom: 16,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  recurrentBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDescription: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailsList: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  detailSubValue: {
    fontSize: 14,
    marginTop: 2,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  notesCard: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
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
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    minWidth: 120,
  },
});