// src/utils/validators.ts
import * as yup from 'yup';
import { VALIDATION, PAYMENT_METHODS, TRANSACTION_TYPES } from './constants';

// Validação de email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de senha
export const isValidPassword = (password: string): boolean => {
  return password.length >= VALIDATION.MIN_PASSWORD_LENGTH;
};

// Validação de valor monetário
export const isValidAmount = (amount: number): boolean => {
  return amount >= VALIDATION.MIN_AMOUNT && amount <= VALIDATION.MAX_AMOUNT;
};

// Validação de cor hexadecimal
export const isValidHexColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// Schemas de validação com Yup

// Schema para login
export const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email inválido'),
  password: yup
    .string()
    .required('Senha é obrigatória')
    .min(VALIDATION.MIN_PASSWORD_LENGTH, `Senha deve ter no mínimo ${VALIDATION.MIN_PASSWORD_LENGTH} caracteres`),
});

// Schema para registro
export const registerSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(VALIDATION.MAX_NAME_LENGTH, `Nome deve ter no máximo ${VALIDATION.MAX_NAME_LENGTH} caracteres`),
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email inválido'),
  password: yup
    .string()
    .required('Senha é obrigatória')
    .min(VALIDATION.MIN_PASSWORD_LENGTH, `Senha deve ter no mínimo ${VALIDATION.MIN_PASSWORD_LENGTH} caracteres`),
  confirmPassword: yup
    .string()
    .required('Confirmação de senha é obrigatória')
    .oneOf([yup.ref('password')], 'Senhas não conferem'),
});

// Schema para esqueci a senha
export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email inválido'),
});

// Schema para reset de senha
export const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .required('Senha é obrigatória')
    .min(VALIDATION.MIN_PASSWORD_LENGTH, `Senha deve ter no mínimo ${VALIDATION.MIN_PASSWORD_LENGTH} caracteres`),
  confirmPassword: yup
    .string()
    .required('Confirmação de senha é obrigatória')
    .oneOf([yup.ref('password')], 'Senhas não conferem'),
});

// Schema para transação
export const transactionSchema = yup.object().shape({
  description: yup
    .string()
    .required('Descrição é obrigatória')
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(VALIDATION.MAX_DESCRIPTION_LENGTH, `Descrição deve ter no máximo ${VALIDATION.MAX_DESCRIPTION_LENGTH} caracteres`),
  amount: yup
    .string()
    .required('Valor é obrigatório')
    .test('is-valid-amount', 'Valor deve ser maior que zero', (value) => {
      if (!value) return false;
      const numValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      return isValidAmount(numValue);
    }),
  type: yup
    .string()
    .required('Tipo é obrigatório')
    .oneOf(Object.values(TRANSACTION_TYPES), 'Tipo inválido'),
  categoryId: yup
    .string()
    .optional()
    .nullable()
    .transform((value) => value === '' ? undefined : value),
  date: yup
    .date()
    .required('Data é obrigatória')
    .max(new Date(), 'Data não pode ser futura'),
  notes: yup
    .string()
    .optional()
    .nullable()
    .transform((value) => value === '' ? undefined : value)
    .max(VALIDATION.MAX_NOTES_LENGTH, `Notas devem ter no máximo ${VALIDATION.MAX_NOTES_LENGTH} caracteres`),
  paymentMethod: yup
    .string()
    .required('Método de pagamento é obrigatório')
    .oneOf(Object.values(PAYMENT_METHODS), 'Método de pagamento inválido'),
});

// Schema para orçamento
export const budgetSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  amount: yup
    .string()
    .required('Valor é obrigatório')
    .test('is-valid-amount', 'Valor deve ser maior que zero', (value) => {
      if (!value) return false;
      const numValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      return isValidAmount(numValue);
    }),
  categoryId: yup
    .string()
    .required('Categoria é obrigatória'),
  period: yup
    .string()
    .required('Período é obrigatório')
    .oneOf(['weekly', 'monthly', 'quarterly', 'yearly'], 'Período inválido'),
  startDate: yup
    .date()
    .required('Data de início é obrigatória'),
  endDate: yup
    .date()
    .required('Data de fim é obrigatória')
    .min(yup.ref('startDate'), 'Data de fim deve ser posterior à data de início'),
  alertThreshold: yup
    .number()
    .optional()
    .min(0, 'Limite de alerta deve ser maior ou igual a 0')
    .max(100, 'Limite de alerta deve ser menor ou igual a 100'),
  notes: yup
    .string()
    .optional()
    .max(200, 'Notas devem ter no máximo 200 caracteres'),
  color: yup
    .string()
    .optional()
    .test('is-valid-color', 'Cor deve estar no formato hexadecimal', (value) => {
      if (!value) return true;
      return isValidHexColor(value);
    }),
});

// Schema para meta
export const goalSchema = yup.object({
  title: yup
    .string()
    .required('Título é obrigatório')
    .trim()
    .min(1, 'Título é obrigatório')
    .max(50, 'Título deve ter no máximo 50 caracteres'),
  description: yup
    .string()
    .optional()
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  targetAmount: yup
    .string()
    .required('Valor da meta é obrigatório')
    .test('is-valid-amount', 'Valor deve ser maior que zero', (value) => {
      if (!value) return false;
      const numValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      return isValidAmount(numValue);
    }),
  targetDate: yup
    .date()
    .required('Data da meta é obrigatória')
    .min(new Date(), 'Data da meta deve ser futura'),
  categoryId: yup
    .string()
    .optional(),
  priority: yup
    .string()
    .optional()
    .oneOf(['low', 'medium', 'high'], 'Prioridade inválida'),
  color: yup
    .string()
    .optional()
    .test('is-valid-color', 'Cor deve estar no formato hexadecimal', (value) => {
      if (!value) return true;
      return isValidHexColor(value);
    }),
});

// Schema para categoria
export const categorySchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(30, 'Nome deve ter no máximo 30 caracteres'),
  icon: yup
    .string()
    .optional(),
  color: yup
    .string()
    .optional()
    .test('is-valid-color', 'Cor deve estar no formato hexadecimal', (value) => {
      if (!value) return true;
      return isValidHexColor(value);
    }),
  type: yup
    .string()
    .optional()
    .oneOf(['expense', 'income', 'both'], 'Tipo inválido'),
  description: yup
    .string()
    .optional()
    .max(100, 'Descrição deve ter no máximo 100 caracteres'),
});

// Schema para perfil do usuário
export const profileSchema = yup.object({
  name: yup
    .string()
    .optional()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(VALIDATION.MAX_NAME_LENGTH, `Nome deve ter no máximo ${VALIDATION.MAX_NAME_LENGTH} caracteres`),
  email: yup
    .string()
    .optional()
    .email('Email inválido'),
  currency: yup
    .string()
    .optional()
    .length(3, 'Código da moeda deve ter 3 caracteres'),
  theme: yup
    .string()
    .optional()
    .oneOf(['light', 'dark'], 'Tema inválido'),
});

// Schema para mudança de senha
export const changePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Senha atual é obrigatória'),
  newPassword: yup
    .string()
    .required('Nova senha é obrigatória')
    .min(VALIDATION.MIN_PASSWORD_LENGTH, `Nova senha deve ter no mínimo ${VALIDATION.MIN_PASSWORD_LENGTH} caracteres`),
  confirmPassword: yup
    .string()
    .required('Confirmação de senha é obrigatória')
    .oneOf([yup.ref('newPassword')], 'Senhas não conferem'),
});