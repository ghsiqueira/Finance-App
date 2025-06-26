// src/screens/main/TransactionsScreen.tsx - Versão Corrigida com tema compatível
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme } from '../../styles/theme';
import { mapThemeToCompat } from '../../styles/themeCompat';
import { transactionService, Transaction } from '../../services/api/transactions';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import type { MainTabScreenProps } from '../../types';

type Props = MainTabScreenProps<'Transactions'>;
type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  
  const { theme } = useThemeStore();
  const { isAuthenticated, checkAuthStatus } = useAuthStore();
  const originalTheme = getTheme(theme);
  const themeConfig = mapThemeToCompat(originalTheme);
  const queryClient = useQueryClient();

  // 🔥 Verificar autenticação ao montar componente
  useEffect(() => {
    const verifyAuth = async () => {
      const isAuth = await checkAuthStatus();
      if (!isAuth) {
        Alert.alert(
          'Sessão Expirada',
          'Sua sessão expirou. Faça login novamente.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth' as any) }]
        );
      }
    };

    verifyAuth();
  }, []);

  // 🔥 Query das transações com retry inteligente
  const {
    data: transactionsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['transactions', { 
      search: searchText || undefined, 
      type: filterType === 'all' ? undefined : filterType, 
      page 
    }],
    queryFn: async () => {
      console.log('📡 Fazendo requisição para transações...');
      console.log('🔧 Parâmetros:', { searchText, filterType, page, isAuthenticated });
      
      const result = await transactionService.getTransactions({
        search: searchText || undefined,
        type: filterType === 'all' ? undefined : filterType,
        page,
        limit: 20,
      });

      console.log('📊 Dados recebidos:', {
        transactions: result.items?.length || 0,
        pagination: result.pagination,
        totalItems: result.pagination?.totalItems || 0
      });

      return result;
    },
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('Sessão expirada') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // 🔥 Refresh manual
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // 🔥 Filtros
  const handleFilterPress = (filter: FilterType) => {
    setFilterType(filter);
    setPage(1);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setPage(1);
  };

  // 🔥 Navegação para adicionar transação
  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction', {});
  };

  // 🔥 Navegação para editar transação
  const handleEditTransaction = (transaction: Transaction) => {
    navigation.navigate('EditTransaction', { transactionId: transaction._id });
  };

  // 🔥 Ver detalhes da transação
  const handleViewTransaction = (transaction: Transaction) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction._id });
  };

  // 🔥 Deletar transação
  const handleDeleteTransaction = (transaction: Transaction) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir a transação "${transaction.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(transaction._id);
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              Alert.alert('Sucesso', 'Transação excluída com sucesso!');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao excluir transação');
            }
          },
        },
      ]
    );
  };

  // 🔥 Componente do item da transação
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={[styles.transactionItem, { backgroundColor: themeConfig.surface }]}
      onPress={() => handleViewTransaction(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.categoryInfo}>
          {item.category ? (
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: item.category.color + '20' }
              ]}
            >
              <Ionicons
                name={item.category.icon as any}
                size={20}
                color={item.category.color}
              />
            </View>
          ) : (
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: themeConfig.muted + '20' }
              ]}
            >
              <Ionicons
                name="help-circle"
                size={20}
                color={themeConfig.muted}
              />
            </View>
          )}
          <View style={styles.transactionInfo}>
            <Text
              style={[styles.transactionDescription, { color: themeConfig.foreground }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <Text style={[styles.transactionCategory, { color: themeConfig.muted }]}>
              {item.category?.name || 'Sem categoria'} • {format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </View>
        </View>
        
        <View style={styles.transactionActions}>
          <Text
            style={[
              styles.transactionAmount,
              {
                color: item.type === 'income' 
                  ? themeConfig.success 
                  : themeConfig.destructive
              }
            ]}
          >
            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.primary + '20' }]}
              onPress={() => handleEditTransaction(item)}
            >
              <Ionicons name="pencil" size={16} color={themeConfig.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.destructive + '20' }]}
              onPress={() => handleDeleteTransaction(item)}
            >
              <Ionicons name="trash" size={16} color={themeConfig.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {item.notes && (
        <Text
          style={[styles.transactionNotes, { color: themeConfig.muted }]}
          numberOfLines={2}
        >
          {item.notes}
        </Text>
      )}
      
      {item.isRecurring && (
        <View style={styles.recurringBadge}>
          <Ionicons name="repeat" size={12} color={themeConfig.primary} />
          <Text style={[styles.recurringText, { color: themeConfig.primary }]}>
            Recorrente
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // 🔥 Componente de filtros
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterButtons}>
        {[
          { key: 'all', label: 'Todas', icon: 'list' },
          { key: 'income', label: 'Receitas', icon: 'arrow-up-circle' },
          { key: 'expense', label: 'Gastos', icon: 'arrow-down-circle' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterType === filter.key 
                  ? themeConfig.primary 
                  : themeConfig.muted + '20'
              }
            ]}
            onPress={() => handleFilterPress(filter.key as FilterType)}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={filterType === filter.key ? 'white' : themeConfig.muted}
            />
            <Text
              style={[
                styles.filterButtonText,
                {
                  color: filterType === filter.key ? 'white' : themeConfig.muted
                }
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 🔥 Componente de estado vazio
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="wallet-outline"
        size={64}
        color={themeConfig.muted}
      />
      <Text style={[styles.emptyStateTitle, { color: themeConfig.foreground }]}>
        Nenhuma transação encontrada
      </Text>
      <Text style={[styles.emptyStateDescription, { color: themeConfig.muted }]}>
        {searchText 
          ? 'Tente ajustar os filtros ou termos de busca'
          : 'Comece adicionando sua primeira transação'
        }
      </Text>
      <Button
        title="Adicionar Transação"
        onPress={handleAddTransaction}
        style={styles.emptyStateButton}
      />
    </View>
  );

  // 🔥 Componente de erro
  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons
        name="warning-outline"
        size={64}
        color={themeConfig.destructive}
      />
      <Text style={[styles.errorTitle, { color: themeConfig.foreground }]}>
        Erro ao carregar transações
      </Text>
      <Text style={[styles.errorDescription, { color: themeConfig.muted }]}>
        {error?.message || 'Ocorreu um erro inesperado'}
      </Text>
      <Button
        title="Tentar Novamente"
        onPress={() => refetch()}
        style={styles.retryButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeConfig.foreground }]}>
          Transações
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: themeConfig.primary }]}
          onPress={handleAddTransaction}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar transações..."
          value={searchText}
          onChangeText={handleSearch}
          leftIcon="search"
          style={styles.searchInput}
        />
      </View>

      {/* Filtros */}
      {renderFilters()}

      {/* Lista de transações */}
      <Card style={styles.listContainer}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeConfig.primary} />
            <Text style={[styles.loadingText, { color: themeConfig.muted }]}>
              Carregando transações...
            </Text>
          </View>
        ) : error ? (
          renderError()
        ) : (
          <FlatList
            data={transactionsResponse?.items || []}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.listContent,
              { flexGrow: 1 }
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[themeConfig.primary]}
                tintColor={themeConfig.primary}
              />
            }
            ListEmptyComponent={!isLoading ? renderEmptyState : null}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: themeConfig.border }]} />
            )}
          />
        )}
      </Card>

      {/* Indicador de loading durante fetch */}
      {isFetching && !isLoading && !refreshing && (
        <View style={styles.fetchingIndicator}>
          <ActivityIndicator size="small" color={themeConfig.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    padding: 0,
  },
  listContent: {
    padding: 16,
  },
  transactionItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
  },
  transactionActions: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionButtons: {
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
  transactionNotes: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  retryButton: {
    minWidth: 200,
  },
  fetchingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 8,
  },
});