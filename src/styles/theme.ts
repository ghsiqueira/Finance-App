export const lightTheme = {
  dark: false,
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    background: '#ffffff',
    card: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textLight: '#9ca3af',
    
    border: '#e5e7eb',
    notification: '#ef4444',
    
    income: '#10b981',
    expense: '#ef4444',
    
    primaryGradient: ['#667eea', '#764ba2'] as const,
    incomeGradient: ['#10b981', '#059669'] as const,
    expenseGradient: ['#ef4444', '#dc2626'] as const,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold' as const,
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export const darkTheme = {
  ...lightTheme,
  dark: true,
  colors: {
    ...lightTheme.colors,
    primary: '#818cf8',
    secondary: '#a78bfa',
    
    background: '#111827',
    card: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textLight: '#9ca3af',
    
    border: '#374151',
    notification: '#f87171',
  },
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: 'light' | 'dark'): Theme => {
  return isDark === 'dark' ? darkTheme : lightTheme;
};