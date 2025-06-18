// src/components/debug/DebugPanel.tsx - VERSÃO ATUALIZADA PARA ANDROID
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { authService } from '../../services/api/auth';
import apiClient from '../../services/api/client';

interface DebugPanelProps {
  onClose: () => void;
}

interface TestResult {
  status: 'waiting' | 'running' | 'success' | 'error';
  message: string;
  time: number;
  details?: any;
}

export default function DebugPanel({ onClose }: DebugPanelProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  
  const [tests, setTests] = useState<Record<string, TestResult>>({
    connection: { status: 'waiting', message: '', time: 0 },
    cors: { status: 'waiting', message: '', time: 0 },
    register: { status: 'waiting', message: '', time: 0 },
    login: { status: 'waiting', message: '', time: 0 },
  });

  const [isRunning, setIsRunning] = useState(false);
  const [testUser, setTestUser] = useState({
    name: 'Usuário Teste',
    email: `teste${Date.now()}@exemplo.com`,
    password: '123456'
  });
  
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [networkLogs, setNetworkLogs] = useState<string[]>([]);

  // Capturar logs de rede
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('[API]') || message.includes('🔄') || message.includes('📥') || message.includes('📤') || message.includes('📡')) {
        setNetworkLogs(prev => [...prev.slice(-30), `${new Date().toLocaleTimeString()}: ${message}`]);
      }
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('[API]') || message.includes('❌')) {
        setNetworkLogs(prev => [...prev.slice(-30), `${new Date().toLocaleTimeString()}: ERROR: ${message}`]);
      }
      originalConsoleError(...args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  // Obter informações da API
  useEffect(() => {
    setApiInfo(apiClient.getDebugInfo());
  }, []);

  const updateTest = (testName: string, status: TestResult['status'], message: string, time: number = 0, details?: any) => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, message, time, details }
    }));
  };

  const testConnection = async () => {
    const start = Date.now();
    updateTest('connection', 'running', 'Testando conexão...');
    
    try {
      const result = await authService.testConnection();
      const time = Date.now() - start;
      
      if (result.success) {
        updateTest('connection', 'success', result.message, time, result.data);
        return true;
      } else {
        updateTest('connection', 'error', result.message, time, result);
        return false;
      }
    } catch (error: any) {
      const time = Date.now() - start;
      updateTest('connection', 'error', error.message, time, error);
      return false;
    }
  };

  const testCORS = async () => {
    const start = Date.now();
    updateTest('cors', 'running', 'Testando CORS...');
    
    try {
      const response = await apiClient.get('/test-cors');
      const time = Date.now() - start;
      
      if (response.success) {
        updateTest('cors', 'success', 'CORS funcionando!', time, response);
        return true;
      } else {
        updateTest('cors', 'error', 'CORS com problemas', time, response);
        return false;
      }
    } catch (error: any) {
      const time = Date.now() - start;
      updateTest('cors', 'error', `Erro CORS: ${error.message}`, time, error);
      return false;
    }
  };

  const testRegister = async () => {
    const start = Date.now();
    updateTest('register', 'running', 'Testando registro...');
    
    try {
      const userData = {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      };

      const result = await authService.register(userData);
      const time = Date.now() - start;
      
      if (result.success) {
        updateTest('register', 'success', 'Usuário registrado com sucesso!', time, result.data);
        return true;
      } else {
        updateTest('register', 'error', result.message || 'Erro no registro', time, result);
        return false;
      }
    } catch (error: any) {
      const time = Date.now() - start;
      updateTest('register', 'error', error.message, time, error);
      return false;
    }
  };

  const testLogin = async () => {
    const start = Date.now();
    updateTest('login', 'running', 'Testando login...');
    
    try {
      const credentials = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await authService.login(credentials);
      const time = Date.now() - start;
      
      if (result.success) {
        updateTest('login', 'success', 'Login realizado com sucesso!', time, result.data);
        return true;
      } else {
        updateTest('login', 'error', result.message || 'Erro no login', time, result);
        return false;
      }
    } catch (error: any) {
      const time = Date.now() - start;
      updateTest('login', 'error', error.message, time, error);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setNetworkLogs([]);
    
    // Reset tests
    setTests({
      connection: { status: 'waiting', message: '', time: 0 },
      cors: { status: 'waiting', message: '', time: 0 },
      register: { status: 'waiting', message: '', time: 0 },
      login: { status: 'waiting', message: '', time: 0 },
    });

    // Gerar novo usuário para cada teste
    const newUser = {
      name: 'Usuário Teste',
      email: `teste${Date.now()}@exemplo.com`,
      password: '123456'
    };
    setTestUser(newUser);

    try {
      // Teste 1: Conexão
      console.log('🧪 Iniciando teste de conexão...');
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setIsRunning(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Teste 2: CORS
      console.log('🧪 Iniciando teste de CORS...');
      await testCORS();

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Teste 3: Registro
      console.log('🧪 Iniciando teste de registro...');
      const registerOk = await testRegister();
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Teste 4: Login (mesmo se registro falhou, tenta login)
      console.log('🧪 Iniciando teste de login...');
      await testLogin();

    } catch (error) {
      console.error('❌ Erro geral nos testes:', error);
    } finally {
      setIsRunning(false);
      console.log('🧪 Testes concluídos');
    }
  };

  const clearCache = async () => {
    try {
      await apiClient.clearCache();
      Alert.alert('✅ Sucesso', 'Cache limpo com sucesso!');
    } catch (error: any) {
      Alert.alert('❌ Erro', `Erro ao limpar cache: ${error.message}`);
    }
  };

  const copyLogs = () => {
    const logsText = networkLogs.join('\n');
    Clipboard.setString(logsText);
    Alert.alert('📋 Copiado', 'Logs copiados para a área de transferência');
  };

  const copyTestResults = () => {
    const results = Object.entries(tests).map(([name, test]) => 
      `${name}: ${test.status} - ${test.message} (${test.time}ms)`
    ).join('\n');
    
    Clipboard.setString(results);
    Alert.alert('📋 Copiado', 'Resultados dos testes copiados para a área de transferência');
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      platform: Platform.OS,
      apiInfo,
      tests,
      networkLogs: networkLogs.slice(-10), // Últimos 10 logs
      timestamp: new Date().toISOString()
    };
    
    Clipboard.setString(JSON.stringify(debugInfo, null, 2));
    Alert.alert('📋 Copiado', 'Informações de debug copiadas');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return 'ellipse-outline';
      case 'running': return 'refresh';
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      default: return 'ellipse-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return themeConfig.colors.textLight;
      case 'running': return themeConfig.colors.warning;
      case 'success': return themeConfig.colors.success;
      case 'error': return themeConfig.colors.error;
      default: return themeConfig.colors.textLight;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <View style={[styles.header, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          🔧 Debug Panel - Android
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={themeConfig.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações da API */}
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📡 Informações da API
          </Text>
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            URL Base: {apiInfo?.baseURL}
          </Text>
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            Plataforma: {apiInfo?.platform} (Android Emulator)
          </Text>
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            Status de Rede: {apiInfo?.isOnline ? '🟢 Online' : '🔴 Offline'}
          </Text>
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            Requisições Pendentes: {apiInfo?.pendingRequestsCount || 0}
          </Text>
        </Card>

        {/* Configuração do Usuário de Teste */}
        <Card style={styles.testUserCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            👤 Usuário de Teste
          </Text>
          
          <Input
            label="Nome"
            value={testUser.name}
            onChangeText={(text) => setTestUser(prev => ({ ...prev, name: text }))}
            size="small"
          />
          
          <Input
            label="Email"
            value={testUser.email}
            onChangeText={(text) => setTestUser(prev => ({ ...prev, email: text }))}
            size="small"
            keyboardType="email-address"
          />
          
          <Input
            label="Senha"
            value={testUser.password}
            onChangeText={(text) => setTestUser(prev => ({ ...prev, password: text }))}
            size="small"
          />
          
          <Button
            title="🎲 Gerar Novo Usuário"
            variant="outline"
            size="small"
            onPress={() => setTestUser({
              name: 'Usuário Teste',
              email: `teste${Date.now()}@exemplo.com`,
              password: '123456'
            })}
          />
        </Card>

        {/* Resultados dos Testes */}
        <Card style={styles.testsCard}>
          <View style={styles.testsHeader}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              🧪 Resultados dos Testes
            </Text>
            <TouchableOpacity onPress={copyTestResults}>
              <Ionicons name="copy" size={20} color={themeConfig.colors.primary} />
            </TouchableOpacity>
          </View>

          {Object.entries(tests).map(([testName, test]) => (
            <View key={testName} style={[styles.testItem, { borderBottomColor: themeConfig.colors.border }]}>
              <View style={styles.testHeader}>
                <Ionicons 
                  name={getStatusIcon(test.status)} 
                  size={20} 
                  color={getStatusColor(test.status)} 
                />
                <Text style={[styles.testName, { color: themeConfig.colors.text }]}>
                  {testName === 'connection' ? '🔗 Conexão' : 
                   testName === 'cors' ? '🌐 CORS' :
                   testName === 'register' ? '📝 Registro' : 
                   '🔐 Login'}
                </Text>
                {test.time > 0 && (
                  <Text style={[styles.testTime, { color: themeConfig.colors.textLight }]}>
                    {test.time}ms
                  </Text>
                )}
              </View>
              {test.message && (
                <Text style={[
                  styles.testMessage,
                  { color: test.status === 'error' ? themeConfig.colors.error : themeConfig.colors.textSecondary }
                ]}>
                  {test.message}
                </Text>
              )}
              {test.details && (
                <TouchableOpacity 
                  style={styles.detailsButton}
                  onPress={() => Alert.alert('Detalhes', JSON.stringify(test.details, null, 2))}
                >
                  <Text style={[styles.detailsText, { color: themeConfig.colors.primary }]}>
                    Ver detalhes
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Card>

        {/* Ações de Teste */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            ⚡ Ações
          </Text>
          
          <Button
            title={isRunning ? "🔄 Executando Testes..." : "🧪 Executar Todos os Testes"}
            onPress={runAllTests}
            disabled={isRunning}
            loading={isRunning}
            fullWidth
            gradient
            style={styles.testButton}
          />

          <View style={styles.individualTests}>
            <Button
              title="🔗 Conexão"
              onPress={testConnection}
              disabled={isRunning}
              variant="outline"
              size="small"
              style={styles.individualButton}
            />
            <Button
              title="🌐 CORS"
              onPress={testCORS}
              disabled={isRunning}
              variant="outline"
              size="small"
              style={styles.individualButton}
            />
          </View>

          <View style={styles.utilityActions}>
            <Button
              title="🧹 Limpar Cache"
              onPress={clearCache}
              variant="ghost"
              size="small"
              style={styles.utilityButton}
            />
            <Button
              title="📋 Copiar Debug"
              onPress={copyDebugInfo}
              variant="ghost"
              size="small"
              style={styles.utilityButton}
            />
          </View>
        </Card>

        {/* Logs de Rede */}
        <Card style={styles.logsCard}>
          <View style={styles.logsHeader}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              📊 Logs de Rede ({networkLogs.length})
            </Text>
            <View style={styles.logsActions}>
              <TouchableOpacity 
                onPress={copyLogs}
                style={styles.logAction}
              >
                <Ionicons name="copy" size={16} color={themeConfig.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setNetworkLogs([])}
                style={styles.logAction}
              >
                <Text style={[styles.clearText, { color: themeConfig.colors.error }]}>
                  Limpar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            style={styles.logsContainer} 
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {networkLogs.length === 0 ? (
              <Text style={[styles.noLogs, { color: themeConfig.colors.textLight }]}>
                Nenhum log ainda. Execute um teste para ver os logs.
              </Text>
            ) : (
              networkLogs.map((log, index) => (
                <Text 
                  key={index} 
                  style={[
                    styles.logText, 
                    { 
                      color: log.includes('ERROR') ? themeConfig.colors.error : themeConfig.colors.textSecondary,
                      backgroundColor: log.includes('ERROR') ? themeConfig.colors.error + '10' : 'transparent'
                    }
                  ]}
                >
                  {log}
                </Text>
              ))
            )}
          </ScrollView>
        </Card>

        {/* Guia Android */}
        <Card style={styles.helpCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            📱 Guia Android Emulator
          </Text>
          <Text style={[styles.helpText, { color: themeConfig.colors.textSecondary }]}>
            • URL correta: http://10.0.2.2:3000/api
          </Text>
          <Text style={[styles.helpText, { color: themeConfig.colors.textSecondary }]}>
            • Backend deve estar em localhost:3000
          </Text>
          <Text style={[styles.helpText, { color: themeConfig.colors.textSecondary }]}>
            • Verificar network_security_config.xml
          </Text>
          <Text style={[styles.helpText, { color: themeConfig.colors.textSecondary }]}>
            • CORS configurado para 10.0.2.2
          </Text>
          <Text style={[styles.helpText, { color: themeConfig.colors.textSecondary }]}>
            • Reiniciar app após mudanças de rede
          </Text>
        </Card>
      </ScrollView>
    </View>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testUserCard: {
    marginBottom: 16,
  },
  testsCard: {
    marginBottom: 16,
  },
  testsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  testItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  testTime: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  testMessage: {
    fontSize: 12,
    marginLeft: 28,
    lineHeight: 16,
    marginBottom: 4,
  },
  detailsButton: {
    marginLeft: 28,
  },
  detailsText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  actionsCard: {
    marginBottom: 16,
  },
  testButton: {
    marginBottom: 16,
  },
  individualTests: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  individualButton: {
    flex: 1,
  },
  utilityActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  utilityButton: {
    flex: 1,
  },
  logsCard: {
    marginBottom: 16,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  logAction: {
    padding: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logsContainer: {
    maxHeight: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  noLogs: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  logText: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
    padding: 2,
    borderRadius: 2,
  },
  helpCard: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
});