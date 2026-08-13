import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/supabaseClient';
import { useAppStore } from '../../core/store/appStore';
import AppInput from '../../shared/components/AppInput';
import { formatDateTime } from '../../shared/utils/currency';

interface SupportMessage {
  id: string;
  store_id: string;
  sender: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function SupportChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  
  const [inputText, setInputText] = useState('');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['supportMessages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data as SupportMessage[];
    },
    enabled: !!user?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id) throw new Error("User not logged in");
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          store_id: user.id,
          sender: 'user',
          message: text.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupportMessage;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(['supportMessages', user?.id], (old: SupportMessage[] = []) => {
        // Only append if it's not already there
        if (!old.find((m) => m.id === newMsg.id)) {
          return [...old, newMsg];
        }
        return old;
      });
      setInputText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`support_msgs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `store_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          queryClient.setQueryData(['supportMessages', user.id], (old: SupportMessage[] = []) => {
            if (!old.find((m) => m.id === newMsg.id)) {
              return [...old, newMsg];
            }
            return old;
          });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText);
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isMe = item.sender === 'user';
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperAdmin]}>
        {/* For Admin messages, show a small avatar icon */}
        {!isMe && (
          <View style={[styles.adminAvatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Cairo_700Bold' }}>دعم</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe 
              ? [styles.messageBubbleMe, { backgroundColor: theme.colors.primary }] 
              : [styles.messageBubbleAdmin, { backgroundColor: theme.dark ? '#1E293B' : '#FFFFFF' }]
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : theme.colors.onSurface }]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.outline }]}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 10 }]} elevation={4}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowRight size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text variant="titleMedium" style={{ fontFamily: 'Cairo_700Bold', color: theme.colors.onSurface }}>
              مركز الدعم الفني
            </Text>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text variant="labelSmall" style={{ fontFamily: 'Cairo_600SemiBold', color: '#10B981' }}>
                متاح للرد
              </Text>
            </View>
          </View>
        </View>
      </Surface>

      <KeyboardAvoidingView 
        style={[styles.chatContainer, { backgroundColor: theme.dark ? '#0F172A' : '#F8FAFC' }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={{ color: theme.colors.outline, fontFamily: 'Cairo_600SemiBold' }}>
                  مرحباً بك! اكتب رسالتك وسنقوم بالرد عليك قريباً.
                </Text>
              </View>
            )}
          />
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.surfaceVariant }
            ]}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Send size={20} color={inputText.trim() ? "#fff" : theme.colors.outline} />
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <AppInput
              placeholder="اكتب رسالتك هنا..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              icon="message-square"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 4,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  chatContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageWrapperMe: {
    justifyContent: 'flex-start', // RTL: flex-start means right side
  },
  messageWrapperAdmin: {
    justifyContent: 'flex-end', // RTL: flex-end means left side
  },
  adminAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleAdmin: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
    lineHeight: 22,
  },
  messageTime: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  inputWrapper: {
    flex: 1,
    marginLeft: 12, // RTL space between button and input
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
