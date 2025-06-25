// src/components/common/DatePickerInput.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import Button from './Button';

interface DatePickerInputProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
  error?: string;
  style?: ViewStyle;
  disabled?: boolean;
  required?: boolean;
  showWeekday?: boolean;
  format?: string;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  placeholder,
  error,
  style,
  disabled = false,
  required = false,
  showWeekday = true,
  format: customFormat,
}: DatePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const getDisplayFormat = () => {
    if (customFormat) return customFormat;
    
    switch (mode) {
      case 'time':
        return 'HH:mm';
      case 'datetime':
        return showWeekday ? 'dd/MM/yyyy (EEEE) às HH:mm' : 'dd/MM/yyyy HH:mm';
      default:
        return showWeekday ? 'dd/MM/yyyy (EEEE)' : 'dd/MM/yyyy';
    }
  };

  const formatDisplayValue = () => {
    try {
      return format(value, getDisplayFormat(), { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate && event.type !== 'dismissed') {
      onChange(selectedDate);
    }
  };

  const openPicker = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'time':
        return 'time-outline';
      case 'datetime':
        return 'calendar-outline';
      default:
        return 'calendar-outline';
    }
  };

  const renderPicker = () => {
    if (!showPicker) return null;

    const picker = (
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        locale="pt-BR"
        textColor={themeConfig.colors.text}
      />
    );

    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeConfig.colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeConfig.colors.text }]}>
                  {label || `Selecionar ${mode === 'time' ? 'horário' : 'data'}`}
                </Text>
              </View>
              
              {picker}
              
              <View style={styles.modalActions}>
                <Button
                  title="Cancelar"
                  onPress={() => setShowPicker(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Confirmar"
                  onPress={() => setShowPicker(false)}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    return picker;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: themeConfig.colors.text }]}>
          {label}
          {required && <Text style={[styles.required, { color: themeConfig.colors.error }]}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.input,
          {
            backgroundColor: themeConfig.colors.background,
            borderColor: error ? themeConfig.colors.error : themeConfig.colors.border,
          },
          disabled && styles.disabled,
        ]}
        onPress={openPicker}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          <Ionicons 
            name={getIcon() as any} 
            size={20} 
            color={disabled ? themeConfig.colors.textLight : themeConfig.colors.primary} 
            style={styles.icon}
          />
          
          <Text 
            style={[
              styles.inputText,
              { 
                color: disabled 
                  ? themeConfig.colors.textLight 
                  : value 
                    ? themeConfig.colors.text 
                    : themeConfig.colors.textSecondary 
              }
            ]}
          >
            {value ? formatDisplayValue() : (placeholder || `Selecionar ${mode === 'time' ? 'horário' : 'data'}`)}
          </Text>
          
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={disabled ? themeConfig.colors.textLight : themeConfig.colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: themeConfig.colors.error }]}>
          {error}
        </Text>
      )}

      {renderPicker()}
    </View>
  );
}

// 🔥 NOVO: Componente auxiliar para seletor rápido de datas
export function QuickDateSelector({
  onDateSelect,
  selectedDate,
}: {
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const quickOptions = [
    { label: 'Hoje', date: new Date() },
    { label: 'Ontem', date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { label: 'Há 7 dias', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { label: 'Há 30 dias', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  ];

  return (
    <View style={styles.quickSelector}>
      <Text style={[styles.quickSelectorLabel, { color: themeConfig.colors.textSecondary }]}>
        Datas rápidas:
      </Text>
      <View style={styles.quickOptions}>
        {quickOptions.map((option, index) => {
          const isSelected = selectedDate && 
            format(selectedDate, 'yyyy-MM-dd') === format(option.date, 'yyyy-MM-dd');
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickOption,
                { borderColor: themeConfig.colors.border },
                isSelected && {
                  backgroundColor: themeConfig.colors.primary + '20',
                  borderColor: themeConfig.colors.primary,
                }
              ]}
              onPress={() => onDateSelect(option.date)}
            >
              <Text style={[
                styles.quickOptionText,
                { color: isSelected ? themeConfig.colors.primary : themeConfig.colors.text }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  quickSelector: {
    marginTop: 12,
  },
  quickSelectorLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});