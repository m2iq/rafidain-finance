import { useRouter } from 'expo-router';
import { Check, CheckCircle, Cloud, KeyRound, Server, ShieldCheck, Sparkles, Ticket } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../core/store/appStore';
import { supabase } from '../../core/supabase/supabaseClient';
import AppButton from '../../shared/components/AppButton';
import AppInput from '../../shared/components/AppInput';
import AppScreen from '../../shared/components/AppScreen';
import ar from '../../shared/i18n/ar';
import { formatCurrency } from '../../shared/utils/currency';

export default function SubscriptionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isCloudMode, hasActiveSubscription, setCloudMode, setSubscription, user } = useAppStore();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('quarterly');
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');

  const [subDetails, setSubDetails] = useState<{
    endDate: string | null;
    planTier: string;
    remainingDays: number;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkSubscription(user.id);
    }
  }, [user]);

  const checkSubscription = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('store_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.status === 'active' && data.plan_tier !== 'free') {
        const isExpired = data.end_date && new Date(data.end_date) < new Date();
        if (isExpired) {
          setSubscription(false);
          setCloudMode(false);
          setSubDetails(null);
        } else {
          setSubscription(true);
          const days = data.end_date
            ? Math.max(0, Math.ceil((new Date(data.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          setSubDetails({
            endDate: data.end_date,
            planTier: data.plan_tier,
            remainingDays: days,
          });
        }
      } else {
        setSubscription(false);
        setCloudMode(false);
        setSubDetails(null);
      }
    } catch (err) {
      console.log('Subscription check note:', err);
    }
  };

  const handleRedeemVoucher = async () => {
    setVoucherError('');
    const cleanCode = voucherCode.trim().toUpperCase();

    if (!cleanCode) {
      setVoucherError('يرجى إدخال كود التفعيل أولاً');
      return;
    }

    if (!user?.id) {
      setVoucherError('يرجى تسجيل الدخول أولاً لتفعيل الكود');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch voucher from Supabase
      const { data: voucher, error: fetchErr } = await supabase
        .from('voucher_codes')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (fetchErr) {
        throw new Error('حدث خطأ أثناء فحص الكود: ' + fetchErr.message);
      }

      if (!voucher) {
        throw new Error('كود التفعيل الذي أدخلته غير صحيح أو غير موجود');
      }

      if (voucher.status !== 'active') {
        throw new Error('كود التفعيل غير نشط أو تم إلغاؤه');
      }

      if (voucher.current_usages >= voucher.max_usages) {
        throw new Error('تم استنفاذ الحد الأقصى لاستخدام هذا الكود');
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        throw new Error('كود التفعيل منتهي الصلاحية');
      }

      // 2. Check if user already redeemed this voucher
      const { data: existingRedemption } = await supabase
        .from('voucher_redemptions')
        .select('id')
        .eq('voucher_id', voucher.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRedemption) {
        throw new Error('لقد قمت باستخدام هذا الكود على حسابك سابقاً');
      }

      // 3. Update voucher usages
      const newUsages = (voucher.current_usages || 0) + 1;
      const newStatus = newUsages >= voucher.max_usages ? 'expired' : 'active';

      await supabase
        .from('voucher_codes')
        .update({
          current_usages: newUsages,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', voucher.id);

      // 4. Log redemption
      await supabase.from('voucher_redemptions').insert([
        {
          voucher_id: voucher.id,
          user_id: user.id,
          redeemed_at: new Date().toISOString(),
        },
      ]);

      // 5. Calculate new subscription duration
      const durationDays = voucher.duration_days || 30;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const subPayload = {
        store_id: user.id,
        plan_tier: durationDays >= 90 ? 'cloud_quarterly' : 'cloud_monthly',
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        updated_at: startDate.toISOString(),
      };

      await supabase
        .from('subscriptions')
        .upsert(subPayload, { onConflict: 'store_id' });

      // 6. Update local app state
      setSubscription(true);
      setCloudMode(true);
      setVoucherCode('');
      await checkSubscription(user.id);

      Alert.alert(
        'تم التفعيل بنجاح! 🎉',
        `تهانينا، تم تفعيل اشتراكك السحابي بنجاح لمدة ${durationDays} يوماً!`
      );
    } catch (err: any) {
      setVoucherError(err.message || 'فشل تفعيل الكود، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const isMonthly = billingCycle === 'monthly';

  return (
    <AppScreen title={ar.subscription.title} scroll>
      <View style={[styles.container, { paddingBottom: 100 + insets.bottom }]}>

        {/* Subtitle / Intro */}
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          انقل أعمالك للمستوى التالي مع المزامنة السحابية الفورية وتفعيل الباقات من خلال كود التفعيل الصادر من الإدارة.
        </Text>

        {/* VOUCHER ACTIVATION CARD */}
        <Surface
          style={[
            styles.proCard,
            {
              backgroundColor: theme.dark ? '#191C35' : '#FFFFFF',
              borderColor: theme.colors.primary,
              marginBottom: 20,
            },
          ]}
          elevation={2}
        >
          <View style={styles.planHeader}>
            <View style={[styles.planIconWrap, { backgroundColor: theme.dark ? '#311B92' : '#F3E8FF' }]}>
              <Ticket size={24} color="#7C3AED" />
            </View>
            <View style={styles.planTitleBox}>
              <Text variant="titleMedium" style={[styles.planTitle, { color: theme.colors.onSurface }]}>
                تفعيل الاشتراك بواسطة كود التفعيل
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                أدخل كود التفعيل (Voucher Code) الصادر من الإدارة لتسجيل باقتك فوراً
              </Text>
            </View>
          </View>

          {voucherError ? (
            <View style={{ padding: 10, borderRadius: 10, backgroundColor: theme.colors.errorContainer, marginTop: 12 }}>
              <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                {voucherError}
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <AppInput
              label="رمز كود التفعيل *"
              icon="key"
              value={voucherCode}
              onChangeText={(txt) => {
                setVoucherCode(txt.toUpperCase());
                setVoucherError('');
              }}
              autoCapitalize="characters"
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <AppButton
              label="تأكيد وتفعيل الكود الآن"
              onPress={handleRedeemVoucher}
              loading={loading}
              mode="contained"
            />
          </View>
        </Surface>

        {/* Billing Cycle Toggle Switch */}
        <View style={[styles.cycleToggleContainer, { backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBillingCycle('monthly')}
            style={[
              styles.cycleTab,
              isMonthly && [styles.cycleTabActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <Text
              variant="labelLarge"
              style={[
                styles.cycleTabText,
                { color: isMonthly ? theme.colors.primary : theme.colors.outline },
              ]}
            >
              شهري (5,000 د.ع)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBillingCycle('quarterly')}
            style={[
              styles.cycleTab,
              !isMonthly && [styles.cycleTabActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <View style={styles.yearlyLabelRow}>
              <Text
                variant="labelLarge"
                style={[
                  styles.cycleTabText,
                  { color: !isMonthly ? theme.colors.primary : theme.colors.outline },
                ]}
              >
                3 أشهر (10,000 د.ع)
              </Text>
              <View style={styles.saveDiscountBadge}>
                <Text style={styles.saveDiscountText}>وفر 33%</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* PRO CLOUD PLAN CARD (FEATURED TOP CARD) */}
        <Surface
          style={[
            styles.proCard,
            {
              backgroundColor: theme.dark ? '#191C35' : '#FFFFFF',
              borderColor: hasActiveSubscription ? '#10B981' : theme.colors.outlineVariant,
            },
          ]}
          elevation={2}
        >
          {/* Top Popular Ribbon / Badge */}
          <View style={styles.topRibbonRow}>
            <View style={[styles.popularTag, { backgroundColor: theme.dark ? '#312E81' : '#EEF2FF' }]}>
              <Sparkles size={14} color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
                {!isMonthly ? 'العرض الأكثر شعبية ⭐' : 'الباقة السحابية'}
              </Text>
            </View>

            {hasActiveSubscription && (
              <View style={[styles.activeStatusTag, { backgroundColor: '#DCFCE7' }]}>
                <Check size={14} color="#16A34A" />
                <Text variant="labelSmall" style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold' }}>
                  باقتك الحالية
                </Text>
              </View>
            )}
          </View>

          {/* Plan Header */}
          <View style={styles.planHeader}>
            <View style={[styles.planIconWrap, { backgroundColor: theme.dark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF' }]}>
              <Cloud size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.planTitleBox}>
              <Text variant="titleLarge" style={[styles.planTitle, { color: theme.colors.onSurface }]}>
                الباقة السحابية (الاحترافية)
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                مزامنة فورية ووصول كامل من أي مكان
              </Text>
            </View>
          </View>

          {/* Price Tag */}
          <View style={styles.priceContainer}>
            <Text variant="displaySmall" style={[styles.priceAmount, { color: theme.colors.primary }]}>
              {isMonthly ? formatCurrency(5000) : formatCurrency(10000)}
            </Text>
            <Text variant="titleSmall" style={[styles.pricePeriod, { color: theme.colors.outline }]}>
              {isMonthly ? '/ شهرياً' : '/ 3 أشهر كاملة (وفر شهر كامل)'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Feature List */}
          <View style={styles.featureList}>
            <ProFeature text="تخزين محلي فائق السرعة + مزامنة سحابية مستمرة" />
            <ProFeature text="نسخ احتياطي آلي واسترجاع البيانات عند تسجيل الدخول أو تغيير الهاتف" />
            <ProFeature text="استخدام الحساب على أكثر من جهاز في نفس الوقت" />
            <ProFeature text="تخصيص كامل لرسائل الواتساب الذكية للعملاء والديون والأقساط" />
            <ProFeature text="حفظ وتعديل قوالب الرسائل سحابياً ومحلياً واسترجاعها تلقائياً" />
            <ProFeature text="إشعارات وتنبيهات بمواعيد سداد الأقساط والديون المستحقة" />
          </View>

          {/* Status info */}
          {hasActiveSubscription && (
            <View style={[styles.currentPlanFooter, { alignItems: 'flex-start' }]}>
              <ShieldCheck size={20} color="#16A34A" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text variant="labelLarge" style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold' }}>
                  اشتراكك فعال ({subDetails?.remainingDays ?? 0} يوم متبقي)
                </Text>
                {!!subDetails?.endDate && (
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, fontFamily: 'Cairo_400Regular', marginTop: 2 }}>
                    تاريخ الانتهاء: {(() => {
                      try {
                        const dateObj = new Date(subDetails.endDate);
                        return isNaN(dateObj.getTime()) ? 'غير محدد' : dateObj.toISOString().split('T')[0];
                      } catch {
                        return 'غير محدد';
                      }
                    })()}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Surface>

        {/* FREE LOCAL PLAN CARD */}
        <Surface
          style={[
            styles.freeCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.planHeader}>
            <View style={[styles.planIconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Server size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            <View style={styles.planTitleBox}>
              <Text variant="titleMedium" style={[styles.planTitle, { color: theme.colors.onSurface }]}>
                الباقة المحلية (المجانية)
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                عمليات أساسية مخزنة محلياً على هاتفك
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text variant="headlineMedium" style={[styles.priceAmount, { color: theme.colors.onSurface }]}>
              مجاناً
            </Text>
            <Text variant="bodyMedium" style={[styles.pricePeriod, { color: theme.colors.outline }]}>
              / مدى الحياة
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          <View style={styles.featureList}>
            <FreeFeature text="تخزين محلي على جهازك الحالي (SQLite)" active />
            <FreeFeature text="يعمل 100% بدون الحاجة لإنترنت" active />
            <FreeFeature text="إضافة عملاء وديون وأقساط غير محدودة" active />
            <FreeFeature text="بدون مزامنة سحابية أو نسخ احتياطي" active={false} />
            <FreeFeature text="بدون تخصيص رسائل الواتساب (رسائل افتراضية فقط)" active={false} />
            <FreeFeature text="بدون استخدام الحساب على أكثر من جهاز في نفس الوقت" active={false} />
          </View>

          {!hasActiveSubscription && (
            <View style={styles.freeActiveBadge}>
              <Text variant="labelMedium" style={{ color: theme.colors.outline, fontFamily: 'Cairo_700Bold' }}>
                الباقة النشطة حالياً
              </Text>
            </View>
          )}
        </Surface>

      </View>
    </AppScreen>
  );
}

function ProFeature({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.featureItem}>
      <View style={[styles.checkDot, { backgroundColor: theme.dark ? '#064E3B' : '#DCFCE7' }]}>
        <CheckCircle size={16} color="#16A34A" />
      </View>
      <Text variant="bodyMedium" style={[styles.featureText, { color: theme.colors.onSurface }]}>
        {text}
      </Text>
    </View>
  );
}

function FreeFeature({ text, active }: { text: string; active: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.featureItem}>
      <View style={[styles.checkDot, { backgroundColor: active ? (theme.dark ? '#064E3B' : '#DCFCE7') : (theme.dark ? '#311F1F' : '#FEE2E2') }]}>
        <CheckCircle size={16} color={active ? "#16A34A" : "#EF4444"} />
      </View>
      <Text
        variant="bodyMedium"
        style={[
          styles.featureText,
          { color: active ? theme.colors.onSurface : theme.colors.outline, textDecorationLine: active ? 'none' : 'line-through' },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  subtitle: {
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Cairo_400Regular',
  },
  cycleToggleContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  cycleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cycleTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cycleTabText: {
    fontFamily: 'Cairo_700Bold',
  },
  yearlyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveDiscountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveDiscountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Cairo_700Bold',
  },
  proCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  topRibbonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  planIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitleBox: {
    flex: 1,
  },
  planTitle: {
    fontFamily: 'Cairo_700Bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  priceAmount: {
    fontFamily: 'Cairo_700Bold',
  },
  pricePeriod: {
    fontFamily: 'Cairo_600SemiBold',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 13,
  },
  proSubscribeBtn: {
    borderRadius: 16,
    paddingVertical: 4,
  },
  currentPlanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
  },
  freeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  freeActiveBadge: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 14,
  },
});
