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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepository.verifyPassword(phone.trim(), password);
      if (user) {
        setUser({ id: user.id, name: user.name, phone: user.phone, role: user.role });
        router.replace('/(main)');
      } else {
        setError('رقم الهاتف أو كلمة المرور غير صحيحة');
      }
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.inner}>
        {/* Brand */}
        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
            <LogIn size={30} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onBackground, textAlign: 'center' }}
          >
            مصرف الرافدين
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.outline, marginTop: 6, textAlign: 'center' }}
          >
            نظام إدارة الديون والأقساط
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(500).springify()}
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
            تسجيل الدخول
          </Text>
          <AppInput
            label="رقم الهاتف"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={{ height: 12 }} />
          <AppInput
            label="كلمة المرور"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.forgot} onPress={() => {}}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              نسيت كلمة المرور؟
            </Text>
          </TouchableOpacity>
          <AppButton
            label="دخول"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />
        </Animated.View>

        {/* Register link */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
            ليس لديك حساب؟{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              إنشاء حساب
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
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  forgot: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
});
