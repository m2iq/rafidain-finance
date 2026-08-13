import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg(ar.register.fieldsRequired);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(ar.register.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await UserRepository.register(name.trim(), phone.trim(), password);
      if (result.success && result.user) {
        setUser(result.user);
        router.replace('/(main)');
      } else {
        setErrorMsg(result.error || ar.register.failed);
      }
    } catch (err: any) {
      setErrorMsg(ar.register.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AmbientBackground opacity={0.3} />
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        translucent
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* الهوية */}
        <Animated.View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
            <Image
              source={require('../../../assets/images/rafidain-logo.png')}
              style={{ width: 72, height: 72, borderRadius: 16 }}
              resizeMode="contain"
            />
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
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg('')}
        duration={3500}
        style={{ backgroundColor: theme.colors.errorContainer }}
      >
        <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_400Regular' }}>
          {errorMsg}
        </Text>
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  brand: { alignItems: 'center', marginBottom: 8 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
