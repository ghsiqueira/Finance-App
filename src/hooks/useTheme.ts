import { useThemeStore } from '../store/themeStore';
import { getTheme } from '../styles/theme';

export const useTheme = () => {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const themeConfig = getTheme(theme);

  return {
    theme,
    themeConfig,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
};