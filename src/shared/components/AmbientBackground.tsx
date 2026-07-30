import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface AmbientBackgroundProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export default function AmbientBackground({ primaryColor, secondaryColor }: AmbientBackgroundProps) {
  const theme = useTheme();

  const opacity = theme.dark ? 0.07 : 0.05;
  const color1 = primaryColor || theme.colors.primary;
  const color2 = secondaryColor || theme.colors.secondary;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, overflow: 'hidden' }]} pointerEvents="none">
      <View
        style={[
          styles.blob,
          styles.topRight,
          { backgroundColor: color1, opacity },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.bottomLeft,
          { backgroundColor: color2, opacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
  },
  topRight: {
    top: -width * 0.4,
    right: -width * 0.4,
  },
  bottomLeft: {
    bottom: -width * 0.2,
    left: -width * 0.4,
  },
});
