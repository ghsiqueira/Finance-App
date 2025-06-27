// src/navigation/types.ts - TIPOS CORRIGIDOS

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Goals: undefined;
  Profile: undefined;
};

// ✅ CORREÇÃO: Interface para dados de template/duplicação
interface BudgetTemplateData {
  name?: string;
  amount?: number;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  alertThreshold?: number;
  notes?: string;
}

// ✅ CORREÇÃO: MainStackParamList com tipos corretos
export type MainStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList }; 
  
  // Transações
  AddTransaction: {
    type?: 'income' | 'expense';
    initialData?: {
      description: string;
      amount: string;
      categoryId: string;
      notes?: string;
      paymentMethod: string;
    };
  } | undefined;
  EditTransaction: { transactionId: string };
  TransactionDetail: { transactionId: string };
  
  // ✅ CORREÇÃO: Orçamentos com templateData ao invés de duplicateData
  AddBudget: { 
    categoryId?: string;
    templateData?: BudgetTemplateData;
  } | undefined;
  EditBudget: { budgetId: string };
  BudgetDetail: { budgetId: string };
  
  // Metas
  AddGoal: undefined;
  EditGoal: { goalId: string };
  GoalDetail: { goalId: string };
  
  // Relatórios e Configurações
  Reports: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  
  // Gerenciamento
  CategoryManagement: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

export type AuthStackScreenProps<Screen extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, Screen>;

export type MainTabScreenProps<Screen extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, Screen>,
    NativeStackScreenProps<MainStackParamList>
  >;

export type MainStackScreenProps<Screen extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, Screen>;

// Global declaration para React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}