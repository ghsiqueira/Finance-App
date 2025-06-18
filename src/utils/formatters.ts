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

export const parseNumber = (value: string): number => {
  const cleanValue = value.replace(/[^\d,.-]/g, '');
  
  const normalizedValue = cleanValue.replace(',', '.');
  
  return parseFloat(normalizedValue) || 0;
};

export const formatInputCurrency = (value: string): string => {
  let cleanValue = value.replace(/[^\d,]/g, '');
  
  if (!cleanValue) return '';
  
  const numericValue = parseFloat(cleanValue.replace(',', '.')) / 100;
  
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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