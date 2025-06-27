import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import BudgetCard from '../../components/budget/BudgetCard';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { categoryService } from '../../services/api/categories';
import { formatCurrency } from '../../utils/formatters';
import type { MainTabScreenProps } from '../../types';

type Props = MainTabScreenProps<'Budgets'>;

// Tipos originais - não modificar para manter compatibilidade
interface Budget {
  _id: string;
  name: string;
  amount: number;
  spent: number;
  spentPercentage: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded'; // ✅ Manter tipos originais
  period: string;
  startDate: string;
  endDate: string;
  isActive: boolean; // ✅ Usar apenas isActive para identificar pausados
  categoryId: string;
  userId: string;
  alertThreshold: number;
  alertSent: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

interface BudgetWithCategory extends Omit<Budget, 'category'> {
  category: {
    _id: string;
    name: string;
    icon: string;
    color: string;
  };
}

// ✅ Filtros corrigidos - adicionado 'paused'
const filterOptions = [
  { value: 'all' as const, label: 'Todos', icon: 'list' },
  { value: 'active' as const, label: 'Ativos', icon: 'play-circle' },
  { value: 'paused' as const, label: 'Pausados', icon: 'pause-circle' },
  { value: 'expired' as const, label: 'Expirados', icon: 'time-outline' },
  { value: 'future' as const, label: 'Futuros', icon: 'calendar-outline' },
];

type FilterType = 'all' | 'active' | 'paused' | 'expired' | 'future';

export default function BudgetsScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();

