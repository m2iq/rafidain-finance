import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, useTheme, ProgressBar, Surface } from 'react-native-paper';
import { CloudUpload, CheckCircle, AlertCircle, Database, Sparkles, X } from 'lucide-react-native';
import { SyncProgress } from '../../core/supabase/syncService';

interface SyncProgressModalProps {
  visible: boolean;
  progress: SyncProgress | null;
  onClose: () => void;
}

export default function SyncProgressModal({ visible, progress, onClose }: SyncProgressModalProps) {
  const theme = useTheme();

  if (!visible || !progress) return null;

  const isCompleted = progress.stage === 'completed' || progress.stage === 'already_synced';
  const isError = progress.stage === 'error';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Surface
          elevation={4}
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.dark ? '#1E1E2E' : '#FFFFFF',
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              {isCompleted ? (
                <CheckCircle size={24} color="#16A34A" />
              ) : isError ? (
                <AlertCircle size={24} color={theme.colors.error} />
              ) : (
                <CloudUpload size={24} color={theme.colors.primary} />
              )}
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                {isCompleted
                  ? 'مزامنة السحابة'
                  : isError
                  ? 'خطأ بالمزامنة'
                  : 'جاري مزامنة البيانات...'}
              </Text>
            </View>

            {(isCompleted || isError) && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={theme.colors.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Body Info */}
          <View style={styles.body}>
            {/* Progress Bar & Percentage */}
            <View style={styles.progressRow}>
              <Text variant="displaySmall" style={[styles.pctText, { color: isCompleted ? '#16A34A' : theme.colors.primary }]}>
                {progress.percentage}%
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, fontFamily: 'Cairo_400Regular' }}>
                {progress.stage === 'already_synced'
                  ? 'محمية ومطابقة 100%'
                  : `${progress.current} من أصل ${progress.total}`}
              </Text>
            </View>

            <ProgressBar
              progress={progress.percentage / 100}
              color={isCompleted ? '#16A34A' : isError ? theme.colors.error : theme.colors.primary}
              style={styles.progressBar}
            />

            {/* Status Message */}
            <View style={[styles.messageBox, { backgroundColor: theme.colors.surfaceVariant + '60' }]}>
              <Sparkles size={16} color={isCompleted ? '#16A34A' : theme.colors.primary} style={{ marginTop: 2 }} />
              <Text variant="bodySmall" style={[styles.messageText, { color: theme.colors.onSurfaceVariant }]}>
                {progress.message}
              </Text>
            </View>
          </View>

          {/* Action Button when finished or errored */}
          {(isCompleted || isError) && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: isCompleted ? '#16A34A' : theme.colors.primary },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {isCompleted ? 'تم بنجاح ✓' : 'حسناً'}
              </Text>
            </TouchableOpacity>
          )}
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontFamily: 'Cairo_700Bold',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginVertical: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  pctText: {
    fontFamily: 'Cairo_700Bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  messageText: {
    flex: 1,
    fontFamily: 'Cairo_400Regular',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Cairo_700Bold',
    fontSize: 14,
  },
});
