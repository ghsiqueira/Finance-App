// src/utils/dateUtils.ts - ARQUIVO COMPLETO COM VALIDAÇÕES

import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  differenceInDays, 
  differenceInWeeks, 
  differenceInMonths, 
  isAfter, 
  isBefore, 
  isSameDay, 
  parseISO,
  isValid,
  isToday,
  isYesterday,
  isTomorrow,
  startOfDay,
  endOfDay,
  getYear,
  getMonth,
  getDate
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ===== INTERFACES =====
export interface DateValidationResult {
  isValid: boolean;
  date?: Date;
  error?: string;
}

export interface DateRangeValidationResult {
  isValid: boolean;
  startDate?: Date;
  endDate?: Date;
  error?: string;
}

export interface DatePeriod {
  start: Date;
  end: Date;
}

// ===== VALIDAÇÃO DE DATAS =====

/**
 * Valida se uma data é válida
 */
export const validateDate = (date: any): DateValidationResult => {
  try {
    if (!date) {
      return { isValid: false, error: 'Data não fornecida' };
    }

    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Tentar parsear diferentes formatos
      if (date.includes('T') || date.includes('Z')) {
        // ISO string
        dateObj = parseISO(date);
      } else {
        // Outros formatos
        dateObj = new Date(date);
      }
    } else if (typeof date === 'number') {
      // Timestamp
      dateObj = new Date(date);
    } else {
      return { isValid: false, error: 'Formato de data não suportado' };
    }

    if (!isValid(dateObj)) {
      return { isValid: false, error: 'Data inválida' };
    }

    // Verificar se a data não é muito antiga ou muito futura
    const minDate = new Date(1900, 0, 1);
    const maxDate = new Date(2100, 11, 31);

    if (dateObj < minDate) {
      return { isValid: false, error: 'Data muito antiga (anterior a 1900)' };
    }

    if (dateObj > maxDate) {
      return { isValid: false, error: 'Data muito futura (posterior a 2100)' };
    }

    return { isValid: true, date: dateObj };
  } catch (error) {
    console.error('Erro ao validar data:', error);
    return { isValid: false, error: 'Erro ao processar data' };
  }
};

/**
 * Valida um intervalo de datas
 */
export const validateDateRange = (startDate: any, endDate: any): DateRangeValidationResult => {
  const startValidation = validateDate(startDate);
  const endValidation = validateDate(endDate);

  if (!startValidation.isValid) {
    return { isValid: false, error: `Data de início: ${startValidation.error}` };
  }

  if (!endValidation.isValid) {
    return { isValid: false, error: `Data de fim: ${endValidation.error}` };
  }

  const start = startValidation.date!;
  const end = endValidation.date!;

  if (end <= start) {
    return { isValid: false, error: 'Data de fim deve ser posterior à data de início' };
  }

  // Verificar se o período não é muito longo
  const diffDays = differenceInDays(end, start);
  if (diffDays > 3650) { // 10 anos
    return { isValid: false, error: 'Período muito longo (máximo 10 anos)' };
  }

  if (diffDays < 1) {
    return { isValid: false, error: 'Período muito curto (mínimo 1 dia)' };
  }

  return { 
    isValid: true, 
    startDate: start, 
    endDate: end 
  };
};

/**
 * Converte data para ISO string de forma segura
 */
export const safeDateToISOString = (date: any): string | null => {
  const validation = validateDate(date);
  return validation.isValid ? validation.date!.toISOString() : null;
};

// ===== FORMATAÇÃO DE DATAS =====

export const formatDate = (
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Data inválida';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

export const formatDateTime = (
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Data inválida';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return 'Data inválida';
  }
};

export const formatRelativeTime = (
  date: string | Date,
  locale: string = 'pt-BR'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Data inválida';
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (isToday(dateObj)) {
      if (diffInMinutes < 1) return 'Agora';
      if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
      if (diffInHours < 24) return `${diffInHours}h atrás`;
      return 'Hoje';
    } else if (isYesterday(dateObj)) {
      return 'Ontem';
    } else if (isTomorrow(dateObj)) {
      return 'Amanhã';
    } else if (diffInDays < 7 && diffInDays > 0) {
      return `${diffInDays}d atrás`;
    } else if (diffInDays < -1 && diffInDays > -7) {
      return `Em ${Math.abs(diffInDays)} dias`;
    } else {
      return formatDate(dateObj, 'dd/MM');
    }
  } catch (error) {
    console.error('Erro ao formatar tempo relativo:', error);
    return 'Data inválida';
  }
};

