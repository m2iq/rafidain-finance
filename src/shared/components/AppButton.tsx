import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: 'contained' | 'outlined' | 'text';
  variant?: 'primary' | 'danger' | 'success';
}

export default function AppButton({
  label,
  onPress,
  loading,
  disabled,
  mode = 'contained',
  variant = 'primary',
}: AppButtonProps) {
  const theme = useTheme();

  const bgColor =
    variant === 'danger'
      ? theme.colors.error
      : variant === 'success'
      ? '#00C853'
      : theme.colors.primary;

  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      style={styles.button}
      contentStyle={styles.content}
      labelStyle={[styles.label, { fontFamily: 'Cairo_700Bold' }]}
      buttonColor={mode === 'contained' ? bgColor : undefined}
      textColor={mode === 'contained' ? '#FFFFFF' : bgColor}
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    marginTop: 8,
  },
  content: {
    paddingVertical: 6,
  },
  label: {
    fontSize: 17,
    letterSpacing: 0,
  },
});
