import React, { useState } from 'react';
import {
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { Text, useTheme, Snackbar, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LogIn, KeyRound, Clock, X } from 'lucide-react-native';
import { UserRepository } from '../../core/database/repositories/UserRepository';
import { useAppStore } from '../../core/store/appStore';
import { supabase } from '../../core/supabase/supabaseClient';
import { NotificationService } from '../../core/notifications/notificationService';
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
  const [errorMsg, setErrorMsg] = useState('');

  // Password Reset Request State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOldPassword, setResetOldPassword] = useState('');
  const [resetNotes, setResetNotes] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) {
      setErrorMsg(ar.validation.phoneRequired);
      return;
    }
    if (!password.trim()) {
      setErrorMsg(ar.validation.passwordRequired);
      return;
    }
    setLoading(true);
    try {
      const user = await UserRepository.verifyPassword(phone.trim(), password);
      if (user) {
        setUser({ id: user.id, name: user.name, phone: user.phone, role: user.role });
        router.replace('/(main)');
      } else {
        setErrorMsg(ar.validation.invalidCredentials);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || ar.validation.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetRequest = async () => {
    if (!resetPhone.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة رقم الهاتف المسجل بالحساب');
      return;
    }

    setResetSubmitting(true);
    try {
      const pushToken = await NotificationService.getPushToken();

      const { error } = await supabase.from('password_reset_requests').insert([
        {
          phone: resetPhone.trim(),
          old_password: resetOldPassword.trim() || null,
          notes: resetNotes.trim() || null,
          push_token: pushToken || null,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      setResetModalVisible(false);
      setResetPhone('');
      setResetOldPassword('');
      setResetNotes('');

      Alert.alert(
        'تم إرسال الطلب بنجاح! 📩',
        'سيتم فحص بياناتك من قبل إدارة الرافدين، وسوف يتم الرد عليك والتأكيد بإشعار خارجي يصل هاتفك في أقل من 24 ساعة.'
      );
    } catch (err: any) {
      Alert.alert('خطأ', 'فشل إرسال الطلب: ' + (err?.message || 'يرجى المحاولة لاحقاً'));
    } finally {
      setResetSubmitting(false);
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
          <View style={[styles.logo, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
            <Image
              source={require('../../../assets/images/rafidain-logo.png')}
              style={{ width: 72, height: 72, borderRadius: 16 }}
              resizeMode="contain"
            />
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
          <TouchableOpacity
            style={styles.forgot}
            onPress={() => {
              setResetPhone(phone);
              setResetModalVisible(true);
            }}
          >
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

      {/* MODAL: طلب استعادة كلمة المرور */}
      <Modal
        visible={resetModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Surface
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '85%',
            }}
            elevation={5}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={22} color={theme.colors.primary} />
                <Text variant="titleLarge" style={{ fontFamily: 'Cairo_700Bold', color: theme.colors.onSurface }}>
                  استعادة كلمة المرور
                </Text>
              </View>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Notice Box */}
              <View
                style={{
                  backgroundColor: theme.dark ? '#1E293B' : '#EEF2FF',
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Clock size={20} color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ color: theme.colors.primary, flex: 1, fontFamily: 'Cairo_600SemiBold', lineHeight: 18 }}>
                  أدخل رقم هاتفك وتفاصيلك، وسيتم معالجة الطلب والرد عليك عبر إشعار هاتف في أقل من 24 ساعة.
                </Text>
              </View>

              <AppInput
                label="رقم الهاتف المسجل *"
                icon="phone"
                value={resetPhone}
                onChangeText={setResetPhone}
                keyboardType="phone-pad"
              />

              <View style={{ height: 12 }} />

              <AppInput
                label="كلمة المرور القديمة أو المحتملة"
                icon="lock"
                value={resetOldPassword}
                onChangeText={setResetOldPassword}
              />

              <View style={{ height: 12 }} />

              <AppInput
                label="ملاحظات أو تفاصيل إضافية للإدارة"
                icon="file-text"
                value={resetNotes}
                onChangeText={setResetNotes}
                multiline
                numberOfLines={3}
              />

              <View style={{ marginTop: 20, marginBottom: 10 }}>
                <AppButton
                  label="إرسال طلب الاستعادة للإدارة"
                  onPress={handleSendResetRequest}
                  loading={resetSubmitting}
                  mode="contained"
                />
              </View>
            </ScrollView>
          </Surface>
        </View>
      </Modal>

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
