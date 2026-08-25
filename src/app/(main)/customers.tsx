import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, StatusBar, Modal, KeyboardAvoidingView, Platform, ScrollView, Linking, FlatList, Alert } from 'react-native';
import { Text, useTheme, FAB, Avatar, Surface, Chip, Divider, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { Search, Plus, Phone, MapPin, X, UserCheck, PhoneCall, MessageCircle, FileText, Calendar, DollarSign, Clock, CheckCircle, Trash2, RefreshCcw, Map } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Button as PaperButton, Dialog, Portal } from 'react-native-paper';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from '../../features/customers/api/useCustomers';
import { useDebts, useResetCustomerAccount } from '../../features/debts/api/useDebts';
import { useAppStore } from '../../core/store/appStore';
import { runSync } from '../../core/supabase/syncService';
import AppInput from '../../shared/components/AppInput';
import AppButton from '../../shared/components/AppButton';
import IraqLocationPicker from '../../shared/components/IraqLocationPicker';
import ar from '../../shared/i18n/ar';
import { formatCurrency } from '../../shared/utils/currency';
import { openCustomerWhatsApp } from '../../shared/utils/whatsapp';
import { GOVERNORATE_COORDINATES, DISTRICT_COORDINATES } from '../../shared/constants/iraqLocations';

