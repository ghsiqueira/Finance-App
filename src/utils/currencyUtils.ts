// src/utils/currencyUtils.ts - Utilitários de Moeda Corrigidos

/**
 * Converte string formatada de moeda para número
 * Ex: "R$ 1.500,50" -> 1500.50
 */
export const currencyToNumber = (currencyString: string): number => {
  if (!currencyString || typeof currencyString !== 'string') return 0;
  
  // Remove símbolos de moeda, espaços e letras
  const cleanValue = currencyString
    .replace(/[R$\s]/g, '') // Remove R$, espaços
    .replace(/\./g, '')      // Remove pontos (separadores de milhares)
    .replace(',', '.');      // Converte vírgula decimal para ponto
  
  const number = parseFloat(cleanValue) || 0;
  return isNaN(number) ? 0 : number;
};

/**
 * Converte número para string formatada de moeda
 * Ex: 1500.50 -> "R$ 1.500,50"
 */
export const numberToCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) value = 0;
  
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata input de moeda enquanto o usuário digita
 * Ex: "15000" -> "R$ 150,00"
 */
export const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para centavos
  const amount = parseInt(numbers, 10) / 100;
  
  return numberToCurrency(amount);
};

/**
 * Máscara para input de moeda (para React Native TextInput)
 */
export const applyCurrencyMask = (value: string, previousValue: string = ''): string => {
  // Se está apagando e chegou em "R$ 0,00", limpa o campo
  if (value === 'R$ 0,00' && previousValue.length > value.length) {
    return '';
  }
  
  return formatCurrencyInput(value);
};

/**
 * Valida se o valor de moeda é válido
 */
export const isValidCurrency = (value: string): boolean => {
  const number = currencyToNumber(value);
  return number >= 0 && number <= 999999999; // Limite máximo
};

/**
 * Formata valor para exibição compacta
 * Ex: 1500000 -> "1,5M"
 */
export const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  } else {
    return numberToCurrency(value);
  }
};

/**
 * Remove formatação de moeda para API
 */
export const prepareCurrencyForAPI = (value: string): number => {
  return currencyToNumber(value);
};

/**
 * Prepara valor da API para exibição
 */
export const prepareCurrencyFromAPI = (value: number): string => {
  return numberToCurrency(value);
};

// Exportar como default também
export default {
  currencyToNumber,
  numberToCurrency,
  formatCurrencyInput,
  applyCurrencyMask,
  isValidCurrency,
  formatCompactCurrency,
  prepareCurrencyForAPI,
  prepareCurrencyFromAPI,
};