  // ✅ CORREÇÃO PRINCIPAL: Sempre buscar todos os orçamentos, filtrar depois
  const {
    data: budgetsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['budgets'], // Removido selectedFilter da key para sempre buscar todos
    queryFn: () => budgetService.getBudgets({
      // ✅ NUNCA filtrar na API - sempre buscar todos
      includeCategory: true,
      includeInactive: true, // ✅ Incluir inativos/pausados
    }),
    staleTime: 30000,
  });

  // Buscar todas as categorias
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getCategories({ 
      type: 'expense',
      includeInactive: false 
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Deletar orçamento
  const deleteBudgetMutation = useMutation({
    mutationFn: budgetService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao deletar orçamento.'
      );
    },
  });

  const budgets = budgetsResponse?.data?.budgets || [];
  const categories = categoriesResponse?.data?.categories || [];

  // DEBUG: Adicionar logs para entender o que está acontecendo
  console.log('🔍 DEBUG - Budgets recebidos:', budgets.length);
  console.log('🔍 DEBUG - Categories recebidas:', categories.length);
  console.log('🔍 DEBUG - Filtro selecionado:', selectedFilter);
  
  // Se tiver orçamentos, mostrar os detalhes
  if (budgets.length > 0) {
    console.log('🔍 DEBUG - Primeiro orçamento completo:', budgets[0]);
    console.log('🔍 DEBUG - Estrutura do primeiro orçamento:', {
      id: budgets[0]._id,
      name: budgets[0].name,
      categoryId: budgets[0].categoryId,
      isActive: budgets[0].isActive,
      status: budgets[0].status, // ✅ Adicionar status no debug
      category: budgets[0].category,
      // Mostrar todas as propriedades para debug
      allProps: Object.keys(budgets[0])
    });
  }

  // Função para transformar Budget em BudgetWithCategory
  const transformBudgetWithCategory = (budget: Budget): BudgetWithCategory | null => {
    console.log(`🔄 Transformando orçamento: ${budget.name}`);
    console.log(`   - categoryId: ${budget.categoryId}`);
    console.log(`   - tem category populada: ${!!budget.category}`);
    console.log(`   - status: ${budget.status}`);
    console.log(`   - isActive: ${budget.isActive}`);
    
    // ✅ MUDANÇA: Melhorar validação e debug
    if (!budget.category && !budget.categoryId) {
      console.warn('⚠️ Orçamento sem categoria:', budget.name);
      return null;
    }
    
    // Se não tem categoria populada, tentar encontrar nos dados de categorias
    let categoryData = budget.category;
    if (!categoryData && budget.categoryId) {
      categoryData = categories.find(cat => cat._id === budget.categoryId);
      console.log(`   - categoria encontrada: ${categoryData?.name || 'NENHUMA'}`);
    }
    
    if (!categoryData) {
      console.warn('⚠️ Categoria não encontrada para orçamento:', budget.name, 'categoryId:', budget.categoryId);
      console.warn('⚠️ Categorias disponíveis:', categories.map(c => c._id));
      
      // ✅ CORREÇÃO: Criar categoria padrão para não perder o orçamento
      categoryData = {
        _id: budget.categoryId || 'unknown',
        name: 'Categoria Desconhecida',
        icon: 'help-circle',
        color: '#666666'
      };
    }
    
    const result = {
      ...budget,
      category: {
        _id: categoryData._id,
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
      }
    };
    
    console.log(`✅ Orçamento ${budget.name} transformado com sucesso`);
    return result;
  };

  // ✅ CORREÇÃO: Filtrar orçamentos baseado no filtro selecionado
  const filteredBudgets = useMemo(() => {
    console.log('🔍 DEBUG - Aplicando filtro:', selectedFilter);
    
    if (selectedFilter === 'all') {
      console.log('✅ Filtro "Todos" - mostrando todos os orçamentos');
      return budgets;
    }
    
    const now = new Date();
    
    const filtered = budgets.filter((budget: Budget) => {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      
      switch (selectedFilter) {
        case 'active':
          // ✅ CORREÇÃO: Apenas orçamentos ativos dentro do período
          return budget.isActive && startDate <= now && endDate >= now;
        
        case 'paused':
          // ✅ CORREÇÃO: Orçamentos pausados (isActive = false)
          return !budget.isActive;
        
        case 'expired':
          // Orçamentos expirados (data final passou)
          return endDate < now;
        
        case 'future':
          // Orçamentos futuros (data inicial ainda não chegou)
          return startDate > now;
        
        default:
          return true;
      }
    });
    
    console.log(`🔍 DEBUG - Orçamentos após filtro "${selectedFilter}":`, filtered.length);
    
    // Log detalhado para debug dos pausados
    if (selectedFilter === 'paused') {
      console.log('🔍 DEBUG - Orçamentos pausados encontrados:');
      filtered.forEach(budget => {
        console.log(`  - ${budget.name}: isActive=${budget.isActive}`);
      });
    }
    
    return filtered;
  }, [budgets, selectedFilter]);

  console.log('🔍 DEBUG - Orçamentos após filtro:', filteredBudgets.length);

  // ✅ Calcular estatísticas gerais - usando apenas isActive
  const totalStats = useMemo(() => {
    // Para estatísticas, considerar apenas orçamentos realmente ativos
    const activeBudgets = budgets.filter((budget: Budget) => 
      budget.isActive &&
      new Date(budget.startDate) <= new Date() &&
      new Date(budget.endDate) >= new Date()
    );
    
    const pausedBudgets = budgets.filter((budget: Budget) => 
      !budget.isActive
    );
    
    const totalBudget = activeBudgets.reduce((sum: number, budget: Budget) => sum + budget.amount, 0);
    const totalSpent = activeBudgets.reduce((sum: number, budget: Budget) => sum + budget.spent, 0);
    const exceededCount = activeBudgets.filter((budget: Budget) => budget.status === 'exceeded').length;
    const warningCount = activeBudgets.filter((budget: Budget) => budget.status === 'warning').length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      activeBudgetsCount: activeBudgets.length,
      pausedBudgetsCount: pausedBudgets.length, // ✅ Adicionado contador de pausados
      exceededCount,
      warningCount,
      spentPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    };
  }, [budgets]); // ✅ Usar todos os budgets, não apenas filtrados

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleBudgetPress = (budget: BudgetWithCategory) => {
    navigation.navigate('BudgetDetail', { budgetId: budget._id });
  };

  const handleEditBudget = (budget: BudgetWithCategory) => {
    navigation.navigate('EditBudget', { budgetId: budget._id });
  };

  const handleDeleteBudget = (budget: BudgetWithCategory) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o orçamento "${budget.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteBudgetMutation.mutate(budget._id),
        },
      ]
    );
  };

  const handleCreateBudget = () => {
    navigation.navigate('AddBudget', undefined);
  };

  const renderFilterButton = (filter: typeof filterOptions[number]) => {
    const isSelected = selectedFilter === filter.value;
    
    return (
      <TouchableOpacity
        key={filter.value}
        style={[
          styles.filterButton,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '20'
              : themeConfig.colors.surface,
            borderColor: isSelected 
              ? themeConfig.colors.primary
              : themeConfig.colors.border,
          },
        ]}
        onPress={() => setSelectedFilter(filter.value)}
      >
        <Ionicons 
          name={filter.icon as any} 
          size={16} 
          color={isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
        />
        <Text style={[
          styles.filterButtonText,
          { color: isSelected ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
        ]}>
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBudgetItem = ({ item: budget }: { item: Budget }) => {
    // Melhorar a renderização para mostrar mesmo sem categoria correta
    const categoryName = budget.category?.name || 
                        categories.find(c => c._id === budget.categoryId)?.name || 
                        'Categoria não encontrada';
    
    // Criar um budget com categoria para o componente
    const budgetWithCategory: BudgetWithCategory = {
      ...budget,
      category: {
        _id: budget.categoryId || 'unknown',
        name: categoryName,
        icon: budget.category?.icon || categories.find(c => c._id === budget.categoryId)?.icon || 'help-circle',
        color: budget.category?.color || categories.find(c => c._id === budget.categoryId)?.color || '#666666',
      }
    };

    return (
      <BudgetCard
        budget={budgetWithCategory as any}
        onPress={() => handleBudgetPress(budgetWithCategory)}
        onEdit={() => handleEditBudget(budgetWithCategory)}
        onDelete={() => handleDeleteBudget(budgetWithCategory)}
        showActions
      />
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    console.error('❌ Erro ao carregar orçamentos:', error);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header
          title="Orçamentos"
          rightElement={
            <TouchableOpacity onPress={handleCreateBudget}>
              <Ionicons name="add" size={24} color={themeConfig.colors.primary} />
            </TouchableOpacity>
          }
        />
        <EmptyState
          icon="alert-circle"
          title="Erro ao carregar"
          description="Não foi possível carregar os orçamentos"
          buttonTitle="Tentar Novamente"
          onButtonPress={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="Orçamentos"
        rightElement={
          <TouchableOpacity onPress={handleCreateBudget}>
            <Ionicons name="add" size={24} color={themeConfig.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* ✅ Estatísticas Gerais */}
      {(totalStats.activeBudgetsCount > 0 || totalStats.pausedBudgetsCount > 0) && (
        <Card style={styles.statsCard}>
          <Text style={[styles.statsTitle, { color: themeConfig.colors.text }]}>
            📊 Resumo Geral
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeConfig.colors.success }]}>
                {formatCurrency(totalStats.totalBudget)}
              </Text>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Total Orçado
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeConfig.colors.warning }]}>
                {formatCurrency(totalStats.totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Total Gasto
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
                {totalStats.spentPercentage.toFixed(1)}%
              </Text>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Utilizado
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeConfig.colors.primary }]}>
                {totalStats.activeBudgetsCount}
              </Text>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Ativos
              </Text>
            </View>
          </View>
          
          {/* ✅ Mostrar contador de pausados se houver */}
          {totalStats.pausedBudgetsCount > 0 && (
            <View style={styles.pausedInfo}>
              <Text style={[styles.pausedText, { color: themeConfig.colors.textSecondary }]}>
                {totalStats.pausedBudgetsCount} orçamento{totalStats.pausedBudgetsCount > 1 ? 's' : ''} pausado{totalStats.pausedBudgetsCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          {(totalStats.exceededCount > 0 || totalStats.warningCount > 0) && (
            <View style={styles.alertsContainer}>
              {totalStats.exceededCount > 0 && (
                <View style={[styles.alertBadge, { backgroundColor: themeConfig.colors.error + '20' }]}>
                  <Ionicons name="warning" size={14} color={themeConfig.colors.error} />
                  <Text style={[styles.alertText, { color: themeConfig.colors.error }]}>
                    {totalStats.exceededCount} estourado{totalStats.exceededCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {totalStats.warningCount > 0 && (
                <View style={[styles.alertBadge, { backgroundColor: themeConfig.colors.warning + '20' }]}>
                  <Ionicons name="alert-circle" size={14} color={themeConfig.colors.warning} />
                  <Text style={[styles.alertText, { color: themeConfig.colors.warning }]}>
                    {totalStats.warningCount} no limite
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      )}

      {/* Filtros */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScrollView}
      >
        {filterOptions.map(renderFilterButton)}
      </ScrollView>

      {/* Lista de Orçamentos */}
      {filteredBudgets.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="Nenhum orçamento encontrado"
          description={
            selectedFilter === 'all' 
              ? "Comece criando seu primeiro orçamento para controlar seus gastos"
              : `Nenhum orçamento ${filterOptions.find(f => f.value === selectedFilter)?.label.toLowerCase()} encontrado`
          }
          buttonTitle="Criar Orçamento"
          onButtonPress={handleCreateBudget}
        />
      ) : (
        <FlatList
          data={filteredBudgets}
          renderItem={renderBudgetItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  pausedInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  pausedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  alertsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    justifyContent: 'center',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filtersScrollView: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 80, // ✅ Largura mínima para manter consistência
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
});