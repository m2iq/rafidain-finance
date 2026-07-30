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
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';

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
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (phone.trim().length < 10) {
      setError('رقم الهاتف يجب أن يكون 10 أرقام على الأقل');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
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
      setError(err.message || 'حدث خطأ غير متوقع');
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
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
            <UserPlus size={30} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, textAlign: 'center' }}>
            إنشاء حساب
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 6, textAlign: 'center' }}>
            انضم لإدارة محلك باحترافية
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View
          entering={FadeInDown.delay(110).duration(450).springify()}
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
            بيانات الحساب
          </Text>

          <AppInput
            label="الاسم الكامل"
            icon="user"
            value={name}
            onChangeText={setName}
          />
          <View style={{ height: 12 }} />
          <AppInput
            label="رقم الهاتف"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={{ height: 12 }} />
          <AppInput
            label="كلمة المرور (6 أحرف على الأقل)"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ height: 8 }} />
          <AppButton
            label="إنشاء الحساب"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          />
        </Animated.View>

        {/* Login Link */}
        <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
            لديك حساب بالفعل؟{' '}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              تسجيل الدخول
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
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
});
