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
${transactionData.notes ? `📝 Observações: ${transactionData.notes}` : ''}

Compartilhado via Finance App
    `.trim();

    try {
      await Share.share({
        message: shareText,
        title: 'Detalhes da Transação',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

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

  const getPaymentMethodIcon = (method: string): string => {
    const icons: Record<string, string> = {
      cash: 'cash-outline',
      credit_card: 'card-outline',
      debit_card: 'card-outline',
      bank_transfer: 'swap-horizontal-outline',
      pix: 'flash-outline',
      other: 'ellipsis-horizontal-outline',
    };
    return icons[method] || 'help-outline';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Concluída',
          color: themeConfig.colors.success,
          icon: 'checkmark-circle',
        };
      case 'pending':
        return {
          label: 'Pendente',
          color: themeConfig.colors.warning,
          icon: 'time',
        };
      case 'cancelled':
        return {
          label: 'Cancelada',
          color: themeConfig.colors.error,
          icon: 'close-circle',
        };
      default:
        return {
          label: status,
          color: themeConfig.colors.textSecondary,
          icon: 'help-circle',
        };
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error || !transaction?.data?.transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Transação" showBackButton onBackPress={() => navigation.goBack()} />
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
  const statusInfo = getStatusInfo(transactionData.status);
  const isIncome = transactionData.type === 'income';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="Detalhes da Transação"
        showBackButton
        onBackPress={() => navigation.goBack()}
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
              </Text>
              <Text style={[styles.transactionDescription, { color: themeConfig.colors.text }]}>
                {transactionData.description}
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[
              styles.amount,
              { color: isIncome ? themeConfig.colors.success : themeConfig.colors.error }
            ]}>
              {isIncome ? '+' : '-'} {formatCurrency(transactionData.amount)}
            </Text>
            <Text style={[styles.amountDate, { color: themeConfig.colors.textSecondary }]}>
              {format(new Date(transactionData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Informações Detalhadas
          </Text>

          <View style={styles.detailsList}>
            {/* Category */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="pricetag-outline" size={20} color={themeConfig.colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Categoria
                </Text>
                <View style={styles.categoryRow}>
                  {transactionData.category && (
                    <View style={[styles.categoryColor, { backgroundColor: transactionData.category.color }]} />
                  )}
                  <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                    {transactionData.category?.name || 'Sem categoria'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name={getPaymentMethodIcon(transactionData.paymentMethod) as any}
                  size={20}
                  color={themeConfig.colors.textSecondary}
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

            {/* Date & Time */}
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={themeConfig.colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data e Hora
                </Text>
                <Text style={[styles.detailValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(transactionData.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Text>
              </View>
            </View>

            {/* Tags */}
            {transactionData.tags && transactionData.tags.length > 0 && (
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="bookmark-outline" size={20} color={themeConfig.colors.textSecondary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: themeConfig.colors.textSecondary }]}>
                    Tags
                  </Text>
                  <View style={styles.tagsContainer}>
                    {transactionData.tags.map((tag: string, index: number) => (
                      <View key={index} style={[styles.tag, { backgroundColor: themeConfig.colors.primary + '20' }]}>
                        <Text style={[styles.tagText, { color: themeConfig.colors.primary }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
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
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.success + '15' }]}
              onPress={handleDuplicate}
            >
              <Ionicons name="copy" size={20} color={themeConfig.colors.success} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.success }]}>
                Duplicar Transação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.warning + '15' }]}
              onPress={handleShare}
            >
              <Ionicons name="share" size={20} color={themeConfig.colors.warning} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.warning }]}>
                Compartilhar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '15' }]}
              onPress={handleDelete}
              disabled={isDeleting || deleteTransactionMutation.isPending}
            >
              <Ionicons name="trash" size={20} color={themeConfig.colors.error} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.error }]}>
                {isDeleting || deleteTransactionMutation.isPending ? 'Excluindo...' : 'Excluir Transação'}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
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
  amountContainer: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  amountDate: {
    fontSize: 14,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesCard: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
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