// ===== PERÍODOS PADRÃO =====

export const getCurrentWeek = (): DatePeriod => {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Segunda-feira
    end: endOfWeek(now, { weekStartsOn: 1 }), // Domingo
  };
};

export const getCurrentMonth = (): DatePeriod => {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const getCurrentYear = (): DatePeriod => {
  const now = new Date();
  return {
    start: startOfYear(now),
    end: endOfYear(now),
  };
};

export const getLastMonth = (): DatePeriod => {
  const now = new Date();
  const lastMonth = addMonths(now, -1);
  return {
    start: startOfMonth(lastMonth),
    end: endOfMonth(lastMonth),
  };
};

export const getLastWeek = (): DatePeriod => {
  const now = new Date();
  const lastWeek = addWeeks(now, -1);
  return {
    start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
    end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
  };
};

export const getYearToDate = (): DatePeriod => {
  const now = new Date();
  return {
    start: startOfYear(now),
    end: now,
  };
};

// ===== CÁLCULOS DE PERÍODO =====

export const getBudgetPeriod = (
  startDate: Date,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): DatePeriod => {
  let endDate: Date;

  switch (period) {
    case 'weekly':
      endDate = addWeeks(startDate, 1);
      break;
    case 'monthly':
      endDate = addMonths(startDate, 1);
      break;
    case 'quarterly':
      endDate = addMonths(startDate, 3);
      break;
    case 'yearly':
      endDate = addYears(startDate, 1);
      break;
    default:
      endDate = addMonths(startDate, 1);
  }

  return { 
    start: startDate, 
    end: addDays(endDate, -1) // Subtrair 1 dia para não sobrepor
  };
};

export const getNextPeriodDates = (
  currentStart: Date,
  currentEnd: Date,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): DatePeriod => {
  let nextStart: Date;

  switch (period) {
    case 'weekly':
      nextStart = addWeeks(currentStart, 1);
      break;
    case 'monthly':
      nextStart = addMonths(currentStart, 1);
      break;
    case 'quarterly':
      nextStart = addMonths(currentStart, 3);
      break;
    case 'yearly':
      nextStart = addYears(currentStart, 1);
      break;
    default:
      nextStart = addMonths(currentStart, 1);
  }

  return getBudgetPeriod(nextStart, period);
};

export const getPreviousPeriodDates = (
  currentStart: Date,
  currentEnd: Date,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): DatePeriod => {
  let prevStart: Date;

  switch (period) {
    case 'weekly':
      prevStart = addWeeks(currentStart, -1);
      break;
    case 'monthly':
      prevStart = addMonths(currentStart, -1);
      break;
    case 'quarterly':
      prevStart = addMonths(currentStart, -3);
      break;
    case 'yearly':
      prevStart = addYears(currentStart, -1);
      break;
    default:
      prevStart = addMonths(currentStart, -1);
  }

  return getBudgetPeriod(prevStart, period);
};

// ===== VERIFICAÇÕES DE DATA =====

export const isDateInPeriod = (
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const startObj = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const endObj = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (!isValid(dateObj) || !isValid(startObj) || !isValid(endObj)) {
      return false;
    }

    return !isBefore(dateObj, startOfDay(startObj)) && !isAfter(dateObj, endOfDay(endObj));
  } catch (error) {
    console.error('Erro ao verificar se data está no período:', error);
    return false;
  }
};

export const isDateInFuture = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    return isAfter(dateObj, new Date());
  } catch (error) {
    console.error('Erro ao verificar se data é futura:', error);
    return false;
  }
};

export const isDateInPast = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    return isBefore(dateObj, startOfDay(new Date()));
  } catch (error) {
    console.error('Erro ao verificar se data é passada:', error);
    return false;
  }
};

// ===== CÁLCULOS DE DIFERENÇA =====

