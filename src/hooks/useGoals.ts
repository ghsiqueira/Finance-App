import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalService } from '../services/api/goals';

export const useGoals = (filters?: any) => {
  const queryClient = useQueryClient();

  const {
    data: goalsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['goals', filters],
    queryFn: () => goalService.getGoals(filters),
    staleTime: 1000 * 60 * 2,
  });

  const createGoalMutation = useMutation({
    mutationFn: goalService.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      goalService.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: goalService.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      goalService.addContribution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => 
      goalService.updateGoalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  return {
    goals: goalsResponse?.data?.goals || [],
    isLoading,
    error,
    refetch,
    createGoal: createGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    addContribution: addContributionMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isAddingContribution: addContributionMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};
