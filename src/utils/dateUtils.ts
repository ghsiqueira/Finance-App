// src/utils/dateUtils.ts
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears, differenceInDays, differenceInWeeks, differenceInMonths, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dateUtils = {
  // Formatar datas
  formatDate: (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: ptBR });
  },

  formatRelative: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffDays = differenceInDays(now, dateObj);

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  },

  // Obter períodos
  getCurrentWeek: (): { start: Date; end: Date } => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  },

  getCurrentMonth: (): { start: Date; end: Date } => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  },

  getCurrentYear: (): { start: Date; end: Date } => {
    const now = new Date();
    return {
      start: startOfYear(now),
      end: endOfYear(now),
    };
  },

  // Calcular períodos de orçamento
  getBudgetPeriod: (
    startDate: Date,
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): { start: Date; end: Date } => {
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

    return { start: startDate, end: addDays(endDate, -1) };
  },

  // Verificar se data está em período
  isDateInPeriod: (
    date: Date | string,
    startDate: Date | string,
    endDate: Date | string
  ): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const startObj = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const endObj = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    return !isBefore(dateObj, startObj) && !isAfter(dateObj, endObj);
  },

  // Calcular dias restantes
  getDaysRemaining: (targetDate: Date | string): number => {
    const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
    const now = new Date();
    return Math.max(0, differenceInDays(target, now));
  },

  // Gerar lista de meses
  getMonthsList: (count: number = 12): Array<{ value: string; label: string }> => {
    const months = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const date = addMonths(now, -i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMM yyyy', { locale: ptBR }),
      });
    }

    return months;
  },

  // Validar data
  isValidDate: (date: any): boolean => {
    return date instanceof Date && !isNaN(date.getTime());
  },

  // Converter string ISO para Date
  parseDate: (dateString: string): Date | null => {
    try {
      return parseISO(dateString);
    } catch {
      return null;
    }
  },

  // Obter primeiro e último dia do mês
  getMonthBounds: (date: Date): { start: Date; end: Date } => {
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  },

  // Calcular idade em dias
  getAgeInDays: (startDate: Date | string): number => {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    return differenceInDays(new Date(), start);
  },

  // Obter lista de anos
  getYearsList: (count: number = 5): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = 0; i < count; i++) {
      years.push(currentYear - i);
    }
    
    return years;
  },

  // Calcular progresso mensal
  getMonthProgress: (): number => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    const totalDays = differenceInDays(endOfCurrentMonth, startOfCurrentMonth) + 1;
    const daysPassed = differenceInDays(now, startOfCurrentMonth) + 1;
    
    return Math.round((daysPassed / totalDays) * 100);
  },

  // Obter próximas datas de vencimento
  getUpcomingDates: (dates: string[], days: number = 7): string[] => {
    const now = new Date();
    const futureDate = addDays(now, days);
    
    return dates.filter(dateStr => {
      const date = parseISO(dateStr);
      return isAfter(date, now) && !isAfter(date, futureDate);
    });
  },
};