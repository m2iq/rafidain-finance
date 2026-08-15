import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  FilePlus,
  History,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Send,
  Share2,
  UserCheck,
  UserPlus,
  X
} from "lucide-react-native";
import { memo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Avatar,
  Chip,
  FAB,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../core/store/appStore";
import {
  useCreateCustomer,
  useCustomers,
} from "../../features/customers/api/useCustomers";
import {
  useCreateDebt,
  useDebts,
  useDebtPayments,
  usePayDebt,
  useAddDebtItem,
  useDebtItems,
} from "../../features/debts/api/useDebts";
import AppButton from "../../shared/components/AppButton";
import AppInput from "../../shared/components/AppInput";
import ar from "../../shared/i18n/ar";
import { formatCurrency, formatDateTime, formatDateOnly } from "../../shared/utils/currency";

function DebtSummaryHeader({
  totalDebts,
  overdueAmount,
  collectedAmount,
}: {
  totalDebts: number;
  overdueAmount: number;
  collectedAmount: number;
}) {
  const theme = useTheme();

  return (
    <Surface
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.dark ? "#1E1B4B" : "#4F46E5",
          borderColor: theme.dark ? "#312E81" : "#6366F1",
        },
      ]}
      elevation={3}
    >
      <View style={styles.summaryTopRow}>
        <View style={styles.summaryTitleWrap}>
          <CreditCard size={18} color="#C7D2FE" />
          <Text
            variant="titleSmall"
            style={{ color: "#C7D2FE", fontFamily: "Cairo_600SemiBold" }}
          >
            {ar.debts.totalActiveDebts}
          </Text>
        </View>
      </View>

      <Text variant="displaySmall" style={styles.summaryTotalAmount}>
        {formatCurrency(totalDebts)}
      </Text>

      <View style={styles.summarySubRow}>
        <View style={styles.summarySubItem}>
          <Text variant="labelSmall" style={{ color: "#FDE68A" }}>
            {ar.debts.overdueInstallments}
          </Text>
          <Text
            variant="titleMedium"
            style={{
              color: "#EF4444",
              fontFamily: "Cairo_700Bold",
              marginTop: 2,
            }}
          >
            {formatCurrency(overdueAmount)}
          </Text>
        </View>

        <View style={styles.summarySubDivider} />

        <View style={styles.summarySubItem}>
          <Text variant="labelSmall" style={{ color: "#A7F3D0" }}>
            {ar.debts.paid}
          </Text>
          <Text
            variant="titleMedium"
            style={{
              color: "#34D399",
              fontFamily: "Cairo_700Bold",
              marginTop: 2,
            }}
          >
            {formatCurrency(collectedAmount)}
          </Text>
        </View>
      </View>
    </Surface>
  );
}

