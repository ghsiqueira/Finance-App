// src/utils/themeCompat.ts - Compatibilidade com tema existente
export const mapThemeToCompat = (theme: any) => {
  // Mapear propriedades do tema existente para as que precisamos
  return {
    // Cores principais
    background: theme.colors?.background || '#ffffff',
    foreground: theme.colors?.text || '#000000',
    surface: theme.colors?.surface || theme.colors?.card || '#f5f5f5',
    primary: theme.colors?.primary || '#007AFF',
    secondary: theme.colors?.secondary || '#5856D6',
    
    // Cores de estado
    success: theme.colors?.success || '#34C759',
    warning: theme.colors?.warning || '#FF9500',
    destructive: theme.colors?.error || '#FF3B30',
    info: theme.colors?.info || '#007AFF',
    
    // Cores auxiliares
    muted: theme.colors?.textSecondary || '#8E8E93',
    border: theme.colors?.border || '#E5E5EA',
    
    // Outros
    accent: theme.colors?.accent || theme.colors?.primary || '#007AFF',
  };
};