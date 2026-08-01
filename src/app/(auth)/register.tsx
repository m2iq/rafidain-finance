import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Text, useTheme, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { UserRepository } from '../../core/database/repositories/UserRepository';
import { useAppStore } from '../../core/store/appStore';
import Animated from 'react-native-reanimated';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';
import AmbientBackground from '../../shared/components/AmbientBackground';
import ar from '../../shared/i18n/ar';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError(ar.validation.allFieldsRequired);
      return;
    }
    if (phone.trim().length < 10) {
      setError(ar.validation.phoneMinLength);
      return;
    }
    if (password.length < 6) {
      setError(ar.validation.passwordMinLength);
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepository.create({
        name: name.trim(),
        phone: phone.trim(),
        password_plaintext: password,
      });
      setUser({ id: user.id, name: user.name, phone: user.phone, role: user.role });
      router.replace('/(main)');
    } catch (err: any) {
      setError(err.message || ar.validation.unexpectedError);
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
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* الهوية */}
        <Animated.View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
            <UserPlus size={32} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, textAlign: 'center', fontFamily: 'Cairo_700Bold' }}>
            {ar.register.title}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 6, textAlign: 'center', fontFamily: 'Cairo_400Regular' }}>
            {ar.register.subtitle}
          </Text>
        </Animated.View>

        {/* بطاقة التسجيل */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 20, fontFamily: 'Cairo_700Bold' }}>
            {ar.register.heading}
          </Text>

          <AppInput
            label={ar.register.nameLabel}
            icon="user"
            value={name}
            onChangeText={setName}
          />
          <View style={{ height: 12 }} />
          <AppInput
            label={ar.register.phoneLabel}
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={{ height: 12 }} />
          <AppInput
            label={ar.register.passwordLabel}
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ height: 16 }} />
          <AppButton
            label={loading ? ar.register.loading : ar.register.registerBtn}
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          />
        </Animated.View>

        {/* رابط تسجيل الدخول */}
        <Animated.View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, fontFamily: 'Cairo_400Regular' }}>
            {ar.register.hasAccount}{' '}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
              {ar.register.login}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

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
  root:   { flex: 1 },
  inner:  { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 20 },
  brand:  { alignItems: 'center', marginBottom: 4 },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
});
