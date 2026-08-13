import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useAppStore } from '../../core/store/appStore';
import { UserRepository } from '../../core/database/repositories/UserRepository';
import AppScreen from '../../shared/components/AppScreen';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const user = useAppStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    setError('');
    setSuccess(false);

    const errors: typeof fieldErrors = {};
    if (!currentPassword) errors.current = 'يرجى إدخال كلمة المرور الحالية';
    if (!newPassword) {
      errors.next = 'يرجى إدخال كلمة المرور الجديدة';
    } else if (newPassword.length < 6) {
      errors.next = 'يجب أن تكون 6 أحرف على الأقل';
    }
    if (!confirmPassword) {
      errors.confirm = 'يرجى تأكيد كلمة المرور الجديدة';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirm = 'كلمة المرور الجديدة وتأكيدها غير متطابقين';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!user?.id) {
      setError('يرجى تسجيل الدخول أولاً');
      return;
    }

    try {
      setLoading(true);
      await UserRepository.changePassword(user.id, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen
      title="تغيير كلمة المرور"
      scroll
    >
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.container}>
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.dark ? '#1E1B4B' : '#4F46E5', borderColor: theme.dark ? '#312E81' : '#6366F1' }]}>
          <View style={styles.heroIconBox}>
            <ShieldCheck size={32} color="#C7D2FE" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold' }}>
              حماية حسابك
            </Text>
            <Text variant="bodySmall" style={{ color: '#C7D2FE', marginTop: 2, fontFamily: 'Cairo_400Regular' }}>
              قم بتحديث كلمة المرور بانتظام للحفاظ على أمان بيانات محلك
            </Text>
          </View>
        </View>

        {/* Form Container */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          {error ? (
            <View style={[styles.msgBox, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.msgBox, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={18} color="#16A34A" />
              <Text style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold', fontSize: 13, marginRight: 6 }}>
                تم تغيير كلمة المرور بنجاح!
              </Text>
            </View>
          ) : null}

          <AppInput
            label="كلمة المرور الحالية *"
            icon="lock"
            secureTextEntry
            value={currentPassword}
            onChangeText={(t) => { setCurrentPassword(t); setFieldErrors((f) => ({ ...f, current: undefined })); }}
            error={fieldErrors.current}
          />

          <View style={{ height: 16 }} />

          <AppInput
            label="كلمة المرور الجديدة *"
            icon="lock"
            secureTextEntry
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setFieldErrors((f) => ({ ...f, next: undefined })); }}
            error={fieldErrors.next}
          />

          <View style={{ height: 16 }} />

          <AppInput
            label="تأكيد كلمة المرور الجديدة *"
            icon="lock"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setFieldErrors((f) => ({ ...f, confirm: undefined })); }}
            error={fieldErrors.confirm}
          />

          <View style={{ height: 28 }} />

          <AppButton
            label="تحديث كلمة المرور"
            onPress={handleChangePassword}
            loading={loading}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  msgBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
