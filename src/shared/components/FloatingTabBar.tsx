import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CreditCard, LayoutDashboard, Settings, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
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
  isFocused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const Icon = TAB_ICONS[routeName] || LayoutDashboard;
  const label = TAB_LABELS[routeName] || routeName;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.item} hitSlop={4}>
      {/* Pill Highlight */}
      {isFocused && (
        <View
          style={[
            styles.pill,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        />
      )}

      {/* Stacked Icons */}
      <View style={styles.iconWrap}>
        <Icon 
          size={ICON_SIZE} 
          color={isFocused ? theme.colors.primary : theme.colors.outline} 
          strokeWidth={isFocused ? 2.4 : 1.8} 
        />
      </View>

      {/* Label */}
      <View style={styles.labelWrap}>
        <Text 
          numberOfLines={1} 
          style={[
            styles.label, 
            { 
              color: isFocused ? theme.colors.primary : theme.colors.outline,
              fontFamily: isFocused ? 'Cairo_700Bold' : 'Cairo_600SemiBold'
            }
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Filter out routes that are marked with href: null or named subscription
  const visibleRoutes = state.routes.filter((route) => {
    if (route.name === 'subscription') return false;
    const { options } = descriptors[route.key];
    return options?.href !== null;
  });

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
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
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
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: -3,
  },
});
