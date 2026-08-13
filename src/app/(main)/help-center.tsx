import React from 'react';
import {
  Linking,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Mail,
  MessageSquare,
  PhoneCall,
  MessageCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import AppScreen from '../../shared/components/AppScreen';

export default function HelpCenterScreen() {
  const theme = useTheme();

  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const contactMethods = [
    {
      id: 'livechat',
      title: 'محادثة الدعم الفني',
      subtitle: 'تواصل مباشر عبر التطبيق',
      icon: MessageCircle,
      color: '#F59E0B',
      bgColor: theme.dark ? '#78350F' : '#FEF3C7',
      action: () => {
        router.push('/(main)/support-chat');
      },
    },
    {
      id: 'whatsapp',
      title: 'واتساب الدعم الفني',
      subtitle: '07763125297',
      icon: MessageSquare,
      color: '#25D366',
      bgColor: theme.dark ? '#064E3B' : '#E8F5E9',
      action: async () => {
        const url = 'whatsapp://send?phone=9647763125297';
        const webUrl = 'https://wa.me/9647763125297';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      },
    },
    {
      id: 'email',
      title: 'البريد الإلكتروني',
      subtitle: 'info@rafidainsw.com',
      icon: Mail,
      color: '#7C3AED',
      bgColor: theme.dark ? '#311B92' : '#F3E8FF',
      action: () => Linking.openURL('mailto:info@rafidainsw.com'),
    },
    {
      id: 'website',
      title: 'الموقع الإلكتروني',
      subtitle: 'www.rafidainsw.com',
      icon: Globe,
      color: '#0284C7',
      bgColor: theme.dark ? '#075985' : '#E0F2FE',
      action: () => Linking.openURL('https://www.rafidainsw.com/'),
    },
  ];

  const faqs = [
    {
      q: 'كيف تعمل المزامنة السحابية في التطبيق؟',
      a: 'تسمح لك المزامنة السحابية بحفظ بيانات الديون والعملاء في السحابة بأمان، مما يتيح لك فتح حسابك من أي جهاز آخر واستعادة كافة بياناتك فور تسجيل الدخول.',
    },
    {
      q: 'هل يعمل التطبيق في حال عدم توفر إنترنت؟',
      a: 'نعم، التطبيق يعمل بكفاءة عالية بدون إنترنت محلياً. وتتم المزامنة تلقائياً بمجرد الاتصال بالإنترنت.',
    },
    {
      q: 'كيف يمكنني ترقية الاشتراك؟',
      a: 'من شاشة الإعدادات، يمكنك الدخول إلى "باقة الاشتراك" واختيار إحدى الباقات السحابية المتاحة لتفعيل المزامنة الفورية وتعدد الأجهزة.',
    },
  ];

  return (
    <AppScreen title="مركز المساعدة" scroll>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.container}>
        {/* Hero Card */}
        <Surface
          style={[styles.heroCard, { backgroundColor: theme.dark ? '#1E1B4B' : '#4F46E5', borderColor: theme.dark ? '#312E81' : '#6366F1' }]}
          elevation={2}
        >
          <View style={styles.heroIconWrap}>
            <HelpCircle size={32} color="#C7D2FE" />
          </View>
          <Text variant="titleMedium" style={{ color: '#FFFFFF', fontFamily: 'Cairo_700Bold', marginTop: 10 }}>
            كيف يمكننا مساعدتك اليوم؟
          </Text>
          <Text variant="bodySmall" style={{ color: '#C7D2FE', textAlign: 'center', marginTop: 4, fontFamily: 'Cairo_400Regular' }}>
            فريق الرافدين في خدمتك للإجابة على استفساراتك وتقديم الدعم الفني اللازم.
          </Text>
        </Surface>

        {/* Contact Section */}
        <Text variant="titleSmall" style={[styles.sectionHeading, { color: theme.colors.onBackground }]}>
          وسائل التواصل المباشر
        </Text>

        <View style={styles.grid}>
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <TouchableOpacity
                key={method.id}
                activeOpacity={0.8}
                onPress={method.action}
                style={[
                  styles.contactCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: method.bgColor }]}>
                  <Icon size={24} color={method.color} strokeWidth={2} />
                </View>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginTop: 8 }}>
                  {method.title}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2, fontFamily: 'Cairo_600SemiBold' }}>
                  {method.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAQ Section */}
        <Text variant="titleSmall" style={[styles.sectionHeading, { color: theme.colors.onBackground, marginTop: 24 }]}>
          الأسئلة الشائعة
        </Text>

        <View style={[styles.faqList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <View key={idx}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                  style={styles.faqRow}
                >
                  <Text variant="titleSmall" style={{ flex: 1, color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                    {faq.q}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={theme.colors.primary} />
                  ) : (
                    <ChevronDown size={18} color={theme.colors.outline} />
                  )}
                </TouchableOpacity>
                {isExpanded && (
                  <Text variant="bodySmall" style={[styles.faqAns, { color: theme.colors.outline }]}>
                    {faq.a}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  heroCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontFamily: 'Cairo_700Bold',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqAns: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontFamily: 'Cairo_400Regular',
    lineHeight: 20,
  },
  divider: {
    height: 1,
  },
});
