import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface AppScreenProps {
  children: React.ReactNode;
  title?: string;
  scroll?: boolean;
  showBack?: boolean;
  headerRight?: React.ReactNode;
}

export default function AppScreen({ children, title, scroll = false, showBack = true, headerRight }: AppScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  const content = (
    <View style={styles.content}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showBack && router.canGoBack() && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: theme.colors.surfaceVariant }]}
                activeOpacity={0.7}
              >
                <ChevronRight size={24} color={theme.colors.onSurface} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerCenter}>
            {title && (
              <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
                {title}
              </Text>
            )}
          </View>
          
          <View style={[styles.headerRight, { alignItems: 'flex-end' }]}>
            {headerRight}
          </View>
        </View>

        {/* Body */}
        {scroll ? (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.flexContent}>
            {content}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Cairo_700Bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  flexContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
