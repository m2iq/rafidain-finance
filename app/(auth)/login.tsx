import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
          Rafidain Finance
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Sign in to manage your store
        </Text>

        <TextInput
          mode="outlined"
          label="Email or Username"
          style={styles.input}
          autoCapitalize="none"
        />
        
        <TextInput
          mode="outlined"
          label="Password"
          secureTextEntry
          style={styles.input}
        />

        <Button 
          mode="contained" 
          onPress={() => router.replace('/(main)')}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Sign In
        </Button>
        
        <Button 
          mode="text" 
          onPress={() => {}}
          style={styles.linkButton}
        >
          Continue Offline (Local Mode)
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 16,
  },
});
