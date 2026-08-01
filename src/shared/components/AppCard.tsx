import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  mode?: 'elevated' | 'outlined' | 'contained';
}

export default function AppCard({ children, onPress, style, mode = 'elevated' }: AppCardProps) {
  const theme = useTheme();

  return (
    <Card
      mode={mode}
      onPress={onPress}
      style={[
        styles.card,
        mode === 'elevated' && { backgroundColor: theme.colors.surface },
        mode === 'contained' && { backgroundColor: theme.colors.surfaceVariant },
        style,
      ]}
    >
      <Card.Content style={styles.content}>{children}</Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});
