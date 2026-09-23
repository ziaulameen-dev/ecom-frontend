'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMe } from '@/features/auth';
import { connectChatSocket, getChatSocket } from '../services/chat-socket';
import { chatService } from '../services/chat.service';
import { ChatMessage, Conversation } from '../types';
import { playIncomingChime } from '../utils/chat-sound';

interface UseChatOptions {
  enabled?: boolean;
  isOpen?: boolean;
  onIncomingMessage?: (msg: ChatMessage) => void;
  onAuthRequired?: () => void;
}

export function useChat({
  enabled = true,
  isOpen = false,
  onIncomingMessage,
  onAuthRequired,
}: UseChatOptions = {}) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const userId = me?.id ?? 'anonymous';
  const myConversationKey = useMemo(() => ['chat', 'my-conversation', userId], [userId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch or resolve conversation for current logged-in customer
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: myConversationKey,
    queryFn: async () => {
      try {
        return await chatService.getMyConversation();
      } catch (err: any) {
        if (err?.status === 401) {
          onAuthRequired?.();
          return null;
        }
        throw err;
      }
    },
    enabled: enabled && !!me?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
  });

  const conversationId = conversation?.id;

  // When userId changes (login / account switch), force-refetch the conversation
  // so the new user's data loads immediately without a page refresh.
  useEffect(() => {
    setMessages([]);
    initialLoadRef.current = true;
    knownMessageIdsRef.current = new Set();
    if (!me?.id) return;
    refetchConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  // 2. Fetch messages once conversation is known (real-time updates handled via WebSocket)
  const {
    data: fetchedMessages,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['chat', 'messages', conversationId, userId],
    queryFn: () => (conversationId ? chatService.getMessages(conversationId, 50) : []),
    enabled: !!conversationId && enabled && isOpen && !!me?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // Reset messages and load state whenever conversationId or user changes (prevents previous user messages from leaking)
  useEffect(() => {
    setMessages([]);
    initialLoadRef.current = true;
    knownMessageIdsRef.current = new Set();
    if (conversationId && isOpen && me?.id) {
      refetchMessages();
    }
  }, [conversationId, userId, isOpen, me?.id, refetchMessages]);

  // Track known message IDs to detect newly arrived remote messages
  const initialLoadRef = useRef<boolean>(true);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  // Sync fetched messages into state and trigger sound/toast for newly arrived messages
  useEffect(() => {
    if (!fetchedMessages) return;

    if (initialLoadRef.current) {
      const sorted = [...fetchedMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(sorted);
      knownMessageIdsRef.current = new Set(sorted.map((m) => m.id));
      initialLoadRef.current = false;
      return;
    }

    setMessages((prev) => {
      const combinedMap = new Map<string, ChatMessage>();
      for (const m of fetchedMessages) combinedMap.set(m.id, m);
      for (const m of prev) {
        if (!combinedMap.has(m.id)) combinedMap.set(m.id, m);
      }
      const merged = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      // Avoid creating a new array reference if contents are identical
      if (
        prev.length === merged.length &&
        prev.every((m, idx) => m.id === merged[idx]?.id && m.isRead === merged[idx]?.isRead)
      ) {
        return prev;
      }
      return merged;
    });

    const newFromRemote = fetchedMessages.filter((m) => !knownMessageIdsRef.current.has(m.id));
    if (newFromRemote.length > 0) {
      for (const msg of newFromRemote) {
        knownMessageIdsRef.current.add(msg.id);
        if (msg.senderType === 'admin' || msg.senderType === 'system') {
          playIncomingChime();
          onIncomingMessage?.(msg);
          if (isOpen && conversationId) {
            chatService.markAsRead(conversationId).catch(() => {});
          }
        }
      }
    }
  }, [fetchedMessages, isOpen, conversationId, onIncomingMessage]);

  // 3. Setup Socket.IO real-time connection
  useEffect(() => {
    if (!conversationId || !enabled || !me?.id) return;

    const socket = connectChatSocket();

    const onConnect = () => {
      socket.emit('chat:join', {
        conversationId,
        role: 'customer',
      });
      refetchMessages();
    };

    socket.on('connect', onConnect);
    if (socket.connected) {
      onConnect();
    }

    // Handle incoming message
    const onMessage = (rawMsg: any) => {
      if (!rawMsg || typeof rawMsg !== 'object') return;
      const msg: ChatMessage = rawMsg.message ?? rawMsg;
      if (!msg.id || !msg.createdAt) return;

      if (msg.conversationId === conversationId) {
        knownMessageIdsRef.current.add(msg.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          return next.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });

        // Trigger notification & sound if from admin or bot
        if (msg.senderType === 'admin' || msg.senderType === 'system') {
          playIncomingChime();
          onIncomingMessage?.(msg);

          // If drawer is open, mark read immediately
          if (isOpen) {
            socket.emit('chat:read', { conversationId, readerType: 'customer' });
            socket.emit('chat:mark_read', { conversationId, readerType: 'customer' });
            chatService.markAsRead(conversationId).catch(() => {});
          } else {
            // Optimistically increment unreadCustomerCount immediately for badge sync
            qc.setQueryData<Conversation | null>(myConversationKey, (old) => {
              if (!old) return old;
              return {
                ...old,
                unreadCustomerCount: (old.unreadCustomerCount || 0) + 1,
                lastMessageText:
                  msg.text ||
                  (msg.attachmentUrl
                    ? msg.attachmentType === 'video'
                      ? '🎥 Video'
                      : '📷 Photo'
                    : 'New message'),
                lastMessageAt: msg.createdAt,
              };
            });
          }
        }
      }
    };

    // Handle conversation metadata updates from server
    const onConversationUpdated = (data: { conversation?: Conversation; latestMessage?: ChatMessage }) => {
      if (data?.conversation && data.conversation.id === conversationId) {
        qc.setQueryData(myConversationKey, (old: Conversation | null | undefined) => {
          if (!old) return data.conversation;
          return {
            ...old,
            ...data.conversation,
            // Preserve zero if drawer is open
            unreadCustomerCount: isOpen ? 0 : data.conversation!.unreadCustomerCount,
          };
        });
      }
    };

    // Handle typing indicator
    const onTyping = (data: { conversationId: string; isTyping: boolean; senderType: string }) => {
      if (data.conversationId === conversationId && data.senderType === 'admin') {
        setIsTyping(data.isTyping);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (data.isTyping) {
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    // Handle read receipt
    const onReadReceipt = (data: { conversationId: string; readerType: string }) => {
      if (data.conversationId === conversationId && data.readerType === 'admin') {
        setMessages((prev) =>
          prev.map((m) => (m.senderType === 'customer' ? { ...m, isRead: true } : m)),
        );
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:conversation_updated', onConversationUpdated);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read_receipt', onReadReceipt);

    return () => {
      socket.off('connect', onConnect);
      socket.off('chat:message', onMessage);
      socket.off('chat:conversation_updated', onConversationUpdated);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read_receipt', onReadReceipt);
    };
  }, [conversationId, enabled, isOpen, onIncomingMessage, qc, me?.id, refetchMessages, myConversationKey]);

  // Mark as read when opened and clear unread badge optimistically (only if unread messages exist)
  useEffect(() => {
    if (isOpen && conversationId && (conversation?.unreadCustomerCount || 0) > 0) {
      qc.setQueryData<Conversation | null>(myConversationKey, (old) => {
        if (!old) return old;
        return { ...old, unreadCustomerCount: 0 };
      });
      const socket = getChatSocket();
      if (socket.connected) {
        socket.emit('chat:read', { conversationId, readerType: 'customer' });
        socket.emit('chat:mark_read', { conversationId, readerType: 'customer' });
      }
      chatService.markAsRead(conversationId).then(() => {
        qc.invalidateQueries({ queryKey: myConversationKey });
      }).catch(() => {});
    }
  }, [isOpen, conversationId, qc, myConversationKey, conversation?.unreadCustomerCount]);

  // 4. Action: send message (text + optional attachment)
  const sendMessage = useCallback(
    async (
      text?: string,
      senderName: string = 'Me',
      attachment?: { url: string; type?: string },
    ) => {
      const cleanText = (text || '').trim();
      if ((!cleanText && !attachment?.url) || !conversationId) return;

      const socket = getChatSocket();

      // If socket is connected, emit through socket with timeout fallback to REST
      if (socket.connected) {
        socket.timeout(3000).emit(
          'chat:message',
          {
            conversationId,
            text: cleanText,
            attachmentUrl: attachment?.url,
            attachmentType: attachment?.type || 'image',
            senderType: 'customer',
            senderName,
          },
          async (err: any, response: any) => {
            if (err || !response?.success) {
              try {
                const res = await chatService.sendMessage(conversationId, cleanText, attachment);
                const sent: ChatMessage = (res as any)?.message ?? res;
                if (sent && sent.id && sent.createdAt) {
                  knownMessageIdsRef.current.add(sent.id);
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === sent.id)) return prev;
                    return [...prev, sent];
                  });
                  qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
                }
              } catch (e) {
                console.error('Fallback send failed:', e);
              }
            } else {
              qc.invalidateQueries({ queryKey: myConversationKey });
            }
          },
        );
      } else {
        // Fallback to REST when socket is not connected
        try {
          const res = await chatService.sendMessage(conversationId, cleanText, attachment);
          const sent: ChatMessage = (res as any)?.message ?? res;
          if (sent && sent.id && sent.createdAt) {
            knownMessageIdsRef.current.add(sent.id);
            setMessages((prev) => {
              if (prev.some((m) => m.id === sent.id)) return prev;
              return [...prev, sent];
            });
            qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
            qc.invalidateQueries({ queryKey: myConversationKey });
          }
        } catch (err: any) {
          console.error('Failed to send message via REST:', err);
          if (err?.status === 401) {
            toast.error('Session expired. Please log in to continue chatting.');
            qc.invalidateQueries({ queryKey: myConversationKey });
            qc.invalidateQueries({ queryKey: ['auth', 'me'] });
            onAuthRequired?.();
          } else {
            toast.error(err?.message || 'Failed to send message. Please try again.');
          }
        }
      }
    },
    [conversationId, qc, onAuthRequired],
  );

  // 5. Action: send typing indicator
  const sendTyping = useCallback(
    (typing: boolean, senderName: string = 'Customer') => {
      if (!conversationId) return;
      const socket = getChatSocket();
      if (socket.connected) {
        socket.emit('chat:typing', {
          conversationId,
          isTyping: typing,
          senderName,
          senderType: 'customer',
        });
      }
    },
    [conversationId],
  );

  return {
    conversation,
    messages,
    isLoading: isLoadingConversation || isLoadingMessages,
    isTyping,
    sendMessage,
    sendTyping,
    refetchConversation,
    refetchMessages,
  };
}
