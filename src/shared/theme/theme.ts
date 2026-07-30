import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// ── Cairo Typography System ──────────────────────
const R = 'Cairo_400Regular';
const S = 'Cairo_600SemiBold';
const B = 'Cairo_700Bold';

const typography = configureFonts({
  config: {
    displayLarge:   { fontFamily: B, fontSize: 52, letterSpacing: -1, lineHeight: 60 },
    displayMedium:  { fontFamily: B, fontSize: 42, letterSpacing: -.5, lineHeight: 50 },
    displaySmall:   { fontFamily: B, fontSize: 34, letterSpacing: 0,   lineHeight: 42 },
    headlineLarge:  { fontFamily: B, fontSize: 30, letterSpacing: 0,   lineHeight: 38 },
    headlineMedium: { fontFamily: B, fontSize: 24, letterSpacing: 0,   lineHeight: 32 },
    headlineSmall:  { fontFamily: B, fontSize: 20, letterSpacing: 0,   lineHeight: 28 },
    titleLarge:     { fontFamily: B, fontSize: 18, letterSpacing: 0,   lineHeight: 26 },
    titleMedium:    { fontFamily: S, fontSize: 16, letterSpacing: .1,  lineHeight: 24 },
    titleSmall:     { fontFamily: S, fontSize: 14, letterSpacing: .1,  lineHeight: 20 },
    labelLarge:     { fontFamily: S, fontSize: 14, letterSpacing: .1,  lineHeight: 20 },
    labelMedium:    { fontFamily: S, fontSize: 12, letterSpacing: .4,  lineHeight: 16 },
    labelSmall:     { fontFamily: S, fontSize: 11, letterSpacing: .5,  lineHeight: 16 },
    bodyLarge:      { fontFamily: R, fontSize: 16, letterSpacing: .15, lineHeight: 26 },
    bodyMedium:     { fontFamily: R, fontSize: 14, letterSpacing: .2,  lineHeight: 22 },
    bodySmall:      { fontFamily: R, fontSize: 12, letterSpacing: .3,  lineHeight: 18 },
  },
});

// ── Ultra Fintech Color Palette ──────────────────
export const BrandColors = {
  emerald:        '#10B981',
  emeraldDark:    '#059669',
  emeraldLight:   '#D1FAE5',
  indigo:         '#6366F1',
  indigoDark:     '#4F46E5',
  indigoLight:    '#EEF2FF',
  amber:          '#F59E0B',
  amberLight:     '#FEF3C7',
  rose:           '#F43F5E',
  roseLight:      '#FFE4E6',
  cyan:           '#06B6D4',
  cyanLight:      '#CFFAFE',
};

// ── Light Theme ──────────────────────────────────
export const lightTheme = {
  ...MD3LightTheme,
  fonts: typography,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary:              '#4F46E5',   // Royal Indigo
    onPrimary:            '#FFFFFF',
    primaryContainer:     '#EEF2FF',   // Indigo Tint
    onPrimaryContainer:   '#1E1B4B',
    secondary:            '#059669',   // Emerald
    onSecondary:          '#FFFFFF',
    secondaryContainer:   '#D1FAE5',
    onSecondaryContainer: '#064E3B',
    tertiary:             '#0891B2',   // Cyan
    onTertiary:           '#FFFFFF',
    tertiaryContainer:    '#CFFAFE',
    onTertiaryContainer:  '#164E63',
    error:                '#E11D48',   // Rose
    onError:              '#FFFFFF',
    errorContainer:       '#FFE4E6',
    onErrorContainer:     '#881337',
    background:           '#F8FAFC',   // Slate 50
    onBackground:         '#0F172A',   // Slate 900
    surface:              '#FFFFFF',
    onSurface:            '#0F172A',
    surfaceVariant:       '#F1F5F9',   // Slate 100
    onSurfaceVariant:     '#475569',   // Slate 600
    outline:              '#94A3B8',   // Slate 400
    outlineVariant:       '#E2E8F0',   // Slate 200
    shadow:               '#0F172A',
    scrim:                '#000000',
    inverseSurface:       '#0F172A',
    inverseOnSurface:     '#F8FAFC',
    inversePrimary:       '#818CF8',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F8FAFC',
      level3: '#F1F5F9',
      level4: '#E2E8F0',
      level5: '#CBD5E1',
    },
    surfaceDisabled:   'rgba(15, 23, 42, 0.12)',
    onSurfaceDisabled: 'rgba(15, 23, 42, 0.38)',
    backdrop:          'rgba(15, 23, 42, 0.5)',
  },
};

// ── Dark Theme (OLED / Deep Slate) ───────────────
export const darkTheme = {
  ...MD3DarkTheme,
  fonts: typography,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary:              '#818CF8',   // Indigo 400
    onPrimary:            '#1E1B4B',
    primaryContainer:     '#312E81',   // Indigo 900
    onPrimaryContainer:   '#E0E7FF',
    secondary:            '#34D399',   // Emerald 400
    onSecondary:          '#064E3B',
    secondaryContainer:   '#065F46',
    onSecondaryContainer: '#A7F3D0',
    tertiary:             '#22D3EE',   // Cyan 400
    onTertiary:           '#164E63',
    tertiaryContainer:    '#155E75',
    onTertiaryContainer:  '#A5F3FC',
    error:                '#FB7185',   // Rose 400
    onError:              '#881337',
    errorContainer:       '#9F1239',
    onErrorContainer:     '#FECDD3',
    background:           '#090D16',   // OLED Deep Slate
    onBackground:         '#F1F5F9',
    surface:              '#111726',   // Dark Surface
    onSurface:            '#F1F5F9',
    surfaceVariant:       '#1E293B',
    onSurfaceVariant:     '#94A3B8',
    outline:              '#475569',
    outlineVariant:       '#1E293B',
    shadow:               '#000000',
    scrim:                '#000000',
    inverseSurface:       '#F1F5F9',
    inverseOnSurface:     '#090D16',
    inversePrimary:       '#4F46E5',
    elevation: {
      level0: 'transparent',
      level1: '#111726',
      level2: '#161E31',
      level3: '#1E293B',
      level4: '#273549',
      level5: '#334155',
    },
    surfaceDisabled:   'rgba(241, 245, 249, 0.12)',
    onSurfaceDisabled: 'rgba(241, 245, 249, 0.38)',
    backdrop:          'rgba(0, 0, 0, 0.7)',
  },
};