const getLeafletHtml = (lat: number, lng: number, interactive: boolean) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        /* Fix for marker icon missing in some webviews */
        .leaflet-default-icon-path { background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png); }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { 
            zoomControl: ${interactive}, 
            dragging: ${interactive}, 
            scrollWheelZoom: ${interactive} 
        }).setView([${lat}, ${lng}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        var marker = L.marker([${lat}, ${lng}], { draggable: ${interactive} }).addTo(map);
        
        ${interactive ? `
        map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            window.ReactNativeWebView.postMessage(JSON.stringify({lat: e.latlng.lat, lng: e.latlng.lng}));
        });
        
        marker.on('dragend', function(e) {
            var position = marker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({lat: position.lat, lng: position.lng}));
        });
        ` : ''}
    </script>
</body>
</html>
`;

function CustomerStatsHeader({ total, active, paid }: { total: number; active: number; paid: number }) {
  const theme = useTheme();
  return (
    <Surface
      style={[
        styles.statsBar,
        {
          backgroundColor: theme.dark ? '#111726' : '#FFFFFF',
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {ar.customers.totalLabel}
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
          {total}
        </Text>
      </View>

      <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />

      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {ar.customers.withDebt}
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
          {active}
        </Text>
      </View>

      <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />

      <View style={styles.statCol}>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {ar.customers.paid}
        </Text>
        <Text variant="titleMedium" style={{ color: '#10B981', fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
          {paid}
        </Text>
      </View>
    </Surface>
  );
}

const CustomerCard = React.memo(function CustomerCard({ item, onPress, onWhatsApp, onCall }: { item: any; onPress: (item: any) => void; onWhatsApp: (customer: any) => void; onCall: (phone: string) => void }) {
  const theme = useTheme();
  const hasDebt = (item.total_debt || 0) > 0;
  const isOverdue = item.status === 'overdue';

  const badgeBg = !hasDebt
    ? theme.dark ? '#064E3B' : '#DCFCE7'
    : isOverdue
    ? theme.dark ? '#4C0519' : '#FFE4E6'
    : theme.dark ? '#1E1B4B' : '#EEF2FF';

  const badgeText = !hasDebt
    ? '#10B981'
    : isOverdue
    ? '#E11D48'
    : '#4F46E5';

  const safeName = item.name || 'عميل غير معرف';

  return (
    <Animated.View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(item)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {/* الصف العلوي: الصورة الرمزية + اسم العميل + وسم الدين / خالص */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.customerHeaderInfo}>
            <Avatar.Text
              size={44}
              label={safeName.substring(0, 2)}
              style={{
                backgroundColor: theme.colors.primaryContainer,
              }}
              color={theme.colors.primary}
            />
            <View style={styles.nameBlock}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}
                numberOfLines={1}
              >
                {safeName}
              </Text>
            </View>
          </View>

          <View style={[styles.debtTag, { backgroundColor: badgeBg }]}>
            <Text variant="labelSmall" style={{ color: badgeText, fontFamily: 'Cairo_700Bold' }}>
              {hasDebt ? formatCurrency(item.total_debt) : ar.customers.settled}
            </Text>
          </View>
        </View>

        {/* خط فاصل أنيق */}
        <View style={[styles.cardDivider, { backgroundColor: theme.colors.outlineVariant }]} />

        {/* الصف السفلي: الهاتف والعنوان في جهة + أزرار الواتساب والاتصال في جهة */}
        <View style={styles.cardBottomRow}>
          <View style={styles.metaContainer}>
            {item.phone ? (
              <View style={styles.iconMeta}>
                <Phone size={13} color={theme.colors.outline} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.outline, marginRight: 6, fontFamily: 'Cairo_500Medium' }}
                  numberOfLines={1}
                >
                  {item.phone}
                </Text>
              </View>
            ) : null}

            {item.address ? (
              <View style={[styles.iconMeta, { marginTop: item.phone ? 4 : 0 }]}>
                <MapPin size={13} color={theme.colors.outline} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.outline, marginRight: 6, fontFamily: 'Cairo_500Medium' }}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </View>
            ) : (
              !item.phone && (
                <Text variant="bodySmall" style={{ color: theme.colors.outline, fontFamily: 'Cairo_400Regular' }}>
                  لا توجد معلومات اتصال
                </Text>
              )
            )}
          </View>

          {item.phone ? (
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onWhatsApp(item)}
                style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MessageCircle size={17} color="#16A34A" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onCall(item.phone)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.primaryContainer }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <PhoneCall size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function CustomersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'paid'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: customersData = [], isLoading: loading, refetch, isRefetching } = useCustomers();
  const { data: allDebts = [] } = useDebts();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  const resetAccountMutation = useResetCustomerAccount();

  const customerDebts = selectedCustomer
    ? allDebts.filter((d: any) => d.customer_id === selectedCustomer.id)
    : [];
  const customerRemainingTotal = customerDebts.reduce(
    (acc: number, d: any) =>
      acc + (d.remaining_amount !== undefined ? d.remaining_amount : Math.max(0, (d.total_amount || 0) - (d.paid_amount || 0))),
    0,
  );

  const handleCallCustomer = (custPhone: string) => {
    if (custPhone) {
      Linking.openURL(`tel:${custPhone}`);
    }
  };

  const customTemplateCustomer = useAppStore(s => s.whatsappOrderMessage);

  const handleWhatsAppCustomer = (customerOrPhone: any) => {
    let customer =
      typeof customerOrPhone === 'object' && customerOrPhone !== null
        ? customerOrPhone
        : (customersData || []).find(
            (c: any) => c.phone === customerOrPhone || c.id === customerOrPhone
          ) || selectedCustomer || { phone: customerOrPhone, name: 'العميل' };

    const records = (allDebts || []).filter(
      (d: any) => d.customer_id === customer.id
    );

    openCustomerWhatsApp(customer, records, user?.name, customTemplateCustomer);
  };

  const handleOpenDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setDetailsModalVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم العميل الكامل');
      return;
    }

    try {
      setErrorMsg('');
      const fullAddress = governorate ? `${governorate} - ${district}` : '';
      
      if (editingCustomer) {
        await updateCustomerMutation.mutateAsync({
          id: editingCustomer.id,
          updates: {
            name: name.trim(),
            phone: phone.trim() || undefined,
            address: fullAddress || undefined,
            latitude: latitude || undefined,
            longitude: longitude || undefined,
          }
        });
      } else {
        await createCustomerMutation.mutateAsync({
          store_id: user?.id || '00000000-0000-0000-0000-000000000000',
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: fullAddress || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          status: 'active',
        });
      }

      // Reset & Close
      setName('');
      setPhone('');
      setGovernorate('');
      setDistrict('');
      setLatitude(null);
      setLongitude(null);
      setEditingCustomer(null);
      setModalVisible(false);
      if (editingCustomer) {
        setDetailsModalVisible(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ بيانات العميل');
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('إذن الوصول للموقع مطلوب');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch (err) {
      setErrorMsg('فشل الحصول على الموقع');
    }
  };

  const handleOpenMapForPicker = () => {
    if (latitude && longitude) {
      // يوجد موقع محدد مسبقاً → استخدمه
      setTempLocation({ latitude, longitude });
    } else if (district && governorate && DISTRICT_COORDINATES[governorate]?.[district]) {
      // يوجد منطقة محددة → استخدم إحداثياتها الدقيقة
      setTempLocation(DISTRICT_COORDINATES[governorate][district]);
    } else if (governorate && GOVERNORATE_COORDINATES[governorate]) {
      // يوجد محافظة فقط → استخدم مركز المحافظة
      setTempLocation(GOVERNORATE_COORDINATES[governorate]);
    } else {
      // لا يوجد شيء → بغداد كإحتياطي
      setTempLocation({ latitude: 33.3152, longitude: 44.3661 });
    }
    setMapModalVisible(true);
  };

  const handleEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditingCustomer(selectedCustomer);
    setName(selectedCustomer.name || '');
    setPhone(selectedCustomer.phone || '');
    
    if (selectedCustomer.address) {
      const parts = selectedCustomer.address.split(' - ');
      setGovernorate(parts[0] || '');
      setDistrict(parts[1] || '');
    } else {
      setGovernorate('');
      setDistrict('');
    }
    
    setLatitude(selectedCustomer.latitude || null);
    setLongitude(selectedCustomer.longitude || null);
    setModalVisible(true);
  };

  const handleConfirmMapLocation = () => {
    if (tempLocation) {
      setLatitude(tempLocation.latitude);
      setLongitude(tempLocation.longitude);
    }
    setMapModalVisible(false);
  };

  const confirmDeleteCustomerAlert = () => {
    if (!selectedCustomer) return;
    setDetailsModalVisible(false); // Close modal first to avoid z-index bugs
    setTimeout(() => {
      Alert.alert(
        'حذف العميل',
        `هل أنت متأكد من حذف العميل ${selectedCustomer?.name}؟` + 
        (customerRemainingTotal > 0 ? `\n\nتنبيه: هذا العميل لديه ديون غير مسددة بقيمة ${formatCurrency(customerRemainingTotal)}!` : ''),
        [
          { text: 'إلغاء', style: 'cancel', onPress: () => setDetailsModalVisible(true) },
          { 
            text: 'حذف مؤكد', 
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteCustomerMutation.mutateAsync(selectedCustomer.id);
              } catch (e: any) {}
            }
          }
        ]
      );
    }, 400); // Wait for modal animation to finish
  };

  const confirmResetAccountAlert = () => {
    if (!selectedCustomer) return;
    setDetailsModalVisible(false); // Close modal first
    setTimeout(() => {
      Alert.alert(
        'تصفير الحساب',
        `هل أنت متأكد من تصفير حساب العميل ${selectedCustomer?.name}؟\nهذا الإجراء سيجعل الرصيد المتبقي 0 وسيحول جميع الديون النشطة إلى مسددة مع الاحتفاظ بالسجل التاريخي.`,
        [
          { text: 'إلغاء', style: 'cancel', onPress: () => setDetailsModalVisible(true) },
          { 
            text: 'تأكيد التصفير', 
            style: 'destructive',
            onPress: async () => {
              try {
                await resetAccountMutation.mutateAsync({ customerId: selectedCustomer.id, storeId: selectedCustomer.store_id });
                // Don't reopen modal on success, or maybe we do? Let's reopen to show 0 balance
                setDetailsModalVisible(true);
              } catch (e: any) {
                setDetailsModalVisible(true);
              }
            }
          }
        ]
      );
    }, 400);
  };

  const handleRefresh = async () => {
    if (user?.id) {
      setIsSyncing(true);
      try {
        await runSync(user.id);
      } catch (err) {
        console.warn('Refresh sync failed', err);
      } finally {
        setIsSyncing(false);
        refetch();
      }
    } else {
      refetch();
    }
  };

  const data = customersData;

  const filtered = data.filter((c: any) => {
    const matchesQuery = !query || c.name?.includes(query) || (c.phone && c.phone.includes(query)) || (c.address && c.address.includes(query));
    if (filter === 'debt') return matchesQuery && (c.total_debt || 0) > 0;
    if (filter === 'paid') return matchesQuery && (c.total_debt || 0) === 0;
    return matchesQuery;
  });

  const totalCount = data.length;
  const activeDebtCount = data.filter((d: any) => (d.total_debt || 0) > 0).length;
  const paidCount = data.filter((d: any) => (d.total_debt || 0) === 0).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={[styles.topSection, { paddingTop: Math.max(insets.top, 12) }]}>
        <CustomerStatsHeader total={totalCount} active={activeDebtCount} paid={paidCount} />

        <TextInput
          mode="outlined"
          placeholder={ar.customers.search}
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          outlineStyle={styles.searchOutline}
          placeholderTextColor={theme.colors.outline}
          left={<TextInput.Icon icon={() => <Search size={20} color={theme.colors.outline} />} />}
        />

        <View style={styles.filterRow}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[styles.chip, filter === 'all' && { backgroundColor: theme.colors.primaryContainer }]}
            textStyle={[styles.chipText, filter === 'all' && { color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }]}
          >
            {ar.customers.filterAll} ({totalCount})
          </Chip>
          <Chip
            selected={filter === 'debt'}
            onPress={() => setFilter('debt')}
            style={[styles.chip, filter === 'debt' && { backgroundColor: theme.dark ? '#1E1B4B' : '#EEF2FF' }]}
            textStyle={[styles.chipText, filter === 'debt' && { color: '#4F46E5', fontFamily: 'Cairo_700Bold' }]}
          >
            {ar.customers.filterDebt} ({activeDebtCount})
          </Chip>
          <Chip
            selected={filter === 'paid'}
            onPress={() => setFilter('paid')}
            style={[styles.chip, filter === 'paid' && { backgroundColor: theme.dark ? '#064E3B' : '#D1FAE5' }]}
            textStyle={[styles.chipText, filter === 'paid' && { color: '#10B981', fontFamily: 'Cairo_700Bold' }]}
          >
            {ar.customers.filterPaid} ({paidCount})
          </Chip>
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <CustomerCard
            item={item}
            onPress={handleOpenDetails}
            onWhatsApp={handleWhatsAppCustomer}
            onCall={handleCallCustomer}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isSyncing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={{ color: theme.colors.outline, fontFamily: 'Cairo_700Bold' }}>
                {ar.customers.emptyTitle}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
                {ar.customers.emptySubtitle}
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB Button opens Add Customer Modal */}
      <FAB
        icon={() => <Plus size={24} color={theme.colors.onPrimary} />}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            bottom: 80 + insets.bottom,
          },
        ]}
        onPress={() => setModalVisible(true)}
      />

      {/* Modal - إضافة/تعديل عميل */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setEditingCustomer(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <UserCheck size={22} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingCustomer(null); }} style={styles.closeBtn}>
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              {errorMsg ? (
                <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                  <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                    {errorMsg}
                  </Text>
                </View>
              ) : null}

              <AppInput
                label="الاسم الكامل للعميل *"
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

              {/* اختيار المحافظة والمنطقة من القائمة العراقية */}
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 6, fontFamily: 'Cairo_600SemiBold' }}>
                العنوان (المحافظة والمنطقة)
              </Text>
              <IraqLocationPicker
                selectedGovernorate={governorate}
                selectedDistrict={district}
                onSelect={(gov, dist) => {
                  if (governorate !== gov || district !== dist) {
                    setLatitude(null);
                    setLongitude(null);
                  }
                  setGovernorate(gov);
                  setDistrict(dist);
                }}
              />

              <View style={{ height: 16 }} />
              <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 6, fontFamily: 'Cairo_600SemiBold' }}>
                موقع العميل على الخريطة (اختياري)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={handleGetCurrentLocation}
                  style={[styles.contactBarBtn, { backgroundColor: theme.colors.primaryContainer, flex: 1 }]}
                >
                  <MapPin size={18} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                    موقعي الحالي
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleOpenMapForPicker}
                  style={[styles.contactBarBtn, { backgroundColor: theme.dark ? '#111726' : '#F1F5F9', flex: 1, borderWidth: 1, borderColor: theme.colors.outlineVariant }]}
                >
                  <Map size={18} color={theme.colors.outline} />
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>
                    {latitude ? 'تم التحديد' : 'تحديد يدوي'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 24 }} />
              <AppButton
                label={editingCustomer ? "تحديث العميل" : "حفظ العميل"}
                onPress={handleSaveCustomer}
                loading={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - تفاصيل العميل كشف حساب والأقساط */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailsSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FileText size={22} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                  كشف حساب العميل التفصيلي
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity onPress={handleEditCustomer} style={styles.closeBtn}>
                  <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_600SemiBold', fontSize: 13 }}>تعديل</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={theme.colors.outline} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                {/* Customer Hero Header */}
                <View style={styles.detailsHeroRow}>
                  <Avatar.Text
                    size={56}
                    label={(selectedCustomer.name || 'ع').substring(0, 2)}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                      {selectedCustomer.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                      {selectedCustomer.phone || 'بدون رقم هاتف'}
                    </Text>
                    {selectedCustomer.address ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                        📍 {selectedCustomer.address}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Quick Action Contact Bar */}
                <View style={styles.quickContactRow}>
                  {selectedCustomer.phone ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleWhatsAppCustomer(selectedCustomer)}
                        style={[styles.contactBarBtn, { backgroundColor: '#DCFCE7' }]}
                      >
                        <MessageCircle size={18} color="#16A34A" />
                        <Text style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                          مراسلة واتساب
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCallCustomer(selectedCustomer.phone)}
                        style={[styles.contactBarBtn, { backgroundColor: theme.colors.primaryContainer }]}
                      >
                        <PhoneCall size={18} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                          اتصال هاتفي
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>

                <Divider style={{ marginVertical: 16 }} />

                {/* Financial Summary Card */}
                <Surface
                  style={[
                    styles.detailsStatsBox,
                    { backgroundColor: theme.dark ? '#111726' : '#F8FAFC', borderColor: theme.colors.outlineVariant },
                  ]}
                  elevation={0}
                >
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      المتبقي على العميل
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                      {formatCurrency(customerRemainingTotal)}
                    </Text>
                  </View>

                  <View style={styles.statDividerVert} />

                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      عدد السجلات
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                      {customerDebts.length}
                    </Text>
                  </View>

                  <View style={styles.statDividerVert} />

                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      الحالة المالية
                    </Text>
                    <Text variant="titleSmall" style={{ color: customerRemainingTotal > 0 ? '#D97706' : '#16A34A', fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                      {customerRemainingTotal > 0 ? 'نشط (عليه ديون)' : 'مسدد بالكامل'}
                    </Text>
                  </View>
                </Surface>

                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginTop: 18, marginBottom: 10 }}>
                  سجل الأقساط والديون لهذا العميل:
                </Text>

                {customerDebts.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      لا توجد ديون أو أقساط مسجلة لهذا العميل بعد
                    </Text>
                  </View>
                ) : (
                  customerDebts.map((debt: any) => {
                    const totalAmount = debt.total_amount || 0;
                    const paidAmount = debt.paid_amount || 0;
                    const remaining =
                      debt.remaining_amount !== undefined
                        ? debt.remaining_amount
                        : Math.max(0, totalAmount - paidAmount);
                    const progress = totalAmount > 0 ? paidAmount / totalAmount : 0;
                    const isPaid = debt.status === 'paid' || remaining <= 0;
                    const isOverdue = debt.status === 'overdue';
                    const statusBg = isPaid ? '#DCFCE7' : isOverdue ? '#FFE4E6' : '#FEF3C7';
                    const statusColor = isPaid ? '#16A34A' : isOverdue ? '#E11D48' : '#D97706';
                    const statusLabel = isPaid ? 'مسدد بالكامل' : isOverdue ? 'متأخر السداد' : 'جارِ السداد';

                    return (
                      <View
                        key={debt.id}
                        style={[styles.debtDetailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }} numberOfLines={1}>
                            {debt.title || 'بدون عنوان'}
                          </Text>
                          <View style={[styles.debtTag, { backgroundColor: statusBg }]}>
                            <Text variant="labelSmall" style={{ color: statusColor, fontFamily: 'Cairo_700Bold' }}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>

                        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 10 }}>
                          المبلغ: {formatCurrency(totalAmount)} • المسدد: {formatCurrency(paidAmount)} • المتبقي: {formatCurrency(remaining)}
                        </Text>

                        <View style={{ marginBottom: 6 }}>
                          <ProgressBar progress={progress} color={isPaid ? '#16A34A' : theme.colors.primary} style={{ height: 6, borderRadius: 3 }} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                          <Text variant="labelSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
                            نسبة السداد: {Math.round(progress * 100)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Map Preview */}
                {selectedCustomer.latitude && selectedCustomer.longitude ? (
                  <View style={{ marginTop: 16 }}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginBottom: 10 }}>
                      الموقع الجغرافي للعميل:
                    </Text>
                    <View style={{ height: 150, borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
                      <WebView
                        source={{ html: getLeafletHtml(selectedCustomer.latitude, selectedCustomer.longitude, false) }}
                        style={{ width: '100%', height: '100%' }}
                        scrollEnabled={false}
                        javaScriptEnabled={true}
                        originWhitelist={['*']}
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={async () => {
                        const lat = selectedCustomer.latitude;
                        const lng = selectedCustomer.longitude;
                        const geoUrl = Platform.OS === 'ios' ? `maps:${lat},${lng}?q=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}`;
                        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                        
                        try {
                          const supported = await Linking.canOpenURL(geoUrl);
                          if (supported) {
                            await Linking.openURL(geoUrl);
                          } else {
                            await Linking.openURL(webUrl);
                          }
                        } catch (error) {
                          await Linking.openURL(webUrl);
                        }
                      }}
                      style={[styles.contactBarBtn, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                      <Map size={18} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                        فتح في تطبيق الخرائط
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Divider style={{ marginVertical: 24 }} />

                <Text variant="titleSmall" style={{ color: theme.colors.error, fontFamily: 'Cairo_700Bold', marginBottom: 10 }}>
                  منطقة الخطر (إجراءات حساسة)
                </Text>
                <View style={{ gap: 10, marginBottom: 40 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={confirmResetAccountAlert}
                    style={[styles.contactBarBtn, { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }]}
                  >
                    <RefreshCcw size={18} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                      تصفير حساب العميل
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={confirmDeleteCustomerAlert}
                    style={[styles.contactBarBtn, { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }]}
                  >
                    <Trash2 size={18} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                      حذف العميل
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal */}
      <Modal visible={mapModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailsSheet, { backgroundColor: theme.colors.surface, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>تحديد الموقع</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}><X size={20} color={theme.colors.outline} /></TouchableOpacity>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              {tempLocation && (
                <WebView
                  key={`map-${tempLocation.latitude.toFixed(6)}-${tempLocation.longitude.toFixed(6)}`}
                  source={{ html: getLeafletHtml(tempLocation.latitude, tempLocation.longitude, true) }}
                  style={{ flex: 1 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  originWhitelist={['*']}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.lat && data.lng) {
                        setTempLocation({ latitude: data.lat, longitude: data.lng });
                      }
                    } catch (e) {}
                  }}
                />
              )}
            </View>
            <View style={{ padding: 16 }}>
              <AppButton label="تأكيد الموقع" onPress={handleConfirmMapLocation} />
            </View>
          </View>
        </View>
      </Modal>



    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { padding: 16, paddingBottom: 4 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  statCol: { alignItems: 'center' },
  statDivider: { width: 1, height: 26 },
  search: { fontFamily: 'Cairo_400Regular', fontSize: 14, marginBottom: 10 },
  searchOutline: { borderRadius: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  chip: { borderRadius: 20, height: 36 },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  listContent: { padding: 16, paddingTop: 4 },
  card: {
    padding: 14,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  nameBlock: {
    flex: 1,
  },
  cardDivider: {
    height: 1,
    opacity: 0.35,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaContainer: {
    flex: 1,
    paddingRight: 8,
  },
  iconMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  fab: { position: 'absolute', right: 20, borderRadius: 28 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  detailsSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    height: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontFamily: 'Cairo_700Bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    paddingVertical: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  detailsHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  contactBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 16,
  },
  detailsStatsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDividerVert: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  debtDetailCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
});
