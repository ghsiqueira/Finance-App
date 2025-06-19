import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
  buttonVariant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  illustration?: any; // For custom illustrations
  style?: any;
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  description,
  buttonTitle,
  onButtonPress,
  buttonVariant = 'primary',
  size = 'medium',
  illustration,
  style,
}: EmptyStateProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const sizeConfig = {
    small: {
      container: { padding: 24 },
      iconSize: 32,
      iconContainer: { width: 64, height: 64, borderRadius: 32 },
      titleSize: 16,
      descriptionSize: 14,
      spacing: { icon: 16, title: 6, description: 20 },
    },
    medium: {
      container: { padding: 40 },
      iconSize: 48,
      iconContainer: { width: 96, height: 96, borderRadius: 48 },
      titleSize: 20,
      descriptionSize: 16,
      spacing: { icon: 24, title: 8, description: 32 },
    },
    large: {
      container: { padding: 48 },
      iconSize: 64,
      iconContainer: { width: 128, height: 128, borderRadius: 64 },
      titleSize: 24,
      descriptionSize: 18,
      spacing: { icon: 32, title: 12, description: 40 },
    },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, config.container, style]}>
      {/* Icon or Illustration */}
      {illustration ? (
        <View style={[styles.illustrationContainer, { marginBottom: config.spacing.icon }]}>
          <Image 
            source={illustration} 
            style={[styles.illustration, config.iconContainer]}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[
          styles.iconContainer, 
          config.iconContainer,
          { 
            backgroundColor: themeConfig.colors.surface,
            marginBottom: config.spacing.icon 
          }
        ]}>
          <Ionicons 
            name={icon as any} 
            size={config.iconSize} 
            color={themeConfig.colors.textLight} 
          />
        </View>
      )}
      
      {/* Title */}
      <Text style={[
        styles.title, 
        { 
          color: themeConfig.colors.text,
          fontSize: config.titleSize,
          marginBottom: config.spacing.title 
        }
      ]}>
        {title}
      </Text>
      
      {/* Description */}
      <Text style={[
        styles.description, 
        { 
          color: themeConfig.colors.textSecondary,
          fontSize: config.descriptionSize,
          marginBottom: config.spacing.description 
        }
      ]}>
        {description}
      </Text>
      
      {/* Action Button */}
      {buttonTitle && onButtonPress && (
        <Button
          title={buttonTitle}
          variant={buttonVariant}
          onPress={onButtonPress}
          style={styles.button}
        />
      )}
    </View>
  );
}

// Predefined EmptyState variants for common use cases
export const TransactionsEmptyState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="receipt-outline"
    title="Nenhuma transação encontrada"
    description="Comece adicionando sua primeira transação para acompanhar suas finanças"
    buttonTitle="Adicionar Transação"
    {...props}
  />
);

export const BudgetsEmptyState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="wallet-outline"
    title="Nenhum orçamento criado"
    description="Crie orçamentos para controlar seus gastos por categoria"
    buttonTitle="Criar Orçamento"
    {...props}
  />
);

export const GoalsEmptyState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="flag-outline"
    title="Nenhuma meta definida"
    description="Defina metas financeiras para alcançar seus objetivos"
    buttonTitle="Criar Meta"
    {...props}
  />
);

export const CategoriesEmptyState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="folder-outline"
    title="Nenhuma categoria encontrada"
    description="Organize suas transações criando categorias personalizadas"
    buttonTitle="Criar Categoria"
    size="small"
    {...props}
  />
);

export const SearchEmptyState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="search-outline"
    title="Nenhum resultado encontrado"
    description="Tente ajustar os filtros ou termos de busca"
    size="small"
    {...props}
  />
);

export const NetworkErrorState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="cloud-offline-outline"
    title="Erro de conexão"
    description="Verifique sua conexão com a internet e tente novamente"
    buttonTitle="Tentar Novamente"
    buttonVariant="outline"
    {...props}
  />
);

export const LoadingErrorState = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    icon="alert-circle-outline"
    title="Erro ao carregar dados"
    description="Ocorreu um erro inesperado. Tente novamente em alguns instantes"
    buttonTitle="Recarregar"
    buttonVariant="outline"
    {...props}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
  },
  illustration: {
    opacity: 0.8,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    minWidth: 150,
  },
});