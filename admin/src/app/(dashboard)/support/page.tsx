'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, User as UserIcon, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SupportMessage {
  id: string;
  store_id: string;
  sender: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
  users?: {
    name: string;
    phone: string;
    push_token?: string;
  };
}

interface ChatContact {
  store_id: string;
  name: string;
  phone: string;
  push_token?: string;
  lastMessage: SupportMessage;
  unreadCount: number;
}

export default function SupportChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fetch all messages to group into contacts
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['adminSupportMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          users (
            name,
            phone,
            push_token
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 10000, // Fallback polling
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin_support_msgs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['adminSupportMessages'] });
          
          // Play sound if new message from user
          if (payload.new?.sender === 'user') {
            try {
              const audio = new Audio('/notification.mp3'); 
              audio.play().catch(() => {});
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Group messages by contact
  const contacts: ChatContact[] = [];
  const contactMap = new Map<string, ChatContact>();

  messages.forEach((msg) => {
    if (!contactMap.has(msg.store_id)) {
      const contact: ChatContact = {
        store_id: msg.store_id,
        name: msg.users?.name || 'مستخدم غير معروف',
        phone: msg.users?.phone || '',
        push_token: msg.users?.push_token,
        lastMessage: msg,
        unreadCount: msg.sender === 'user' && !msg.is_read ? 1 : 0,
      };
      contactMap.set(msg.store_id, contact);
      contacts.push(contact);
    } else {
      const contact = contactMap.get(msg.store_id)!;
      if (msg.sender === 'user' && !msg.is_read) {
        contact.unreadCount += 1;
      }
    }
  });

  // Get messages for selected contact (sort ascending for chat view)
  const currentChatMessages = messages
    .filter((m) => m.store_id === selectedContact?.store_id)
    .reverse();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentChatMessages.length, selectedContact]);

  // Mark messages as read
  useEffect(() => {
    if (selectedContact && selectedContact.unreadCount > 0) {
      const markAsRead = async () => {
        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .eq('store_id', selectedContact.store_id)
          .eq('sender', 'user')
          .eq('is_read', false);
        queryClient.invalidateQueries({ queryKey: ['adminSupportMessages'] });
      };
      markAsRead();
    }
  }, [selectedContact, queryClient]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, contact }: { text: string; contact: ChatContact }) => {
      // 1. Insert message
      const { error } = await supabase.from('support_messages').insert({
        store_id: contact.store_id,
        sender: 'admin',
        message: text.trim(),
        is_read: false,
      });
      if (error) throw error;

      // 2. Send Push Notification
      if (contact.push_token) {
        await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: [contact.push_token],
            title: 'رسالة من الدعم الفني',
            body: text.trim(),
            data: { type: 'support', url: 'support-chat' },
          }),
        });
      }
    },
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['adminSupportMessages'] });
    },
  });

  // Delete Conversation Mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('store_id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedContact(null);
      queryClient.invalidateQueries({ queryKey: ['adminSupportMessages'] });
    },
  });

  const handleDeleteConversation = () => {
    if (!selectedContact) return;
    if (confirm(`هل أنت متأكد من حذف هذه المحادثة نهائياً مع ${selectedContact.name}؟`)) {
      deleteConversationMutation.mutate(selectedContact.store_id);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedContact || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({ text: inputText, contact: selectedContact });
  };

  if (isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded-full"></div>
          <div className="text-muted-foreground text-sm font-medium">جاري تحميل المحادثات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ─── Contacts Sidebar (Right) ──────────────────────────── */}
      <div className={`w-full md:w-80 shrink-0 border-l border-border bg-card flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold">رسائل الدعم</h2>
          <p className="text-xs text-muted-foreground mt-1">
            إجمالي المحادثات: {contacts.length}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact.store_id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full flex items-start gap-3 p-4 border-b border-border transition-colors hover:bg-muted/50 text-right
                ${selectedContact?.store_id === contact.store_id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
              `}
            >
              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                  <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">
                    {format(new Date(contact.lastMessage.created_at), 'hh:mm a')}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground truncate w-4/5">
                    {contact.lastMessage.sender === 'admin' ? 'أنت: ' : ''}
                    {contact.lastMessage.message}
                  </p>
                  {contact.unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                      {contact.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
          {contacts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              لا توجد أي محادثات حالياً
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat View (Left) ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -mr-2 rounded-full hover:bg-muted"
                  onClick={() => setSelectedContact(null)}
                >
                  <span className="text-xl">➔</span>
                </button>
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{selectedContact.name}</h2>
                  <p className="text-xs text-muted-foreground" dir="ltr">{selectedContact.phone}</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={handleDeleteConversation}
                disabled={deleteConversationMutation.isPending}
                title="حذف المحادثة"
              >
                <Trash2 size={18} />
              </Button>
            </div>

            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20"
            >
              {currentChatMessages.map((msg, idx) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg.id || idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isAdmin 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-card border border-border rounded-bl-sm text-foreground'
                    }`}>
                      <p className="leading-relaxed">{msg.message}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        <span>{format(new Date(msg.created_at), 'hh:mm a')}</span>
                        {isAdmin && (
                          <CheckCircle2 size={10} className={msg.is_read ? 'text-green-300' : ''} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Input
                  placeholder="اكتب رسالتك هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-background"
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!inputText.trim() || sendMessageMutation.isPending}
                  className="h-10 w-10 p-0 rounded-full shrink-0"
                >
                  <Send size={18} className={sendMessageMutation.isPending ? 'animate-pulse' : ''} style={{ transform: 'rotate(180deg)' }} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Send size={32} className="text-muted-foreground/50" />
            </div>
            <p className="font-medium text-sm">اختر محادثة من القائمة للبدء بالرد</p>
          </div>
        )}
      </div>
    </div>
  );
}
