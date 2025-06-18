import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../services/api/budgets';

export const useBudgets = (filters?: any) => {
  const queryClient = useQueryClient();

  const {
    data: budgetsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['budgets', filters],
    queryFn: () => budgetService.getBudgets(filters),
    staleTime: 1000 * 60 * 2,
  });

  const createBudgetMutation = useMutation({
    mutationFn: budgetService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      budgetService.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: budgetService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const toggleBudgetMutation = useMutation({
    mutationFn: budgetService.toggleBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  return {
    budgets: budgetsResponse?.data?.budgets || [],
    isLoading,
    error,
    refetch,
    createBudget: createBudgetMutation.mutate,
    updateBudget: updateBudgetMutation.mutate,
    deleteBudget: deleteBudgetMutation.mutate,
    toggleBudget: toggleBudgetMutation.mutate,
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending,
    isToggling: toggleBudgetMutation.isPending,
  };
};
