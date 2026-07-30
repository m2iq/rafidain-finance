import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useAppStore } from '../../src/core/store/appStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const theme = useTheme();
  const logout = useAppStore(state => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ marginBottom: 24 }}>Settings</Text>
      
      <Button mode="outlined" onPress={handleLogout} style={styles.button}>
        Sign Out / Exit Local Mode
      </Button>
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
  button: {
    marginTop: 16,
  }
});
