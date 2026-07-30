import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function DashboardScreen() {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium">Dashboard</Text>
      <Text>Stats will go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
