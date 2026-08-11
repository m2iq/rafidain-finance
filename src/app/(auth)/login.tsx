import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, useTheme, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { UserRepository } from '../../core/database/repositories/UserRepository';
import { useAppStore } from '../../core/store/appStore';
import Animated from 'react-native-reanimated';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';
import AmbientBackground from '../../shared/components/AmbientBackground';
import ar from '../../shared/i18n/ar';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError(ar.validation.phoneRequired);
      return;
    }
    if (!password.trim()) {
      setError(ar.validation.passwordRequired);
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepository.verifyPassword(phone.trim(), password);
      if (user) {
        setUser({ id: user.id, name: user.name, phone: user.phone, role: user.role });
        router.replace('/(main)');
      } else {
        setError(ar.validation.invalidCredentials);
      }
    } catch (err: any) {
      setError(err?.message || ar.validation.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AmbientBackground />
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.inner}>
        {/* الهوية والتطبيق */}
        <Animated.View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
            <LogIn size={32} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onBackground, textAlign: 'center', fontFamily: 'Cairo_700Bold' }}
          >
            {ar.login.title}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.outline, marginTop: 6, textAlign: 'center', fontFamily: 'Cairo_400Regular' }}
          >
            {ar.login.subtitle}
          </Text>
        </Animated.View>

        {/* بطاقة تسجيل الدخول */}
        <Animated.View
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 20, fontFamily: 'Cairo_700Bold' }}>
            {ar.login.heading}
          </Text>
          <AppInput
            label={ar.login.phoneLabel}
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={{ height: 14 }} />
          <AppInput
            label={ar.login.passwordLabel}
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.forgot} onPress={() => {}}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary, fontFamily: 'Cairo_600SemiBold' }}>
              {ar.login.forgotPassword}
            </Text>
          </TouchableOpacity>
          <AppButton
            label={loading ? ar.login.loading : ar.login.loginBtn}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />
        </Animated.View>

        {/* رابط الإنشاء والتسجيل */}
        <Animated.View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, fontFamily: 'Cairo_400Regular' }}>
            {ar.login.noAccount}{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
              {ar.login.register}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3500}
        style={{ backgroundColor: theme.colors.errorContainer }}
      >
        <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_400Regular' }}>
          {error}
        </Text>
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center', gap: 20 },
  brand: { alignItems: 'center', marginBottom: 8 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  forgot: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
});