export const getDaysRemaining = (targetDate: Date | string): number => {
  try {
    const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
    if (!isValid(target)) return 0;
    
    const now = new Date();
    return Math.max(0, differenceInDays(target, now));
  } catch (error) {
    console.error('Erro ao calcular dias restantes:', error);
    return 0;
  }
};

export const getDaysPassed = (startDate: Date | string): number => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    if (!isValid(start)) return 0;
    
    const now = new Date();
    return Math.max(0, differenceInDays(now, start));
  } catch (error) {
    console.error('Erro ao calcular dias passados:', error);
    return 0;
  }
};

export const getWeeksRemaining = (targetDate: Date | string): number => {
  try {
    const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
    if (!isValid(target)) return 0;
    
    const now = new Date();
    return Math.max(0, differenceInWeeks(target, now));
  } catch (error) {
    console.error('Erro ao calcular semanas restantes:', error);
    return 0;
  }
};

export const getMonthsRemaining = (targetDate: Date | string): number => {
  try {
    const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
    if (!isValid(target)) return 0;
    
    const now = new Date();
    return Math.max(0, differenceInMonths(target, now));
  } catch (error) {
    console.error('Erro ao calcular meses restantes:', error);
    return 0;
  }
};

export const getAgeInDays = (startDate: Date | string): number => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    if (!isValid(start)) return 0;
    
    return differenceInDays(new Date(), start);
  } catch (error) {
    console.error('Erro ao calcular idade em dias:', error);
    return 0;
  }
};

// ===== LISTAS E OPÇÕES =====

export const getMonthsList = (count: number = 12): Array<{ value: string; label: string }> => {
  const months: Array<{ value: string; label: string }> = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = addMonths(now, -i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yyyy', { locale: ptBR }),
    });
  }

  return months;
};

export const getYearsList = (count: number = 5): number[] => {
  const currentYear = getYear(new Date());
  const years: number[] = [];
  
  for (let i = 0; i < count; i++) {
    years.push(currentYear - i);
  }
  
  return years;
};

export const getQuartersList = (year?: number): Array<{ value: string; label: string; start: Date; end: Date }> => {
  const targetYear = year || getYear(new Date());
  
  return [
    {
      value: `${targetYear}-Q1`,
      label: `Q1 ${targetYear}`,
      start: new Date(targetYear, 0, 1),
      end: new Date(targetYear, 2, 31),
    },
    {
      value: `${targetYear}-Q2`,
      label: `Q2 ${targetYear}`,
      start: new Date(targetYear, 3, 1),
      end: new Date(targetYear, 5, 30),
    },
    {
      value: `${targetYear}-Q3`,
      label: `Q3 ${targetYear}`,
      start: new Date(targetYear, 6, 1),
      end: new Date(targetYear, 8, 30),
    },
    {
      value: `${targetYear}-Q4`,
      label: `Q4 ${targetYear}`,
      start: new Date(targetYear, 9, 1),
      end: new Date(targetYear, 11, 31),
    },
  ];
};

// ===== ANÁLISES E ESTATÍSTICAS =====

export const getMonthProgress = (date?: Date): number => {
  try {
    const targetDate = date || new Date();
    const startOfCurrentMonth = startOfMonth(targetDate);
    const endOfCurrentMonth = endOfMonth(targetDate);
    const totalDays = differenceInDays(endOfCurrentMonth, startOfCurrentMonth) + 1;
    const daysPassed = differenceInDays(targetDate, startOfCurrentMonth) + 1;
    
    return Math.round((daysPassed / totalDays) * 100);
  } catch (error) {
    console.error('Erro ao calcular progresso do mês:', error);
    return 0;
  }
};

export const getYearProgress = (date?: Date): number => {
  try {
    const targetDate = date || new Date();
    const startOfCurrentYear = startOfYear(targetDate);
    const endOfCurrentYear = endOfYear(targetDate);
    const totalDays = differenceInDays(endOfCurrentYear, startOfCurrentYear) + 1;
    const daysPassed = differenceInDays(targetDate, startOfCurrentYear) + 1;
    
    return Math.round((daysPassed / totalDays) * 100);
  } catch (error) {
    console.error('Erro ao calcular progresso do ano:', error);
    return 0;
  }
};

