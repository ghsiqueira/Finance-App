// Atualização para src/navigation/types.ts
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

export type MainStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList }; 
  AddTransaction: {
    type?: 'income' | 'expense';
    initialData?: {
      description: string;
      amount: string;
      categoryId: string;
      notes?: string;
      paymentMethod: string;
    };
  };
  EditTransaction: { transactionId: string };
  AddBudget: undefined;
  EditBudget: { budgetId: string };
  AddGoal: undefined;
  EditGoal: { goalId: string };
  Reports: undefined;
  Settings: undefined;
  EditProfile: undefined;
  TransactionDetail: { transactionId: string };
  BudgetDetail: { budgetId: string };
  GoalDetail: { goalId: string };
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

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}