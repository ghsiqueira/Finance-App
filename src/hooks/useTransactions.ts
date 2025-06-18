import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/api/transactions';
import { useOffline } from './useOffline';

export const useTransactions = (filters?: any) => {
  const queryClient = useQueryClient();
  const { isOnline, saveOfflineTransaction } = useOffline();

  const {
    data: transactionsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionService.getTransactions(filters),
    staleTime: 1000 * 60 * 2, 
    enabled: isOnline,
  });

  const createTransactionMutation = useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: async (error: any, variables) => {
      if (!isOnline) {
        await saveOfflineTransaction({
          ...variables,
          _id: `temp_${Date.now()}`,
          userId: 'temp',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'pending' as any,
          tags: [],
          amount: parseFloat(variables.amount),
          date: variables.date.toISOString(),
        });
      }
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      transactionService.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: transactionService.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    transactions: transactionsResponse?.data?.items || [],
    pagination: transactionsResponse?.data?.pagination,
    isLoading,
    error,
    refetch,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  };
};
