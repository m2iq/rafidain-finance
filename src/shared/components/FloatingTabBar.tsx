import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CreditCard, LayoutDashboard, Settings, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, any> = {
  index: LayoutDashboard,
  customers: Users,
  debts: CreditCard,
  settings: Settings,
};

const TAB_LABELS: Record<string, string> = {
  index: 'الرئيسية',
  customers: 'العملاء',
  debts: 'الديون',
  settings: 'الإعدادات',
};

const BAR_H = 65;
const ICON_SIZE = 22;

function TabItem({
  routeName,
  progress,
  onPress,
  onLongPress,
}: {
  routeName: string;
  progress: Animated.DerivedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const Icon = TAB_ICONS[routeName] || LayoutDashboard;
  const label = TAB_LABELS[routeName] || routeName;

  // Active Pill Background
  const pillBg = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value, { duration: 200 }),
    transform: [{ scale: withSpring(interpolate(progress.value, [0, 1], [0.85, 1]), { damping: 15 }) }],
  }));

  // Active Icon
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value, { duration: 180 }),
    transform: [{ scale: withSpring(interpolate(progress.value, [0, 1], [0.8, 1]), { damping: 14 }) }],
  }));

  // Inactive Icon
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1 - progress.value, { duration: 180 }),
  }));

  // Label animation
  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value, { duration: 180 }),
    transform: [{ translateY: withTiming(progress.value === 1 ? 0 : 3, { duration: 180 }) }],
  }));

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.item} hitSlop={4}>
      {/* Pill Highlight */}
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: theme.colors.primaryContainer },
          pillBg,
        ]}
      />

      {/* Stacked Icons */}
      <View style={styles.iconWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactiveIconStyle]}>
          <Icon size={ICON_SIZE} color={theme.colors.outline} strokeWidth={1.8} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeIconStyle]}>
          <Icon size={ICON_SIZE} color={theme.colors.primary} strokeWidth={2.4} />
        </Animated.View>
      </View>

      {/* Label */}
      <Animated.View style={[styles.labelWrap, labelStyle]}>
        <Text numberOfLines={1} style={[styles.label, { color: theme.colors.primary }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const activeIdx = useSharedValue(state.index);

  useEffect(() => {
    activeIdx.value = state.index;
  }, [state.index]);

  const p0 = useDerivedValue(() => (activeIdx.value === 0 ? 1 : 0));
  const p1 = useDerivedValue(() => (activeIdx.value === 1 ? 1 : 0));
  const p2 = useDerivedValue(() => (activeIdx.value === 2 ? 1 : 0));
  const p3 = useDerivedValue(() => (activeIdx.value === 3 ? 1 : 0));
  const progressValues = [p0, p1, p2, p3];

  return (
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            shadowColor: theme.dark ? '#000' : '#1E1B4B',
          },
        ]}
      >
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            routeName={route.name}
            progress={progressValues[index]}
            onPress={() => {
              const isFocused = state.index === index;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    height: BAR_H,
    borderRadius: 32,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  item: {
    flex: 1,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 26,
  },
  iconWrap: {
    width: ICON_SIZE + 6,
    height: ICON_SIZE + 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelWrap: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: -3
  },
});
