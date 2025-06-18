import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { userService } from '../../services/api/user';
import { formatCurrency } from '../../utils/formatters';
import type { MainTabScreenProps } from '../../types';

type Props = MainTabScreenProps<'Profile'>;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  color?: string;
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    data: statsResponse,
  } = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => userService.getStats(),
    staleTime: 1000 * 60 * 10, 
  });

  const stats = statsResponse?.data;

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const MenuSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.menuSection}>
      <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
        {title}
      </Text>
      <Card variant="elevated" style={styles.menuCard}>
        {children}
      </Card>
    </View>
  );

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showChevron = true, 
    rightElement,
    color 
  }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={[
          styles.menuItemIcon,
          { backgroundColor: (color || themeConfig.colors.primary) + '15' }
        ]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={color || themeConfig.colors.primary} 
          />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, { color: themeConfig.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuItemSubtitle, { color: themeConfig.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {rightElement}
        {showChevron && !rightElement && (
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={themeConfig.colors.textLight} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const MenuDivider = () => (
    <View style={[styles.menuDivider, { backgroundColor: themeConfig.colors.border }]} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <View style={[styles.header, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          Perfil
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color={themeConfig.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card variant="gradient" gradient={themeConfig.colors.primaryGradient as readonly [string, string, ...string[]]} style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {!user?.isEmailVerified && (
                <View style={styles.verificationBadge}>
                  <Ionicons name="warning" size={12} color="#ffffff" />
                  <Text style={styles.verificationText}>Email não verificado</Text>
                </View>
              )}
            </View>
          </View>

          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totals.transactions}</Text>
                <Text style={styles.statLabel}>Transações</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totals.budgets}</Text>
                <Text style={styles.statLabel}>Orçamentos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totals.goals}</Text>
                <Text style={styles.statLabel}>Metas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.accountAge}d</Text>
                <Text style={styles.statLabel}>Dias de uso</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Conta */}
        <MenuSection title="CONTA">
          <MenuItem
            icon="person-outline"
            title="Editar Perfil"
            subtitle="Nome, email, foto do perfil"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuDivider />
          <MenuItem
            icon="lock-closed-outline"
            title="Alterar Senha"
            subtitle="Atualizar sua senha de acesso"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuDivider />
          <MenuItem
            icon="card-outline"
            title="Moeda"
            subtitle={`${user?.currency || 'BRL'} - Real Brasileiro`}
            onPress={() => {
            }}
          />
        </MenuSection>

        {/* Preferências */}
        <MenuSection title="PREFERÊNCIAS">
          <MenuItem
            icon={theme === 'dark' ? 'moon' : 'sunny'}
            title="Tema"
            subtitle={theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
            onPress={toggleTheme}
            showChevron={false}
            rightElement={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{
                  false: themeConfig.colors.border,
                  true: themeConfig.colors.primary,
                }}
                thumbColor="#ffffff"
              />
            }
          />
          <MenuDivider />
          <MenuItem
            icon="notifications-outline"
            title="Notificações"
            subtitle="Alertas de orçamento, lembretes de metas"
            onPress={() => {
            }}
          />
          <MenuDivider />
          <MenuItem
            icon="language-outline"
            title="Idioma"
            subtitle="Português (Brasil)"
            onPress={() => {
            }}
          />
        </MenuSection>

        {/* Dados */}
        <MenuSection title="DADOS">
          <MenuItem
            icon="folder-outline"
            title="Gerenciar Categorias"
            subtitle="Criar, editar e organizar categorias"
            onPress={() => navigation.navigate('CategoryManagement')}
          />
          <MenuDivider />
          <MenuItem
            icon="bar-chart-outline"
            title="Relatórios"
            subtitle="Visualizar relatórios detalhados"
            onPress={() => navigation.navigate('Reports')}
          />
          <MenuDivider />
          <MenuItem
            icon="download-outline"
            title="Exportar Dados"
            subtitle="Baixar seus dados em CSV ou JSON"
            onPress={() => {
            }}
          />
        </MenuSection>

        {/* Suporte */}
        <MenuSection title="SUPORTE">
          <MenuItem
            icon="help-circle-outline"
            title="Central de Ajuda"
            subtitle="Perguntas frequentes e tutoriais"
            onPress={() => {
            }}
          />
          <MenuDivider />
          <MenuItem
            icon="mail-outline"
            title="Fale Conosco"
            subtitle="Entre em contato com o suporte"
            onPress={() => {
            }}
          />
          <MenuDivider />
          <MenuItem
            icon="information-circle-outline"
            title="Sobre o App"
            subtitle="Versão 1.0.0"
            onPress={() => {
            }}
          />
        </MenuSection>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Sair da Conta"
            variant="outline"
            onPress={handleLogout}
            leftIcon={<Ionicons name="log-out-outline" size={20} color={themeConfig.colors.error} />}
            style={styles.logoutButton}
            textStyle={{ color: themeConfig.colors.error }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: themeConfig.colors.textLight }]}>
            Finance App v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: themeConfig.colors.textLight }]}>
            Desenvolvido com ❤️
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  profileCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  verificationText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuDivider: {
    height: 1,
    marginLeft: 68,
  },

  logoutSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#ef4444', 
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
});