const DebtCard = memo(function DebtCard({
  item,
  onPay,
  onViewHistory,
  onWhatsApp,
}: {
  item: any;
  onPay: (item: any) => void;
  onViewHistory: (item: any) => void;
  onWhatsApp: (item: any) => void;
}) {
  const theme = useTheme();
  const totalAmount = item.total_amount || item.totalAmount || 0;
  const paidAmount = item.paid_amount || item.paidAmount || 0;
  const remaining =
    item.remaining_amount !== undefined
      ? item.remaining_amount
      : Math.max(0, totalAmount - paidAmount);
  const progress = totalAmount > 0 ? paidAmount / totalAmount : 0;
  const percentText = Math.round(progress * 100);

  const isOverdue = item.status === "overdue";
  const isPaid = item.status === "paid" || remaining <= 0;

  const statusBg = isPaid
    ? theme.dark
      ? "#064E3B"
      : "#DCFCE7"
    : isOverdue
      ? theme.dark
        ? "#4C0519"
        : "#FEE2E2"
      : theme.dark
        ? "#332612"
        : "#FEF3C7";

  const statusColor = isPaid ? "#16A34A" : isOverdue ? "#EF4444" : "#D97706";

  const statusLabel = isPaid
    ? ar.debts.statusPaid
    : isOverdue
      ? ar.debts.statusOverdue
      : ar.debts.statusActive;

  const safeName = item.customerName || "عميل غير معرف";

  return (
    <Animated.View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onViewHistory(item)}
        style={[
          styles.debtCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <Avatar.Text
              size={44}
              label={safeName.substring(0, 2)}
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
            <View style={styles.nameBlock}>
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onSurface,
                  fontFamily: "Cairo_700Bold",
                }}
              >
                {safeName}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.outline, marginTop: 2 }}
              >
                {item.customerPhone || "---"}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text
              variant="labelSmall"
              style={{ color: statusColor, fontFamily: "Cairo_700Bold" }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.titleWrap}>
          <Text
            variant="titleMedium"
            style={[styles.debtTitle, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        <View
          style={[
            styles.amountsBox,
            {
              backgroundColor: theme.dark ? "#111726" : "#F8FAFC",
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.amountCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              إجمالي الدين
            </Text>
            <Text
              variant="titleSmall"
              style={{
                color: theme.colors.onSurface,
                fontFamily: "Cairo_700Bold",
                marginTop: 2,
              }}
            >
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          <View style={styles.colDivider} />

          <View style={styles.amountCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              المسدد
            </Text>
            <Text
              variant="titleSmall"
              style={{
                color: "#16A34A",
                fontFamily: "Cairo_700Bold",
                marginTop: 2,
              }}
            >
              {formatCurrency(paidAmount)}
            </Text>
          </View>

          <View style={styles.colDivider} />

          <View style={styles.amountCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              المتبقي
            </Text>
            <Text
              variant="titleSmall"
              style={{
                color: isPaid ? "#16A34A" : theme.colors.error,
                fontFamily: "Cairo_700Bold",
                marginTop: 2,
              }}
            >
              {formatCurrency(Math.max(0, remaining))}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              نسبة السداد
            </Text>
            <Text
              variant="labelSmall"
              style={{
                color: isPaid ? "#16A34A" : theme.colors.primary,
                fontFamily: "Cairo_700Bold",
              }}
            >
              {percentText}%
            </Text>
          </View>
          <ProgressBar
            progress={progress}
            color={
              isPaid ? "#16A34A" : isOverdue ? "#EF4444" : theme.colors.primary
            }
            style={styles.progressBar}
          />
        </View>

        <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.colors.outlineVariant },
          ]}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onViewHistory(item)}
              style={[
                styles.historyButton,
                { backgroundColor: theme.dark ? "#1E293B" : "#F1F5F9" },
              ]}
            >
              <History size={14} color={theme.colors.onSurfaceVariant} />
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: "Cairo_600SemiBold",
                }}
              >
                سجل التسديدات
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onWhatsApp(item)}
              style={[
                styles.historyButton,
                { backgroundColor: theme.dark ? "#064E3B" : "#DCFCE7", borderColor: "#16A34A", borderWidth: 1 },
              ]}
            >
              <MessageCircle size={14} color="#16A34A" />
              <Text
                variant="labelSmall"
                style={{
                  color: "#16A34A",
                  fontFamily: "Cairo_600SemiBold",
                }}
              >
                مراسلة
              </Text>
            </TouchableOpacity>
          </View>

          {!isPaid && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onPay(item)}
              style={[
                styles.payButton,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <DollarSign size={14} color={theme.colors.primary} />
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.primary,
                  fontFamily: "Cairo_700Bold",
                }}
              >
                تسديد دفعة
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function DebtsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);

  const { data: dbCustomers = [] } = useCustomers();
  const { data: dbDebts = [], refetch, isRefetching } = useDebts();
  const createCustomerMutation = useCreateCustomer();
  const createDebtMutation = useCreateDebt();
  const addDebtItemMutation = useAddDebtItem();
  const payDebtMutation = usePayDebt();

  const [filter, setFilter] = useState<"all" | "active" | "overdue" | "paid">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"debts" | "installments">("debts");

  // Main Modals
  const [addModalVisible, setAddModalVisible] = useState(false); // for debts
  const [addInstallmentModalVisible, setAddInstallmentModalVisible] = useState(false); // for installments
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [custPickerVisible, setCustPickerVisible] = useState(false);
  const [quickAddCustVisible, setQuickAddCustVisible] = useState(false);
  const [custSearchQuery, setCustSearchQuery] = useState("");

  // Quick Add Customer Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [quickCustError, setQuickCustError] = useState("");

  // Selected Debt & Customer State
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  // Add Debt Form State
  const [debtTitle, setDebtTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  // Add Installment Form State
  const [productName, setProductName] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [installments, setInstallments] = useState("4");

  // Pay Form State
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "other">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Detailed History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<any>(null);

  // Safely map available customers for current user only
  const allAvailableCustomers = dbCustomers
    .filter((c) => c && c.name)
    .map((c) => ({
      id: c.id,
      name: c.name || "عميل غير معرف",
      phone: c.phone || "",
    }));

  const filteredCustomers = allAvailableCustomers.filter(
    (c) =>
      !custSearchQuery ||
      (c.name && c.name.includes(custSearchQuery)) ||
      (c.phone && c.phone.includes(custSearchQuery)),
  );

  const handleSelectCustomer = (cust: {
    id: string;
    name: string;
    phone: string;
  }) => {
    setSelectedCustomer(cust);
    setCustPickerVisible(false);
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustName.trim()) {
      setQuickCustError("يرجى كتابة اسم العميل الكامل");
      return;
    }

    if (!user?.id) {
      setQuickCustError("يرجى تسجيل الدخول أولاً");
      return;
    }

    try {
      setQuickCustError("");
      const created = await createCustomerMutation.mutateAsync({
        store_id: user.id,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        status: "active",
      });

      // Auto-select this newly created customer!
      const newCustObj = {
        id: created.id,
        name: created.name,
        phone: created.phone || newCustPhone.trim(),
      };

      setSelectedCustomer(newCustObj);

      // Reset & Close quick add and picker sheets
      setNewCustName("");
      setNewCustPhone("");
      setQuickAddCustVisible(false);
      setCustPickerVisible(false);
    } catch (err: any) {
      setQuickCustError(err.message || "فشل حفظ العميل");
    }
  };

  const handleAddDebt = async () => {
    if (!user?.id) {
      setFormError("يرجى تسجيل الدخول أولاً لإضافة دين");
      return;
    }

    if (!selectedCustomer || !debtTitle.trim() || !totalAmount.trim()) {
      setFormError("يرجى اختيار العميل وتعبئة تفاصيل الدين والمبلغ");
      return;
    }

    const numericAmount = parseFloat(totalAmount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("يرجى إدخال مبلغ صحيح بالدينار العراقي");
      return;
    }

    try {
      setFormError("");

      const activeDebt = dbDebts.find((d: any) => d.customer_id === selectedCustomer.id && d.type === 'debt' && d.status !== 'paid');

      if (activeDebt) {
        await addDebtItemMutation.mutateAsync({
          debtId: activeDebt.id,
          description: debtTitle.trim(),
          amount: numericAmount,
          storeId: user.id,
        });
      } else {
        await createDebtMutation.mutateAsync({
          customer_id: selectedCustomer.id,
          store_id: user.id,
          title: 'حساب دين عام',
          total_amount: numericAmount,
          type: 'debt',
        });
      }

      // Reset
      setSelectedCustomer(null);
      setDebtTitle("");
      setTotalAmount("");
      setFormError("");
      setAddModalVisible(false);
    } catch (err: any) {
      setFormError(err.message || "فشل إضافة الدين");
    }
  };

  const handleAddInstallment = async () => {
    if (!user?.id) {
      setFormError("يرجى تسجيل الدخول أولاً لإضافة قسط");
      return;
    }

    if (!selectedCustomer || !productName.trim() || !totalAmount.trim()) {
      setFormError("يرجى اختيار العميل وتعبئة اسم المنتج والمبلغ الكلي");
      return;
    }

    const numericAmount = parseFloat(totalAmount.replace(/,/g, ""));
    const numericDownPayment = downPayment.trim() ? parseFloat(downPayment.replace(/,/g, "")) : 0;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("يرجى إدخال مبلغ صحيح بالدينار العراقي");
      return;
    }

    try {
      setFormError("");
      await createDebtMutation.mutateAsync({
        customer_id: selectedCustomer.id,
        store_id: user.id,
        title: productName.trim(),
        total_amount: numericAmount,
        down_payment: numericDownPayment,
        type: 'installment',
      });

      // Reset
      setSelectedCustomer(null);
      setProductName("");
      setTotalAmount("");
      setDownPayment("");
      setInstallments("4");
      setFormError("");
      setAddInstallmentModalVisible(false);
    } catch (err: any) {
      setFormError(err.message || "فشل إضافة القسط");
    }
  };

  const handleOpenPay = (debt: any) => {
    setSelectedDebt(debt);
    const rem =
      debt.remaining_amount !== undefined
        ? debt.remaining_amount
        : Math.max(0, (debt.total_amount || 0) - (debt.paid_amount || 0));
    setPayAmount(rem ? rem.toString() : "");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setFormError("");
    setPayModalVisible(true);
  };

  const handleOpenHistory = (debt: any) => {
    setSelectedDebtForHistory(debt);
    setHistoryModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt || !user?.id) return;
    const numericPay = parseFloat(payAmount.replace(/,/g, ""));
    if (isNaN(numericPay) || numericPay <= 0) {
      setFormError("يرجى إدخال مبلغ دفع صحيح");
      return;
    }

    try {
      setFormError("");
      await payDebtMutation.mutateAsync({
        debtId: selectedDebt.id,
        amount: numericPay,
        storeId: user.id,
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });

      setPayModalVisible(false);
      setSelectedDebt(null);
      setPayAmount("");
      setPaymentNotes("");
    } catch (err: any) {
      setFormError(err.message || "فشل تسديد القسط");
    }
  };

  const handleWhatsApp = (item: any) => {
    if (!item.customerPhone) {
      alert("لا يوجد رقم هاتف مسجل لهذا العميل");
      return;
    }
    
    const totalAmount = item.total_amount || item.totalAmount || 0;
    const paidAmount = item.paid_amount || item.paidAmount || 0;
    const remaining = item.remaining_amount !== undefined ? item.remaining_amount : Math.max(0, totalAmount - paidAmount);
    
    const isInstallment = item.type === 'installment';
    const text = isInstallment
      ? `مرحباً، نود تذكيركم بتسديد القسط المستحق من: ${item.title}.\nإجمالي المبلغ: ${formatCurrency(totalAmount)}\nالمتبقي: ${formatCurrency(remaining)}\nيرجى التسديد في أقرب وقت. شكراً لكم.`
      : `مرحباً، لديك دفعة مستحقة لدين: ${item.title}.\nإجمالي الدين: ${formatCurrency(totalAmount)}\nالمتبقي: ${formatCurrency(remaining)}\nيرجى التسديد في أقرب وقت. شكراً لكم.`;
      
    let phone = item.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    }
    
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() => {
      alert("تعذر فتح واتساب، يرجى التأكد من تثبيت التطبيق.");
    });
  };

  const filtered = dbDebts.filter((item: any) => {
    const isInstallment = item.type === 'installment';
    if (activeTab === 'debts' && isInstallment) return false;
    if (activeTab === 'installments' && !isInstallment) return false;

    const custName = item.customerName || "";
    const custPhone = item.customerPhone || "";
    const dTitle = item.title || "";

    const matchesQuery =
      !query ||
      custName.includes(query) ||
      dTitle.includes(query) ||
      custPhone.includes(query);
    if (filter === "all") return matchesQuery;
    return matchesQuery && item.status === filter;
  });

  const activeTabData = dbDebts.filter((item: any) => {
    const isInstallment = item.type === 'installment';
    return (activeTab === 'debts' && !isInstallment) || (activeTab === 'installments' && isInstallment);
  });

  const totalDebts = activeTabData.reduce(
    (acc: number, item: any) => acc + (item.total_amount || 0),
    0,
  );
  const overdueAmount = activeTabData
    .filter((item: any) => item.status === "overdue")
    .reduce((acc: number, item: any) => acc + (item.remaining_amount || 0), 0);
  const collectedAmount = activeTabData.reduce(
    (acc: number, item: any) => acc + (item.paid_amount || 0),
    0,
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <View
        style={[styles.topSection, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <DebtSummaryHeader
          totalDebts={totalDebts}
          overdueAmount={overdueAmount}
          collectedAmount={collectedAmount}
        />

        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "debts" | "installments")}
            buttons={[
              {
                value: "debts",
                label: ar.debts.tabDebts,
                checkedColor: theme.colors.onPrimary,
                style: activeTab === "debts" ? { backgroundColor: theme.colors.primary } : {},
              },
              {
                value: "installments",
                label: ar.debts.tabInstallments,
                checkedColor: theme.colors.onPrimary,
                style: activeTab === "installments" ? { backgroundColor: theme.colors.primary } : {},
              },
            ]}
          />
        </View>

        <TextInput
          mode="outlined"
          placeholder={activeTab === 'debts' ? ar.debts.searchDebts : ar.debts.searchInstallments}
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          outlineStyle={styles.searchOutline}
          placeholderTextColor={theme.colors.outline}
          left={
            <TextInput.Icon
              icon={() => <Search size={20} color={theme.colors.outline} />}
            />
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            style={[
              styles.filterChip,
              filter === "all" && {
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
            textStyle={[
              styles.chipText,
              filter === "all" && {
                color: theme.colors.primary,
                fontFamily: "Cairo_700Bold",
              },
            ]}
          >
            {ar.debts.filterAll} ({dbDebts.length})
          </Chip>

          <Chip
            selected={filter === "active"}
            onPress={() => setFilter("active")}
            style={[
              styles.filterChip,
              filter === "active" && { backgroundColor: "#FEF3C7" },
            ]}
            textStyle={[
              styles.chipText,
              filter === "active" && {
                color: "#D97706",
                fontFamily: "Cairo_700Bold",
              },
            ]}
          >
            {ar.debts.filterActive}
          </Chip>

          <Chip
            selected={filter === "overdue"}
            onPress={() => setFilter("overdue")}
            style={[
              styles.filterChip,
              filter === "overdue" && { backgroundColor: "#FEE2E2" },
            ]}
            textStyle={[
              styles.chipText,
              filter === "overdue" && {
                color: "#EF4444",
                fontFamily: "Cairo_700Bold",
              },
            ]}
          >
            {ar.debts.filterOverdue}
          </Chip>

          <Chip
            selected={filter === "paid"}
            onPress={() => setFilter("paid")}
            style={[
              styles.filterChip,
              filter === "paid" && { backgroundColor: "#DCFCE7" },
            ]}
            textStyle={[
              styles.chipText,
              filter === "paid" && {
                color: "#16A34A",
                fontFamily: "Cairo_700Bold",
              },
            ]}
          >
            {ar.debts.filterPaid}
          </Chip>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <DebtCard
            item={item}
            onPay={handleOpenPay}
            onViewHistory={handleOpenHistory}
            onWhatsApp={handleWhatsApp}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.outline,
                fontFamily: "Cairo_700Bold",
              }}
            >
              {activeTab === 'debts' ? ar.debts.emptyTitleDebts : ar.debts.emptyTitleInstallments}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.outline, marginTop: 8 }}
            >
              {activeTab === 'debts' ? ar.debts.emptySubtitleDebts : ar.debts.emptySubtitleInstallments}
            </Text>
          </View>
        }
      />

      <FAB
        icon={() => <Plus size={24} color={theme.colors.onPrimary} />}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            bottom: 80 + insets.bottom,
          },
        ]}
        onPress={() => {
          if (activeTab === 'debts') setAddModalVisible(true);
          else setAddInstallmentModalVisible(true);
        }}
      />

      {/* Modal - إضافة دين جديد */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FilePlus size={22} color={theme.colors.primary} />
                <Text
                  variant="titleLarge"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  {ar.debts.addDebt}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              {formError ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.colors.errorContainer },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onErrorContainer,
                      fontFamily: "Cairo_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {formError}
                  </Text>
                </View>
              ) : null}

              {/* اختيار العميل */}
              <Text
                variant="labelMedium"
                style={{
                  color: theme.colors.outline,
                  marginBottom: 6,
                  fontFamily: "Cairo_600SemiBold",
                }}
              >
                العميل المستفيد *
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCustPickerVisible(true)}
                style={[
                  styles.customerSelectTrigger,
                  {
                    backgroundColor: selectedCustomer
                      ? theme.colors.primaryContainer
                      : theme.dark
                        ? "#1E293B"
                        : "#F8FAFC",
                    borderColor: selectedCustomer
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.triggerCustomerInfo}>
                  <Avatar.Text
                    size={36}
                    label={
                      selectedCustomer
                        ? (selectedCustomer.name || "ع").substring(0, 2)
                        : "?"
                    }
                    style={{
                      backgroundColor: selectedCustomer
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    }}
                    color="#FFFFFF"
                  />
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: selectedCustomer
                          ? theme.colors.primary
                          : theme.colors.outline,
                        fontFamily: "Cairo_700Bold",
                      }}
                    >
                      {selectedCustomer
                        ? selectedCustomer.name
                        : "اضغط هنا لاختيار العميل من القائمة..."}
                    </Text>
                    {selectedCustomer && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.outline, marginTop: 2 }}
                      >
                        {selectedCustomer.phone}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronDown
                  size={20}
                  color={
                    selectedCustomer
                      ? theme.colors.primary
                      : theme.colors.outline
                  }
                />
              </TouchableOpacity>

              <View style={{ height: 14 }} />

              <AppInput
                label="تفاصيل الدين *"
                icon="file-text"
                value={debtTitle}
                onChangeText={setDebtTitle}
              />
              <View style={{ height: 12 }} />
              <AppInput
                label="المبلغ الكلي (بالدينار العراقي) *"
                icon="dollar-sign"
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="numeric"
              />

              <View style={{ height: 24 }} />
              <AppButton label="حفظ الدين" onPress={handleAddDebt} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - تسجيل بيع بالتقسيط */}
      <Modal
        visible={addInstallmentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddInstallmentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FilePlus size={22} color={theme.colors.primary} />
                <Text
                  variant="titleLarge"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  {ar.debts.addInstallment}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddInstallmentModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              {formError ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.colors.errorContainer },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onErrorContainer,
                      fontFamily: "Cairo_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {formError}
                  </Text>
                </View>
              ) : null}

              {/* اختيار العميل */}
              <Text
                variant="labelMedium"
                style={{
                  color: theme.colors.outline,
                  marginBottom: 6,
                  fontFamily: "Cairo_600SemiBold",
                }}
              >
                العميل المستفيد *
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCustPickerVisible(true)}
                style={[
                  styles.customerSelectTrigger,
                  {
                    backgroundColor: selectedCustomer
                      ? theme.colors.primaryContainer
                      : theme.dark
                        ? "#1E293B"
                        : "#F8FAFC",
                    borderColor: selectedCustomer
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.triggerCustomerInfo}>
                  <Avatar.Text
                    size={36}
                    label={
                      selectedCustomer
                        ? (selectedCustomer.name || "ع").substring(0, 2)
                        : "?"
                    }
                    style={{
                      backgroundColor: selectedCustomer
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    }}
                    color="#FFFFFF"
                  />
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: selectedCustomer
                          ? theme.colors.primary
                          : theme.colors.outline,
                        fontFamily: "Cairo_700Bold",
                      }}
                    >
                      {selectedCustomer
                        ? selectedCustomer.name
                        : "اضغط هنا لاختيار العميل من القائمة..."}
                    </Text>
                    {selectedCustomer && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.outline, marginTop: 2 }}
                      >
                        {selectedCustomer.phone}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronDown
                  size={20}
                  color={
                    selectedCustomer
                      ? theme.colors.primary
                      : theme.colors.outline
                  }
                />
              </TouchableOpacity>

              <View style={{ height: 14 }} />

              <AppInput
                label="اسم المنتج / البضاعة *"
                icon="shopping-bag"
                value={productName}
                onChangeText={setProductName}
              />
              <View style={{ height: 12 }} />
              <AppInput
                label="المبلغ الكلي (بالدينار العراقي) *"
                icon="dollar-sign"
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="numeric"
              />
              <View style={{ height: 12 }} />
              <AppInput
                label="الدفعة المقدمة (اختياري)"
                icon="dollar-sign"
                value={downPayment}
                onChangeText={setDownPayment}
                keyboardType="numeric"
              />
              <View style={{ height: 12 }} />
              <AppInput
                label="عدد الأقساط"
                icon="calendar"
                value={installments}
                onChangeText={setInstallments}
                keyboardType="number-pad"
              />

              <View style={{ height: 24 }} />
              <AppButton label="حفظ خطة التقسيط" onPress={handleAddInstallment} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - اختيار العميل المسجل مع زر إضافة عميل جديد فوري */}
      <Modal
        visible={custPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCustPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.custPickerSheet,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <UserCheck size={22} color={theme.colors.primary} />
                <Text
                  variant="titleMedium"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  اختر العميل المسجل
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCustPickerVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14, paddingBottom: 6 }}>
              {/* زر إضافة عميل جديد فوري */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setQuickAddCustVisible(true)}
                style={[
                  styles.quickAddBtn,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <UserPlus size={18} color={theme.colors.primary} />
                <Text
                  variant="labelLarge"
                  style={{
                    color: theme.colors.primary,
                    fontFamily: "Cairo_700Bold",
                  }}
                >
                  + إضافة عميل جديد واختياره تلقائياً
                </Text>
              </TouchableOpacity>

              <View style={{ height: 8 }} />

              <TextInput
                mode="outlined"
                placeholder="ابحث عن العميل بالاسم أو الرقم..."
                value={custSearchQuery}
                onChangeText={setCustSearchQuery}
                style={[
                  styles.search,
                  { backgroundColor: theme.colors.background },
                ]}
                outlineStyle={styles.searchOutline}
                placeholderTextColor={theme.colors.outline}
                left={
                  <TextInput.Icon
                    icon={() => (
                      <Search size={18} color={theme.colors.outline} />
                    )}
                  />
                }
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: 20,
              }}
            >
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                const safeCustName = cust.name || "عميل غير معرف";

                return (
                  <TouchableOpacity
                    key={cust.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectCustomer(cust)}
                    style={[
                      styles.custPickerItem,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primaryContainer
                          : theme.dark
                            ? "#111726"
                            : "#F8FAFC",
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <Avatar.Text
                      size={40}
                      label={safeCustName.substring(0, 2)}
                      style={{
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                      }}
                      color="#FFFFFF"
                    />
                    <View style={styles.custPickerItemText}>
                      <Text
                        variant="titleSmall"
                        style={{
                          color: theme.colors.onSurface,
                          fontFamily: "Cairo_700Bold",
                        }}
                      >
                        {safeCustName}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.outline, marginTop: 2 }}
                      >
                        {cust.phone || "بدون رقم هاتف"}
                      </Text>
                    </View>

                    {isSelected && (
                      <Check
                        size={20}
                        color={theme.colors.primary}
                        strokeWidth={2.5}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub-Modal: إضافة عميل جديد فوري واختياره مباشرة */}
      <Modal
        visible={quickAddCustVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQuickAddCustVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlayCenter}
        >
          <View
            style={[
              styles.payModalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <UserPlus size={22} color={theme.colors.primary} />
                <Text
                  variant="titleMedium"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  تسجيل عميل جديد واختياره
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setQuickAddCustVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              {quickCustError ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: theme.colors.errorContainer,
                      marginBottom: 12,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onErrorContainer,
                      fontFamily: "Cairo_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {quickCustError}
                  </Text>
                </View>
              ) : null}

              <AppInput
                label="الاسم الكامل للعميل *"
                icon="user"
                value={newCustName}
                onChangeText={setNewCustName}
              />
              <View style={{ height: 10 }} />
              <AppInput
                label="رقم الهاتف"
                icon="phone"
                value={newCustPhone}
                onChangeText={setNewCustPhone}
                keyboardType="phone-pad"
              />

              <View style={{ height: 20 }} />
              <AppButton
                label="حفظ واختيار العميل فوراً"
                onPress={handleQuickAddCustomer}
                loading={createCustomerMutation.isPending}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - تسديد دفعة / قسط */}
      <Modal
        visible={payModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPayModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlayCenter}
        >
          <View
            style={[
              styles.payModalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <CheckCircle size={22} color="#16A34A" />
                <Text
                  variant="titleMedium"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  تسديد دفعة / قسط
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            {selectedDebt && (
              <View style={{ paddingVertical: 14 }}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.outline }}
                >
                  العميل:{" "}
                  <Text
                    style={{
                      color: theme.colors.onSurface,
                      fontFamily: "Cairo_700Bold",
                    }}
                  >
                    {selectedDebt.customerName}
                  </Text>
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.outline, marginTop: 4 }}
                >
                  المتبقي:{" "}
                  <Text
                    style={{
                      color: theme.colors.error,
                      fontFamily: "Cairo_700Bold",
                    }}
                  >
                    {formatCurrency(
                      selectedDebt.remaining_amount !== undefined
                        ? selectedDebt.remaining_amount
                        : Math.max(
                            0,
                            (selectedDebt.total_amount || 0) -
                              (selectedDebt.paid_amount || 0),
                          ),
                    )}
                  </Text>
                </Text>

                <View style={{ height: 16 }} />
                <AppInput
                  label="مبلغ الدفعة (د.ع) *"
                  icon="dollar-sign"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                />

                <View style={{ height: 12 }} />
                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.outline,
                    marginBottom: 6,
                    fontFamily: "Cairo_600SemiBold",
                  }}
                >
                  طريقة الدفع *
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                  <Chip
                    selected={paymentMethod === "cash"}
                    onPress={() => setPaymentMethod("cash")}
                    style={
                      paymentMethod === "cash"
                        ? { backgroundColor: theme.colors.primaryContainer }
                        : {}
                    }
                  >
                    💵 نقداً (كاش)
                  </Chip>
                  <Chip
                    selected={paymentMethod === "transfer"}
                    onPress={() => setPaymentMethod("transfer")}
                    style={
                      paymentMethod === "transfer"
                        ? { backgroundColor: theme.colors.primaryContainer }
                        : {}
                    }
                  >
                    💳 زين كاش
                  </Chip>
                  <Chip
                    selected={paymentMethod === "other"}
                    onPress={() => setPaymentMethod("other")}
                    style={
                      paymentMethod === "other"
                        ? { backgroundColor: theme.colors.primaryContainer }
                        : {}
                    }
                  >
                    📝 أخرى
                  </Chip>
                </View>

                <AppInput
                  label="ملاحظات التسديد (اختياري)"
                  icon="file-text"
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="مثال: قسط شهر آب / تسديد جزئي"
                />

                {formError ? (
                  <Text
                    style={{
                      color: theme.colors.error,
                      marginTop: 8,
                      fontSize: 12,
                      fontFamily: "Cairo_600SemiBold",
                    }}
                  >
                    {formError}
                  </Text>
                ) : null}

                <View style={{ height: 20 }} />
                <AppButton
                  label="تأكيد التسديد"
                  onPress={handleConfirmPayment}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - سجل التسديدات التفصيلي والتاريخ والوقت */}
      <DebtPaymentHistoryModal
        visible={historyModalVisible}
        debt={selectedDebtForHistory}
        onClose={() => setHistoryModalVisible(false)}
        onRecordPaymentSuccess={() => {
          refetch();
        }}
      />
    </View>
  );
}

