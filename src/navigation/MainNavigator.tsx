import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens das Tabs Principais
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import BudgetsScreen from '../screens/main/BudgetsScreen';
import GoalsScreen from '../screens/main/GoalsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Screens de Transações
import AddTransactionScreen from '../screens/main/AddTransactionScreen';
import EditTransactionScreen from '../screens/main/EditTransactionScreen';
// 🔥 CORRIGIDO: Import correto do TransactionDetail
import TransactionDetailScreen from '../screens/main/TransactionDetail';

// Screens de Orçamentos
import AddBudgetScreen from '../screens/main/AddBudgetScreen';
import EditBudgetScreen from '../screens/main/EditBudgetScreen';
// 🔥 CORRIGIDO: Import correto do BudgetDetail
import BudgetDetailScreen from '../screens/main/BudgetDetail';

// Screens de Metas
import AddGoalScreen from '../screens/main/AddGoalScreen';
import EditGoalScreen from '../screens/main/EditGoalScreen';
// 🔥 CORRIGIDO: Import correto do GoalDetail
import GoalDetailScreen from '../screens/main/GoalDetail';

// Screens de Relatórios e Configurações
import ReportsScreen from '../screens/main/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';

// Screen de Gerenciamento de Categorias
// 🔥 CORRIGIDO: Import correto do CategoryManagement
import CategoryManagementScreen from '../screens/settings/CategoryManagement';

import { useThemeStore } from '../store/themeStore';
import { getTheme } from '../styles/theme';
import type { MainTabParamList, MainStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Budgets':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Goals':
              iconName = focused ? 'flag' : 'flag-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeConfig.colors.primary,
        tabBarInactiveTintColor: themeConfig.colors.text + '80',
        tabBarStyle: {
          backgroundColor: themeConfig.colors.card,
          borderTopColor: themeConfig.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ tabBarLabel: 'Transações' }}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsScreen}
        options={{ tabBarLabel: 'Orçamentos' }}
      />
      <Tab.Screen 
        name="Goals" 
        component={GoalsScreen}
        options={{ tabBarLabel: 'Metas' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tabs Principais */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      
      {/* 💰 TRANSAÇÕES */}
      <Stack.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom' 
        }}
      />
      <Stack.Screen 
        name="EditTransaction" 
        component={EditTransactionScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />

      {/* 💼 ORÇAMENTOS */}
      <Stack.Screen 
        name="AddBudget" 
        component={AddBudgetScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="EditBudget" 
        component={EditBudgetScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="BudgetDetail" 
        component={BudgetDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />

      {/* 🎯 METAS */}
      <Stack.Screen 
        name="AddGoal" 
        component={AddGoalScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="EditGoal" 
        component={EditGoalScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="GoalDetail" 
        component={GoalDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />

      {/* 📊 RELATÓRIOS */}
      <Stack.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />

      {/* ⚙️ CONFIGURAÇÕES */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      {/* 🔥 CORRIGIDO: Nome correto da tela */}
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />

      {/* 🏷️ GERENCIAMENTO DE CATEGORIAS */}
      <Stack.Screen 
        name="CategoryManagement" 
        component={CategoryManagementScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
}