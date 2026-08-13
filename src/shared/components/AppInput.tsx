import React, { useState } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, TouchableOpacity, KeyboardTypeOptions } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { Eye, EyeOff, Phone, Lock, User, DollarSign, Calendar, ShoppingBag, MapPin, Key, FileText, Shield } from 'lucide-react-native';
import { formatPriceInput } from '../utils/currency';

interface AppInputProps {
  label: string;
  icon?: 'phone' | 'lock' | 'user' | 'dollar-sign' | 'calendar' | 'shopping-bag' | 'map-pin' | 'key' | 'file-text' | 'shield';
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  placeholder?: string;
  isCurrency?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const ICONS = {
  phone: Phone,
  lock: Lock,
  user: User,
  'dollar-sign': DollarSign,
  calendar: Calendar,
  'shopping-bag': ShoppingBag,
  'map-pin': MapPin,
  key: Key,
  'file-text': FileText,
  shield: Shield,
};

export default function AppInput({
  label,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  error,
  placeholder,
  isCurrency,
  autoCapitalize,
}: AppInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPriceField = isCurrency ?? (icon === 'dollar-sign');

  const IconComponent = icon ? ICONS[icon] : null;

  const handleChangeText = (text: string) => {
    if (isPriceField) {
      const formatted = formatPriceInput(text);
      onChangeText(formatted);
    } else {
      onChangeText(text);
    }
  };

  const displayValue = isPriceField ? formatPriceInput(value) : value;


  const borderColor = error
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary
    : theme.colors.outlineVariant;

  return (
    <View style={styles.wrapper}>
      {/* Field Label */}
      <Text
        variant="labelMedium"
        style={[
          styles.label,
          { color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>

      {/* Input Outer Box */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}
      >
        {/* Right Icon (Leading in RTL) */}
        {IconComponent && (
          <View style={styles.iconBox}>
            <IconComponent
              size={20}
              color={isFocused ? theme.colors.primary : theme.colors.outline}
              strokeWidth={1.8}
            />
          </View>
        )}

        {/* Text Input */}
        <RNTextInput
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.outline}
          style={[
            styles.textInput,
            {
              color: theme.colors.onSurface,
            },
          ]}
        />

        {/* Left Icon (Password Eye toggle in RTL) */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.iconBox}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.colors.outline} strokeWidth={1.8} />
            ) : (
              <Eye size={20} color={theme.colors.outline} strokeWidth={1.8} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Error text if present */}
      {error ? (
        <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 4, marginRight: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Cairo_400Regular',
    fontSize: 15,
    textAlign: 'right',
    paddingHorizontal: 8,
    height: '100%',
  },
});
