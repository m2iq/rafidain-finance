import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CreditCard, LayoutDashboard, Settings, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { I18nManager, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
  debts: 'الديون والأقساط',
  settings: 'الإعدادات',
};

const BAR_H = 68;
const ICON_SIZE = 20;
const ALLOWED_TABS = ['index', 'customers', 'debts', 'settings'];

function TabItem({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  onLayoutItem,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onLayoutItem: (x: number, width: number) => void;
}) {
  const theme = useTheme();
  const Icon = TAB_ICONS[routeName] || LayoutDashboard;
  const label = TAB_LABELS[routeName] || routeName;

  const iconScale = useSharedValue(isFocused ? 1.12 : 1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 14,
      stiffness: 200,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value * pressScale.value },
      { translateY: isFocused ? -3 : 0 },
    ],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    onLayoutItem(x, width);
  };

  return (
    <View onLayout={handleLayout} style={styles.item}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        style={styles.pressable}
        hitSlop={4}
      >
        {/* Animated Icon */}
        <Animated.View style={[styles.iconWrap, animatedIconStyle]}>
          <Icon
            size={ICON_SIZE}
            color={isFocused ? theme.colors.primary : theme.colors.outline}
            strokeWidth={isFocused ? 2.5 : 1.8}
          />
        </Animated.View>

        {/* Text Label */}
        <View style={styles.labelWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: isFocused ? theme.colors.primary : theme.colors.outline,
                fontFamily: isFocused ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
                opacity: isFocused ? 1 : 0.6,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});

  // Filter only allowed main tabs
  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return ALLOWED_TABS.includes(route.name) && options?.href !== null;
  });

  const activeIndex = visibleRoutes.findIndex((r: any) => {
    const idx = state.routes.findIndex((route: any) => route.key === r.key);
    return state.index === idx;
  });

  const activeIdx = activeIndex >= 0 ? activeIndex : 0;
  const currentLayout = tabLayouts[activeIdx];

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  useEffect(() => {
    if (currentLayout) {
      const isRTL = typeof I18nManager !== 'undefined' && Boolean(I18nManager?.isRTL);
      const targetLeft =
        (isRTL && containerWidth > 0
          ? containerWidth - currentLayout.x - currentLayout.width
          : currentLayout.x) + 2;

      pillX.value = withSpring(targetLeft, {
        damping: 16,
        stiffness: 200,
        mass: 0.6,
      });
      pillWidth.value = withSpring(currentLayout.width - 4, {
        damping: 16,
        stiffness: 200,
        mass: 0.6,
      });
    }
  }, [currentLayout?.x, currentLayout?.width, containerWidth]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    left: pillX.value,
    width: pillWidth.value > 0 ? pillWidth.value : 0,
    opacity: pillWidth.value > 0 ? 1 : 0,
  }));

  const handleLayoutItem = (index: number, x: number, width: number) => {
    setTabLayouts((prev) => ({
      ...prev,
      [index]: { x, width },
    }));
  };

  const handleBarLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // If current screen is not a main tab, hide the tab bar completely
  // Must be placed after all hooks!
  if (activeIndex === -1) {
    return null;
  }

  return (
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}
      pointerEvents="box-none"
    >
      <View
        onLayout={handleBarLayout}
        style={[
          styles.bar,
          {
            backgroundColor: theme.dark ? 'rgba(17, 24, 39, 0.92)' : '#FFFFFF',
            borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.8)',
            shadowColor: theme.dark ? '#000000' : '#334155',
          },
        ]}
      >
        {/* Sliding Pill Active Indicator */}
        <Animated.View
          style={[
            styles.slidingPill,
            {
              backgroundColor: theme.dark
                ? 'rgba(99, 102, 241, 0.22)'
                : theme.colors.primaryContainer,
            },
            animatedPillStyle,
          ]}
        >
          {/* Top Indicator Glow Bar */}
          <View
            style={[
              styles.activeTopGlow,
              { backgroundColor: theme.colors.primary },
            ]}
          />
        </Animated.View>

        {visibleRoutes.map((route: any, visibleIdx: number) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === index;

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onLayoutItem={(x, width) => handleLayoutItem(visibleIdx, x, width)}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  slidingPill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    borderRadius: 25,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  activeTopGlow: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginBottom: 3,
  },
  item: {
    flex: 1,
    height: BAR_H,
    zIndex: 2,
  },
  pressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: ICON_SIZE + 8,
    height: ICON_SIZE + 8,
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
    fontSize: 11,
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: -8,
  },
});
