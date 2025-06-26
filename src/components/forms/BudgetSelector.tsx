// src/components/forms/BudgetSelector.tsx - VERSÃO COMPLETA E FUNCIONANDO

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';

interface BudgetSelectorProps {
  selectedBudgetId?: string;
  transactionType: 'income' | 'expense';
  categoryId?: string;
  transactionAmount?: number;
  onBudgetSelect: (budgetId: string | undefined, budgetData?: any) => void;
  disabled?: boolean;
}

export default function BudgetSelector({
  selectedBudgetId,
  transactionType,
  categoryId,
  transactionAmount = 0,
  onBudgetSelect,
  disabled = false,
}: BudgetSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [availableBudgets, setAvailableBudgets] = useState<any[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  // Buscar todos os orçamentos ativos
  const { data: budgetsResponse, isLoading } = useQuery({
    queryKey: ['budgets-active'],
    queryFn: () => budgetService.getBudgets({ status: 'active' }),
    enabled: transactionType === 'expense',
    staleTime: 30000, // 30 segundos
  });

  // Filtrar e processar orçamentos quando dados mudarem
  useEffect(() => {
    if (!budgetsResponse?.data?.budgets) {
      setAvailableBudgets([]);
      return;
    }

    const allBudgets = budgetsResponse.data.budgets;
    
    // Filtrar orçamentos compatíveis
    const filtered = allBudgets.filter(budget => {
      // Verificar se está ativo
      if (!budget.isActive) return false;
      
      // Verificar período (data atual entre início e fim)
      const now = new Date();
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      
      if (now < startDate || now > endDate) return false;
      
      // Verificar categoria se fornecida
      if (categoryId && budget.categoryId !== categoryId) return false;
      
      return true;
    });

    setAvailableBudgets(filtered);
  }, [budgetsResponse, categoryId]);

  // Atualizar orçamento selecionado quando ID mudar
  useEffect(() => {
    if (selectedBudgetId && availableBudgets.length > 0) {
      const budget = availableBudgets.find(b => b._id === selectedBudgetId);
      setSelectedBudget(budget || null);
    } else {
      setSelectedBudget(null);
    }
  }, [selectedBudgetId, availableBudgets]);

  // Se for receita, não mostrar
  if (transactionType === 'income') {
    return null;
  }

  const handleBudgetSelect = (budget: any) => {
    const isSelected = selectedBudgetId === budget._id;
    
    if (isSelected) {
      // Deselecionar
      onBudgetSelect(undefined, undefined);
    } else {
      // Selecionar
      onBudgetSelect(budget._id, budget);
    }
    
    setModalVisible(false);
  };

  const renderBudgetItem = ({ item }: { item: any }) => {
    const isSelected = selectedBudgetId === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.budgetItem,
          {
            backgroundColor: isSelected 
              ? themeConfig.colors.primary + '15'
              : themeConfig.colors.card,
            borderColor: isSelected 
              ? themeConfig.colors.primary
              : themeConfig.colors.border,
          },
        ]}
        onPress={() => handleBudgetSelect(item)}
      >
        <View style={styles.budgetContent}>
          <View style={styles.budgetInfo}>
            <Text style={[styles.budgetName, { color: themeConfig.colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.budgetAmount, { color: themeConfig.colors.textSecondary }]}>
              Valor: {formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.budgetPeriod, { color: themeConfig.colors.textSecondary }]}>
              Período: {item.period === 'weekly' ? 'Semanal' : item.period === 'monthly' ? 'Mensal' : item.period === 'quarterly' ? 'Trimestral' : 'Anual'}
            </Text>
          </View>

          {isSelected && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={themeConfig.colors.primary} 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusText = () => {
    if (isLoading) return 'Carregando orçamentos...';
    
    if (selectedBudget) {
      return `${selectedBudget.name} - ${formatCurrency(selectedBudget.amount)}`;
    }
    
    if (availableBudgets.length > 0) {
      return `${availableBudgets.length} orçamento(s) disponível(eis) - Toque para selecionar`;
    }
    
    if (categoryId) {
      return 'Nenhum orçamento ativo para esta categoria';
    }
    
    return 'Selecione uma categoria primeiro';
  };

  const canOpen = !isLoading && availableBudgets.length > 0;

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.triggerButton,
          {
            backgroundColor: selectedBudget 
              ? themeConfig.colors.primary + '15'
              : themeConfig.colors.card,
            borderColor: selectedBudget 
              ? themeConfig.colors.primary
              : themeConfig.colors.border,
          },
        ]}
        onPress={() => {
          if (!canOpen) {
            if (!categoryId) {
              Alert.alert(
                'Selecione uma categoria',
                'Primeiro selecione uma categoria para ver os orçamentos disponíveis.'
              );
            } else if (availableBudgets.length === 0) {
              Alert.alert(
                'Nenhum orçamento disponível',
                'Não há orçamentos ativos para esta categoria no momento.'
              );
            }
            return;
          }
          setModalVisible(true);
        }}
        disabled={disabled}
      >
        <View style={styles.triggerContent}>
          <Ionicons 
            name="wallet-outline" 
            size={20} 
            color={selectedBudget ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
          />
          
          <View style={styles.triggerTextContainer}>
            <Text style={[styles.triggerLabel, { color: themeConfig.colors.textSecondary }]}>
              💰 Orçamento (Opcional)
            </Text>
            
            <Text style={[
              styles.triggerValue,
              { 
                color: selectedBudget 
                  ? themeConfig.colors.text 
                  : themeConfig.colors.textSecondary 
              }
            ]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        
        <Ionicons 
          name={selectedBudget ? "checkmark-circle" : canOpen ? "chevron-forward" : "information-circle-outline"} 
          size={20} 
          color={selectedBudget ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
        />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeConfig.colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeConfig.colors.border }]}>
            <Text style={[styles.modalTitle, { color: themeConfig.colors.text }]}>
              Selecionar Orçamento
            </Text>
            
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={themeConfig.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Lista de Orçamentos */}
          {availableBudgets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={themeConfig.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: themeConfig.colors.text }]}>
                Nenhum orçamento disponível
              </Text>
              <Text style={[styles.emptyDescription, { color: themeConfig.colors.textSecondary }]}>
                Crie orçamentos para organizar melhor seus gastos
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableBudgets}
              renderItem={renderBudgetItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.budgetsList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: themeConfig.colors.border }]}>
            {selectedBudgetId && (
              <Button
                title="Remover Seleção"
                variant="outline"
                onPress={() => {
                  onBudgetSelect(undefined, undefined);
                  setModalVisible(false);
                }}
                style={styles.footerButton}
              />
            )}
            
            <Button
              title="Fechar"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  triggerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  triggerValue: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  budgetsList: {
    padding: 16,
  },
  budgetItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  budgetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 14,
    marginBottom: 2,
  },
  budgetPeriod: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});