export const getWeekProgress = (date?: Date): number => {
  try {
    const targetDate = date || new Date();
    const startOfCurrentWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(targetDate, { weekStartsOn: 1 });
    const totalDays = differenceInDays(endOfCurrentWeek, startOfCurrentWeek) + 1;
    const daysPassed = differenceInDays(targetDate, startOfCurrentWeek) + 1;
    
    return Math.round((daysPassed / totalDays) * 100);
  } catch (error) {
    console.error('Erro ao calcular progresso da semana:', error);
    return 0;
  }
};

export const getPeriodProgress = (
  startDate: Date | string,
  endDate: Date | string,
  currentDate?: Date
): number => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    const current = currentDate || new Date();

    if (!isValid(start) || !isValid(end)) return 0;

    const totalDays = differenceInDays(end, start);
    const daysPassed = Math.min(totalDays, Math.max(0, differenceInDays(current, start)));
    
    return totalDays > 0 ? Math.round((daysPassed / totalDays) * 100) : 0;
  } catch (error) {
    console.error('Erro ao calcular progresso do período:', error);
    return 0;
  }
};

// ===== DATAS ESPECIAIS =====

export const getUpcomingDates = (dates: string[], days: number = 7): string[] => {
  try {
    const now = new Date();
    const futureDate = addDays(now, days);
    
    return dates.filter(dateStr => {
      const date = parseISO(dateStr);
      return isValid(date) && isAfter(date, now) && !isAfter(date, futureDate);
    }).sort();
  } catch (error) {
    console.error('Erro ao filtrar datas próximas:', error);
    return [];
  }
};

export const getOverdueDates = (dates: string[]): string[] => {
  try {
    const now = new Date();
    
    return dates.filter(dateStr => {
      const date = parseISO(dateStr);
      return isValid(date) && isBefore(date, startOfDay(now));
    }).sort();
  } catch (error) {
    console.error('Erro ao filtrar datas vencidas:', error);
    return [];
  }
};

// ===== UTILITÁRIOS DE FORMATAÇÃO =====

export const isValidDate = (date: any): boolean => {
  try {
    if (date instanceof Date) {
      return isValid(date);
    }
    if (typeof date === 'string') {
      return isValid(parseISO(date));
    }
    if (typeof date === 'number') {
      return isValid(new Date(date));
    }
    return false;
  } catch {
    return false;
  }
};

export const parseDate = (dateString: string): Date | null => {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getMonthBounds = (date: Date): DatePeriod => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const getWeekBounds = (date: Date): DatePeriod => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
};

export const getYearBounds = (date: Date): DatePeriod => {
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  };
};

// ===== CONSTANTES ÚTEIS =====

export const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
} as const;

export const DATE_FORMATS = {
  SHORT: 'dd/MM',
  MEDIUM: 'dd/MM/yyyy',
  LONG: 'dd \'de\' MMMM \'de\' yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd/MM/yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  MONTH_YEAR: 'MMM yyyy',
  WEEK_DAY: 'EEEE',
} as const;

// ===== EXPORT DEFAULT =====

export const dateUtils = {
  // Validação
  validateDate,
  validateDateRange,
  safeDateToISOString,
  isValidDate,
  parseDate,

  // Formatação
  formatDate,
  formatDateTime,
  formatRelativeTime,

  // Períodos padrão
  getCurrentWeek,
  getCurrentMonth,
  getCurrentYear,
  getLastMonth,
  getLastWeek,
  getYearToDate,

  // Cálculos de período
  getBudgetPeriod,
  getNextPeriodDates,
  getPreviousPeriodDates,

  // Verificações
  isDateInPeriod,
  isDateInFuture,
  isDateInPast,

  // Diferenças
  getDaysRemaining,
  getDaysPassed,
  getWeeksRemaining,
  getMonthsRemaining,
  getAgeInDays,

  // Listas
  getMonthsList,
  getYearsList,
  getQuartersList,

  // Análises
  getMonthProgress,
  getYearProgress,
  getWeekProgress,
  getPeriodProgress,

  // Datas especiais
  getUpcomingDates,
  getOverdueDates,

  // Bounds
  getMonthBounds,
  getWeekBounds,
  getYearBounds,

  // Constantes
  PERIOD_TYPES,
  DATE_FORMATS,
};

export default dateUtils;