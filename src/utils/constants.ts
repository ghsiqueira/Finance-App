// src/utils/constants.ts

// Tipos de transação
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

// Métodos de pagamento
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  PIX: 'pix',
  OTHER: 'other',
} as const;

// Status de transação
export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;

// Períodos de orçamento
export const BUDGET_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

// Prioridades de meta
export const GOAL_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// Status de meta
export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

// Tipos de categoria
export const CATEGORY_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income',
  BOTH: 'both',
} as const;

// Configurações de cache
export const CACHE_KEYS = {
  DASHBOARD: 'dashboard',
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  GOALS: 'goals',
  CATEGORIES: 'categories',
  USER_PROFILE: 'user_profile',
} as const;

// Limites de paginação
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 5,
} as const;

// Cores padrão para categorias
export const DEFAULT_CATEGORY_COLORS = [
  '#FF6B6B', // Vermelho
  '#4ECDC4', // Turquesa
  '#45B7D1', // Azul
  '#96CEB4', // Verde claro
  '#FFEAA7', // Amarelo
  '#DDA0DD', // Roxo claro
  '#FFB6C1', // Rosa
  '#A8A8A8', // Cinza
  '#00B894', // Verde
  '#6C5CE7', // Roxo
  '#FD79A8', // Rosa escuro
  '#74B9FF', // Azul claro
] as const;

// Ícones padrão para categorias
export const DEFAULT_CATEGORY_ICONS = {
  FOOD: 'restaurant',
  TRANSPORT: 'car',
  HEALTH: 'medical',
  EDUCATION: 'school',
  ENTERTAINMENT: 'game-controller',
  HOME: 'home',
  CLOTHING: 'shirt',
  OTHER_EXPENSE: 'ellipsis-horizontal',
  SALARY: 'cash',
  FREELANCE: 'briefcase',
  INVESTMENT: 'trending-up',
  OTHER_INCOME: 'add-circle',
} as const;

// Configurações de validação
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 100,
  MAX_NOTES_LENGTH: 500,
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999,
} as const;

// Formatos de data
export const DATE_FORMATS = {
  SHORT: 'dd/MM',
  MEDIUM: 'dd/MM/yyyy',
  LONG: 'dd \'de\' MMMM \'de\' yyyy',
  DATETIME: 'dd/MM/yyyy HH:mm',
} as const;

// Configurações de tema
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Moedas suportadas
export const SUPPORTED_CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
] as const;

// Idiomas suportados
export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español' },
] as const;

// Configurações de notificação
export const NOTIFICATION_TYPES = {
  BUDGET_ALERT: 'budget_alert',
  GOAL_REMINDER: 'goal_reminder',
  TRANSACTION_ADDED: 'transaction_added',
} as const;

// Configurações de sincronização
export const SYNC_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  OFFLINE_QUEUE_LIMIT: 100,
} as const;