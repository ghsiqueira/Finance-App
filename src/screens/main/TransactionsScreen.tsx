import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import type { MainTabScreenProps, Transaction } from '../../types';

type Props = MainTabScreenProps<'Transactions'>;

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  // 🔥 DEBUG: Log para rastrear problemas
  useEffect(() => {
    console.log('🔄 TransactionsScreen: Configurando query com parâmetros:', {
      searchText,
      filterType,
      page
    });
  }, [searchText, filterType, page]);

  const {
    data: transactionsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactions', { search: searchText, type: filterType === 'all' ? undefined : filterType, page }],
    queryFn: async () => {
      console.log('📡 Fazendo requisição para transações...');
      const result = await transactionService.getTransactions({
        search: searchText || undefined,
        type: filterType === 'all' ? undefined : filterType,
        page,
        limit: 20,
      });
      console.log('📥 Resposta recebida:', result);
      return result;
    },
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  const transactions = transactionsResponse?.data?.items || [];
  const pagination = transactionsResponse?.data?.pagination;

  // 🔥 DEBUG: Log dos dados recebidos
  useEffect(() => {
    console.log('📊 Dados atualizados:', {
      isLoading,
      error: error?.message,
      transactions: transactions.length,
      pagination
    });
  }, [isLoading, error, transactions, pagination]);

  const onRefresh = useCallback(async () => {
    console.log('🔄 Refreshing transactions...');
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = () => {
    if (pagination && page < pagination.totalPages) {
      console.log(`📄 Carregando página ${page + 1} de ${pagination.totalPages}`);
      setPage(prev => prev + 1);
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

  const renderFilterButton = (type: FilterType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && { backgroundColor: themeConfig.colors.primary + '15' },
        { borderColor: filterType === type ? themeConfig.colors.primary : themeConfig.colors.border }
      ]}
      onPress={() => {
        console.log(`🎯 Filtro alterado para: ${type}`);
        setFilterType(type);
        setPage(1);
      }}
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

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => (
    <TouchableOpacity
      style={[
        styles.transactionItem,
        index !== 0 && { borderTopWidth: 1, borderTopColor: themeConfig.colors.border }
      ]}
      onPress={() => {
        console.log(`🔍 Navegando para detalhe da transação: ${item._id}`);
        navigation.navigate('TransactionDetail', { transactionId: item._id });
      }}
    >
      <View style={styles.transactionIcon}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: item.type === 'income' ? themeConfig.colors.success + '15' : themeConfig.colors.error + '15' }
        ]}>
          <Ionicons
            name={item.type === 'income' ? 'trending-up' : 'trending-down'}
            size={20}
            color={item.type === 'income' ? themeConfig.colors.success : themeConfig.colors.error}
          />
        </View>
      </View>
      
      <View style={styles.transactionContent}>
        <Text style={[styles.transactionDescription, { color: themeConfig.colors.text }]}>
          {item.description}
        </Text>
        <View style={styles.transactionMeta}>
          <Text style={[styles.transactionCategory, { color: themeConfig.colors.textSecondary }]}>
            {item.category?.name || 'Sem categoria'}
          </Text>
          <Text style={[styles.transactionSeparator, { color: themeConfig.colors.textLight }]}>
            •
          </Text>
          <Text style={[styles.transactionDate, { color: themeConfig.colors.textLight }]}>
            {formatRelativeTime(item.date)}
          </Text>
        </View>
        {item.paymentMethod && item.paymentMethod !== 'cash' && (
          <Text style={[styles.transactionPayment, { color: themeConfig.colors.textLight }]}>
            {getPaymentMethodLabel(item.paymentMethod)}
          </Text>
        )}
      </View>
      
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.transactionValue,
          {
            color: item.type === 'income' 
              ? themeConfig.colors.success 
              : themeConfig.colors.error
          }
        ]}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Text style={[styles.transactionTime, { color: themeConfig.colors.textLight }]}>
          {format(new Date(item.date), 'HH:mm')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Busca */}
      <Input
        placeholder="Buscar transações..."
        value={searchText}
        onChangeText={(text) => {
          console.log(`🔍 Busca alterada: "${text}"`);
          setSearchText(text);
          setPage(1);
        }}
        variant="filled"
        leftIcon={
          <Ionicons name="search" size={20} color={themeConfig.colors.textSecondary} />
        }
        style={styles.searchInput}
      />

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'Todas', 'list-outline')}
        {renderFilterButton('income', 'Receitas', 'trending-up')}
        {renderFilterButton('expense', 'Gastos', 'trending-down')}
      </View>

      {/* Resumo */}
      {pagination && (
        <Text style={[styles.summary, { color: themeConfig.colors.textSecondary }]}>
          {pagination.totalItems} transações encontradas
        </Text>
      )}

      {/* 🔥 DEBUG: Informações de debug */}
      {__DEV__ && (
        <View style={[styles.debugContainer, { backgroundColor: themeConfig.colors.card }]}>
          <Text style={[styles.debugText, { color: themeConfig.colors.textSecondary }]}>
            🐛 DEBUG: Loading: {isLoading ? 'SIM' : 'NÃO'} | 
            Transações: {transactions.length} | 
            Erro: {error ? 'SIM' : 'NÃO'}
          </Text>
          {error && (
            <Text style={[styles.debugText, { color: themeConfig.colors.error }]}>
              ❌ Erro: {error.message}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || page === 1) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={themeConfig.colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={themeConfig.colors.textLight} />
      <Text style={[styles.emptyStateTitle, { color: themeConfig.colors.textSecondary }]}>
        {searchText ? 'Nenhuma transação encontrada' : 'Nenhuma transação ainda'}
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: themeConfig.colors.textLight }]}>
        {searchText 
          ? 'Tente ajustar os filtros de busca'
          : 'Adicione sua primeira transação para começar'
        }
      </Text>
      {!searchText && (
        <Button
          title="Adicionar Transação"
          onPress={() => navigation.navigate('AddTransaction', {})}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  // 🔥 DEBUG: Mostrar estado de erro
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { color: themeConfig.colors.text }]}>
            Transações
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction', {})}
            style={[styles.addButton, { backgroundColor: themeConfig.colors.primary }]}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.text }]}>
            Erro ao carregar transações
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            {error.message}
          </Text>
          <Button
            title="Tentar Novamente"
            onPress={() => refetch()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          Transações
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTransaction', {})}
          style={[styles.addButton, { backgroundColor: themeConfig.colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Card variant="elevated" style={styles.contentCard}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderTransactionItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={transactions.length === 0 ? styles.emptyListContainer : undefined}
        />
      </Card>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeConfig.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCard: {
    flex: 1,
    margin: 16,
    marginTop: 8,
  },
  header: {
    paddingBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    fontSize: 12,
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 10,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  transactionIcon: {
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
  },
  transactionSeparator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionPayment: {
    fontSize: 11,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 11,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 120,
  },
});