function DebtPaymentHistoryModal({
  visible,
  debt,
  onClose,
  onRecordPaymentSuccess,
}: {
  visible: boolean;
  debt: any;
  onClose: () => void;
  onRecordPaymentSuccess?: () => void;
}) {
  const theme = useTheme();
  const user = useAppStore((s) => s.user);
  const { data: payments = [], refetch: refetchPayments } = useDebtPayments(debt?.id);
  const { data: items = [], refetch: refetchItems } = useDebtItems(debt?.id);
  const payMutation = usePayDebt();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  if (!debt) return null;

  const totalAmount = debt.total_amount || 0;
  const paidAmount = debt.paid_amount || 0;
  const remaining =
    debt.remaining_amount !== undefined
      ? debt.remaining_amount
      : Math.max(0, totalAmount - paidAmount);
  const isPaid = remaining <= 0;

  const handlePay = async () => {
    if (!user?.id) return;
    const cleanAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError("يرجى إدخال مبلغ تسديد صحيح");
      return;
    }

    try {
      setError("");
      await payMutation.mutateAsync({
        debtId: debt.id,
        amount: cleanAmount,
        storeId: user.id,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });

      setAmount("");
      setNotes("");
      setShowAddForm(false);
      refetchPayments();
      refetchItems();
      if (onRecordPaymentSuccess) onRecordPaymentSuccess();
    } catch (err: any) {
      setError(err.message || "فشل تسديد الدفعة");
    }
  };

  const handleShareReceipt = (payment: any) => {
    const phone = debt.customerPhone ? debt.customerPhone.replace(/[^0-9]/g, '') : '';
    const dateStr = formatDateTime(payment.created_at || payment.payment_date);
    const methodStr =
      payment.payment_method === 'transfer'
        ? 'تحويل بنكي / زين كاش'
        : payment.payment_method === 'other'
          ? 'طريقة أخرى'
          : 'نقداً (كاش)';

    const typeStr = payment.type === 'down_payment' ? 'دفعة مقدمة' : 'تسديد قسط/دين';
    const noteStr = payment.notes ? `\nالملاحظة: ${payment.notes}` : '';

    const text = `إيصال تسديد رسمي 🧾
المحل: ديون وأقساط الرافدين
العميل: ${debt.customerName || 'المحترم'}
المنتج/الدين: ${debt.title || ''}
----------------------------------
نوع العملية: ${typeStr}
المبلغ المسدد: ${formatCurrency(payment.amount)}
طريقة الدفع: ${methodStr}${noteStr}
التاريخ والوقت: ${dateStr}
----------------------------------
إجمالي الدين: ${formatCurrency(totalAmount)}
إجمالي المسدد: ${formatCurrency(paidAmount)}
المتبقي الكلي: ${formatCurrency(Math.max(0, remaining))}
----------------------------------
شكراً لالتزامكم بالسداد! 🙏`;

    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  const history = [
    ...payments.map((p: any) => ({ ...p, _type: 'payment' })),
    ...items.map((i: any) => ({ ...i, _type: 'item' }))
  ].sort((a, b) => new Date(b.created_at || b.item_date || b.payment_date).getTime() - new Date(a.created_at || a.item_date || a.payment_date).getTime());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.custPickerSheet,
            { backgroundColor: theme.colors.surface, height: '88%', maxHeight: '90%' },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Receipt size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  variant="titleMedium"
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  سجل التسديدات والتفاصيل
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                  {debt.customerName} • {debt.title}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.outline} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          >
            {/* Summary Card */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.dark ? "#1E1B4B" : "#EEF2FF",
                  borderColor: theme.colors.primary,
                  marginBottom: 16,
                  padding: 16,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>إجمالي الدين</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>

                <View style={{ width: 1, height: 28, backgroundColor: 'rgba(148, 163, 184, 0.3)' }} />

                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>المسدد</Text>
                  <Text variant="titleSmall" style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                    {formatCurrency(paidAmount)}
                  </Text>
                </View>

                <View style={{ width: 1, height: 28, backgroundColor: 'rgba(148, 163, 184, 0.3)' }} />

                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>المتبقي</Text>
                  <Text variant="titleSmall" style={{ color: isPaid ? '#16A34A' : theme.colors.error, fontFamily: 'Cairo_700Bold', marginTop: 2 }}>
                    {formatCurrency(Math.max(0, remaining))}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action to Add Payment */}
            {!isPaid && (
              <View style={{ marginBottom: 16 }}>
                {!showAddForm ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowAddForm(true)}
                    style={[
                      styles.quickAddBtn,
                      { backgroundColor: theme.colors.primaryContainer, justifyContent: 'center' },
                    ]}
                  >
                    <Plus size={18} color={theme.colors.primary} />
                    <Text
                      variant="labelLarge"
                      style={{
                        color: theme.colors.primary,
                        fontFamily: "Cairo_700Bold",
                        marginRight: 6,
                      }}
                    >
                      + تسجيل تسديد جديد على هذا الدين
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.dark ? "#111726" : "#F8FAFC",
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text variant="titleSmall" style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold' }}>
                        تسجيل تسديد جديد
                      </Text>
                      <TouchableOpacity onPress={() => setShowAddForm(false)}>
                        <X size={18} color={theme.colors.outline} />
                      </TouchableOpacity>
                    </View>

                    {error ? (
                      <View style={{ padding: 8, borderRadius: 8, backgroundColor: theme.colors.errorContainer, marginBottom: 10 }}>
                        <Text style={{ color: theme.colors.onErrorContainer, fontSize: 12, fontFamily: 'Cairo_600SemiBold' }}>
                          {error}
                        </Text>
                      </View>
                    ) : null}

                    <AppInput
                      label="المبلغ المسدد (د.ع) *"
                      icon="dollar-sign"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />

                    <View style={{ height: 10 }} />

                    {/* Payment Method Selector */}
                    <Text variant="labelSmall" style={{ color: theme.colors.outline, marginBottom: 6, fontFamily: 'Cairo_600SemiBold' }}>
                      طريقة الدفع *
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                      <Chip
                        selected={method === 'cash'}
                        onPress={() => setMethod('cash')}
                        style={method === 'cash' ? { backgroundColor: theme.colors.primaryContainer } : {}}
                      >
                        💵 نقداً (كاش)
                      </Chip>
                      <Chip
                        selected={method === 'transfer'}
                        onPress={() => setMethod('transfer')}
                        style={method === 'transfer' ? { backgroundColor: theme.colors.primaryContainer } : {}}
                      >
                        💳 زين كاش
                      </Chip>
                      <Chip
                        selected={method === 'other'}
                        onPress={() => setMethod('other')}
                        style={method === 'other' ? { backgroundColor: theme.colors.primaryContainer } : {}}
                      >
                        📝 أخرى
                      </Chip>
                    </View>

                    <AppInput
                      label="ملاحظات التسديد (اختياري)"
                      icon="file-text"
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="مثال: قسط شهر آب / تسديد جزئي"
                    />

                    <View style={{ height: 16 }} />

                    <AppButton
                      label="تأكيد وحفظ التسديد"
                      onPress={handlePay}
                      loading={payMutation.isPending}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Payment History Timeline */}
            <Text
              variant="titleSmall"
              style={{
                color: theme.colors.onSurface,
                fontFamily: "Cairo_700Bold",
                marginBottom: 12,
              }}
            >
              📋 سجل جميع العمليات والتسديدات ({history.length})
            </Text>

            {history.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Clock size={32} color={theme.colors.outline} />
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 8 }}>
                  لم يتم تسجيل أي عمليات بعد لهذا الدين.
                </Text>
              </View>
            ) : (
              history.map((record: any) => {
                if (record._type === 'item') {
                  return (
                    <View
                      key={`item-${record.id}`}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: '#FEE2E2',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <DollarSign size={18} color="#DC2626" />
                          </View>
                          <View>
                            <Text variant="titleSmall" style={{ color: '#DC2626', fontFamily: 'Cairo_700Bold' }}>
                              - {formatCurrency(record.amount)}
                            </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                              إضافة دين (عنصر جديد)
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Date & Time details */}
                      <View
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.outlineVariant,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={13} color={theme.colors.outline} />
                          <Text style={{ color: theme.colors.outline, fontSize: 11, fontFamily: 'Cairo_400Regular' }}>
                            {formatDateTime(record.created_at || record.item_date)}
                          </Text>
                        </View>
                      </View>

                      {record.description ? (
                        <View style={{ marginTop: 6, backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9', padding: 8, borderRadius: 8 }}>
                          <Text style={{ color: theme.colors.onSurface, fontSize: 12, fontFamily: 'Cairo_400Regular' }}>
                            📝 الوصف: {record.description}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                }

                const p = record;
                const methodLabel =
                  p.payment_method === 'transfer'
                    ? '💳 زين كاش / تحويل'
                    : p.payment_method === 'other'
                      ? '📝 طريقة أخرى'
                      : '💵 نقداً (كاش)';

                const isDownPayment = p.type === 'down_payment';

                return (
                  <View
                    key={p.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: isDownPayment ? '#FEF3C7' : '#DCFCE7',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <CheckCircle size={18} color={isDownPayment ? '#D97706' : '#16A34A'} />
                        </View>
                        <View>
                          <Text variant="titleSmall" style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold' }}>
                            + {formatCurrency(p.amount)}
                          </Text>
                          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                            {isDownPayment ? 'دفعة مقدمة عند التفعيل' : 'تسديد دفعة / قسط'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleShareReceipt(p)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: '#DCFCE7',
                        }}
                      >
                        <MessageCircle size={14} color="#16A34A" />
                        <Text style={{ color: '#16A34A', fontFamily: 'Cairo_700Bold', fontSize: 11 }}>
                          إيصال 💬
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Date & Time details */}
                    <View
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.outlineVariant,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} color={theme.colors.outline} />
                        <Text style={{ color: theme.colors.outline, fontSize: 11, fontFamily: 'Cairo_400Regular' }}>
                          {formatDateTime(p.created_at || p.payment_date)}
                        </Text>
                      </View>

                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontFamily: 'Cairo_600SemiBold' }}>
                        {methodLabel}
                      </Text>
                    </View>

                    {p.notes ? (
                      <View style={{ marginTop: 6, backgroundColor: theme.dark ? '#1E293B' : '#F1F5F9', padding: 8, borderRadius: 8 }}>
                        <Text style={{ color: theme.colors.onSurface, fontSize: 12, fontFamily: 'Cairo_400Regular' }}>
                          📝 الملاحظة: {p.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { padding: 16, paddingBottom: 4 },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryTotalAmount: {
    color: "#FFFFFF",
    fontFamily: "Cairo_700Bold",
    marginBottom: 16,
  },
  summarySubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summarySubItem: {
    alignItems: "center",
    flex: 1,
  },
  summarySubDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  search: { fontFamily: "Cairo_400Regular", fontSize: 14, marginBottom: 10 },
  searchOutline: { borderRadius: 16 },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 8 },
  filterChip: { borderRadius: 20, height: 36 },
  chipText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  listContent: { padding: 16, paddingTop: 4 },
  debtCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  nameBlock: { justifyContent: "center", paddingHorizontal: 12, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  titleWrap: {
    marginBottom: 12,
  },
  debtTitle: { fontFamily: "Cairo_700Bold" },
  amountsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  amountCol: {
    alignItems: "center",
    flex: 1,
  },
  colDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  progressSection: { marginBottom: 14 },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressBar: { height: 8, borderRadius: 4 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  installmentInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fab: { position: "absolute", right: 20, borderRadius: 28 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "85%",
  },
  payModalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
  },
  custPickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    height: 480,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontFamily: "Cairo_700Bold",
  },
  closeBtn: {
    padding: 6,
  },
  formContent: {
    paddingVertical: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  customerSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  triggerCustomerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  custPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  custPickerItemText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  quickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
});
