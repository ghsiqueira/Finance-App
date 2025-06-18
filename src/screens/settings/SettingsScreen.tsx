import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import type { MainStackScreenProps } from '../../navigation/types';

type Props = MainStackScreenProps<'Settings'>;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  color?: string;
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const themeConfig = getTheme(theme);

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

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title="Configurações" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Conta */}
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
          CONTA
        </Text>
        <Card variant="elevated" style={styles.menuCard}>
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
            onPress={() => Alert.alert('Info', 'Seleção de moeda será implementada em breve')}
          />
        </Card>

        {/* Aparência */}
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
          APARÊNCIA
        </Text>
        <Card variant="elevated" style={styles.menuCard}>
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
            icon="language-outline"
            title="Idioma"
            subtitle="Português (Brasil)"
            onPress={() => Alert.alert('Info', 'Seleção de idioma será implementada em breve')}
          />
        </Card>

        {/* Notificações */}
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
          NOTIFICAÇÕES
        </Text>
        <Card variant="elevated" style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            title="Alertas de Orçamento"
            subtitle="Receber notificações quando exceder limites"
            onPress={() => Alert.alert('Info', 'Configuração será implementada em breve')}
            showChevron={false}
            rightElement={
              <Switch
                value={true}
                onValueChange={() => {}}
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
            icon="flag-outline"
            title="Lembretes de Metas"
            subtitle="Receber lembretes sobre suas metas"
            onPress={() => Alert.alert('Info', 'Configuração será implementada em breve')}
            showChevron={false}
            rightElement={
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{
                  false: themeConfig.colors.border,
                  true: themeConfig.colors.primary,
                }}
                thumbColor="#ffffff"
              />
            }
          />
        </Card>

        {/* Dados */}
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
          DADOS
        </Text>
        <Card variant="elevated" style={styles.menuCard}>
          <MenuItem
            icon="folder-outline"
            title="Gerenciar Categorias"
            subtitle="Criar, editar e organizar categorias"
            onPress={() => navigation.navigate('CategoryManagement')}
          />
          <MenuDivider />
          <MenuItem
            icon="download-outline"
            title="Exportar Dados"
            subtitle="Baixar seus dados em CSV ou JSON"
            onPress={() => Alert.alert('Info', 'Exportação será implementada em breve')}
          />
          <MenuDivider />
          <MenuItem
            icon="cloud-upload-outline"
            title="Backup e Sincronização"
            subtitle="Fazer backup dos seus dados"
            onPress={() => Alert.alert('Info', 'Backup será implementado em breve')}
          />
        </Card>

        {/* Suporte */}
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.textSecondary }]}>
          SUPORTE
        </Text>
        <Card variant="elevated" style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            title="Central de Ajuda"
            subtitle="Perguntas frequentes e tutoriais"
            onPress={() => Alert.alert('Info', 'Central de ajuda será implementada em breve')}
          />
          <MenuDivider />
          <MenuItem
            icon="mail-outline"
            title="Fale Conosco"
            subtitle="Entre em contato com o suporte"
            onPress={() => Alert.alert('Info', 'Contato será implementado em breve')}
          />
          <MenuDivider />
          <MenuItem
            icon="information-circle-outline"
            title="Sobre o App"
            subtitle="Versão 1.0.0"
            onPress={() => Alert.alert('Finance App', 'Versão 1.0.0\nDesenvolvido com React Native')}
          />
        </Card>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Sair da Conta"
            variant="outline"
            onPress={handleLogout}
            leftIcon={<Ionicons name="log-out-outline" size={20} color={themeConfig.colors.error} />}
            style={{ ...styles.logoutButton, borderColor: themeConfig.colors.error }}
            textStyle={{ color: themeConfig.colors.error }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: themeConfig.colors.textLight }]}>
            Finance App v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  menuCard: {
    marginBottom: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    lineHeight: 18,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuDivider: {
    height: 1,
    marginLeft: 68, // Align with text content
  },
  logoutSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  logoutButton: {
    marginHorizontal: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
  },
});