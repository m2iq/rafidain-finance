import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { documentDirectory, cacheDirectory, getInfoAsync, deleteAsync, createDownloadResumable } from 'expo-file-system/legacy';
import { Download, AlertCircle, Smartphone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkForUpdates, installApk, AppUpdate } from '../../core/updates/updateService';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

const SKIPPED_UPDATE_KEY = '@skipped_update_version_code';

export default function UpdateModal() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [visible, setVisible] = useState(false);
  
  // Download states
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return; // Only support Android for now

    const check = async () => {
      const latestUpdate = await checkForUpdates();
      if (latestUpdate) {
        // If not mandatory, check if user skipped it
        if (!latestUpdate.is_mandatory) {
          const skippedVersion = await AsyncStorage.getItem(SKIPPED_UPDATE_KEY);
          if (skippedVersion === latestUpdate.version_code.toString()) {
            return; // Already skipped this one
          }
        }
        
        setUpdate(latestUpdate);
        setVisible(true);
      }
    };
    check();
  }, []);

  // Prevent back button on Android if mandatory
  useEffect(() => {
    if (visible && update?.is_mandatory) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // Block back press
      });
      return () => backHandler.remove();
    }
  }, [visible, update]);

  const handleSkip = async () => {
    if (update) {
      await AsyncStorage.setItem(SKIPPED_UPDATE_KEY, update.version_code.toString());
    }
    setVisible(false);
  };

  const handleUpdate = async () => {
    if (!update) return;

    setIsDownloading(true);
    setDownloadError(null);
    setProgress(0);

    const dir = documentDirectory || cacheDirectory;
    const fileUri = `${dir}app_update_v${update.version_code}.apk`;

    try {
      // Check if file already exists, if so delete it
      const fileInfo = await getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await deleteAsync(fileUri);
      }

      const downloadResumable = createDownloadResumable(
        update.download_url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        const success = await installApk(result.uri);
        if (!success) {
          setDownloadError('فشل بدء التثبيت. يرجى المحاولة مرة أخرى.');
        }
      } else {
        setDownloadError('فشل التحميل. تأكد من اتصالك بالإنترنت.');
      }
    } catch (e: any) {
      console.error('[UpdateModal] Download error:', e);
      setDownloadError('حدث خطأ أثناء تحميل التحديث.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!visible || !update) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.blurFallback}>
        <View style={styles.container}>
          <Animated.View entering={SlideInDown.duration(400).springify()} style={styles.card}>
            <View style={styles.iconContainer}>
              <Smartphone size={32} color="#4F46E5" />
              {update.is_mandatory && (
                <View style={styles.badgeContainer}>
                  <AlertCircle size={14} color="#EF4444" />
                </View>
              )}
            </View>

            <Text style={styles.title}>تحديث جديد متوفر!</Text>
            <Text style={styles.version}>الإصدار {update.version}</Text>

            {update.release_notes ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>ما الجديد؟</Text>
                <Text style={styles.notesText}>{update.release_notes}</Text>
              </View>
            ) : null}

            {downloadError ? (
              <Text style={styles.errorText}>{downloadError}</Text>
            ) : null}

            {isDownloading ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <Animated.View 
                    style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} 
                  />
                </View>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>جاري تحميل التحديث...</Text>
                  <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={handleUpdate}
                  activeOpacity={0.8}
                >
                  <Download size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>تحديث الآن</Text>
                </TouchableOpacity>

                {!update.is_mandatory && (
                  <TouchableOpacity 
                    style={[styles.button, styles.secondaryButton]} 
                    onPress={handleSkip}
                  >
                    <Text style={styles.secondaryButtonText}>لاحقاً</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)', // fallback if BlurView fails
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: {
    fontFamily: 'Cairo-Bold',
    fontSize: 22,
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  version: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notesTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  notesText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  primaryButtonText: {
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontFamily: 'Cairo-SemiBold',
    color: '#4B5563',
    fontSize: 16,
  },
  progressContainer: {
    width: '100%',
    marginVertical: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontFamily: 'Cairo-Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  progressPercentage: {
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    color: '#4F46E5',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  errorText: {
    fontFamily: 'Cairo-Medium',
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
});
