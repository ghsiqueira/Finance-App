export const formatCurrency = (
  value: number,
  currency: string = 'BRL',
  locale: string = 'pt-BR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (
  value: number,
  locale: string = 'pt-BR'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (
  value: number,
  locale: string = 'pt-BR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export const formatDate = (
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium',
  locale: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
      });
    case 'long':
      return dateObj.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    default: 
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
};

export const formatDateTime = (
  date: string | Date,
  locale: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (
  date: string | Date,
  locale: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Agora';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m atrás`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h atrás`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d atrás`;
  } else {
    return formatDate(dateObj, 'short', locale);
  }
};

// 🔥 CORREÇÃO: parseNumber funcionando corretamente
export const parseNumber = (value: string): number => {
  if (!value) return 0;
  
  // Remove todos os caracteres exceto dígitos, vírgula e ponto
  const cleanValue = value.replace(/[^\d,.-]/g, '');
  
  // Substitui vírgula por ponto para normalizar
  const normalizedValue = cleanValue.replace(',', '.');
  
  return parseFloat(normalizedValue) || 0;
};

// 🔥 CORREÇÃO: formatInputCurrency SEM divisão por 100
export const formatInputCurrency = (value: string): string => {
  if (!value) return '';
  
  // Remove tudo exceto dígitos
  let cleanValue = value.replace(/\D/g, '');
  
  if (!cleanValue) return '';
  
  // 🔥 FIX: NÃO dividir por 100 aqui, pois já vem o valor correto
  const numericValue = parseFloat(cleanValue);
  
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔥 NOVA: Função específica para formatação durante digitação
export const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  
  // Remove tudo exceto dígitos
  const cleanValue = value.replace(/\D/g, '');
  
  if (!cleanValue) return '';
  
  // Converte para centavos e depois para reais
  const numericValue = parseInt(cleanValue, 10) / 100;
  
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const abbreviateNumber = (value: number): string => {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const suffixNum = Math.floor(Math.log10(Math.abs(value)) / 3);
  const shortValue = value / Math.pow(1000, suffixNum);
  
  if (suffixNum === 0) {
    return value.toString();
  }
  
  return shortValue.toFixed(1) + suffixes[suffixNum];
};

// 🔥 NOVA: Função para converter valor formatado de volta para número
export const parseCurrencyToNumber = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove símbolos de moeda e formatação, mantém apenas dígitos e vírgula/ponto
  const cleanValue = currencyString
    .replace(/[R$\s]/g, '') // Remove R$ e espaços
    .replace(/\./g, '')      // Remove pontos (separadores de milhares)
    .replace(',', '.');      // Converte vírgula decimal para ponto
  
  return parseFloat(cleanValue) || 0;
};