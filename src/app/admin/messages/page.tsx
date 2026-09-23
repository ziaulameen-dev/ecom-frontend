'use client';

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  Inbox,
  Loader2,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
  Package,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  UserCheck,
  UserX,
  Video,
  X,
  Zap,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/lib/use-media-query';
import { useMe } from '@/features/auth';
import {
  AutoReplyDrawer,
  AutoReplyRule,
  ChatMessage,
  Conversation,
  ConversationStatus,
  CustomerChatContext,
  INITIAL_AUTO_REPLY_RULES,
  chatService,
  connectChatSocket,
  getChatSocket,
} from '@/features/chat';
import { playIncomingChime } from '@/features/chat/utils/chat-sound';
import { cn, mediaSrc } from '@/lib/utils';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const PAGE_SIZE = 20;

type FilterTab = 'all' | 'unread' | 'blocked';

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
];

function getAvatarBg(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return 'bg-[#187b7b]';
  let hash = 0;
  for (let i = 0; i < nameOrEmail.length; i++) {
    hash = nameOrEmail.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatWhatsAppTime(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatMessageDateDivider(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'TODAY';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'YESTERDAY';

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function AdminMessagesPage() {
  const { data: me } = useMe();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('id');
    }
    return null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [isViewingArchived, setIsViewingArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const blockedCount = useMemo(() => conversations.filter((c) => c.isBlocked).length, [conversations]);
  const totalUnreadCount = useMemo(() => conversations.reduce((sum, c) => sum + (c.unreadAdminCount || 0), 0), [conversations]);

  // Scroll pagination states (20 messages per page)
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState<boolean>(false);
  const [initialChatReady, setInitialChatReady] = useState<boolean>(false);
  const hasMoreMessagesRef = useRef<boolean>(true);
  hasMoreMessagesRef.current = hasMoreMessages;
  const isLoadingOlderRef = useRef<boolean>(false);
  isLoadingOlderRef.current = loadingOlderMessages;
  const lastLatestMessageIdRef = useRef<string | null>(null);

  // In-chat message search
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Auto-reply keyword drawer
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);

  // Customer context & quick replies states
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showCustomerContext, setShowCustomerContext] = useState(false);
  const [customerContext, setCustomerContext] = useState<CustomerChatContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Live Canned Responses / Quick Replies synced with Auto-Reply rules
  const [cannedRules, setCannedRules] = useState<AutoReplyRule[]>(() => {
    if (typeof window === 'undefined') return INITIAL_AUTO_REPLY_RULES;
    try {
      const stored = localStorage.getItem('ecom_auto_reply_rules_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_AUTO_REPLY_RULES;
  });

  useEffect(() => {
    const handleRulesUpdate = (e: any) => {
      if (Array.isArray(e.detail)) {
        setCannedRules(e.detail);
      }
    };
    window.addEventListener('ecom_auto_reply_rules_updated', handleRulesUpdate);
    return () => window.removeEventListener('ecom_auto_reply_rules_updated', handleRulesUpdate);
  }, []);

  // Sync selectedId with ?id= URL search param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId && urlId !== selectedId) {
      setSelectedId(urlId);
    }
  }, [selectedId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const urlId = new URLSearchParams(window.location.search).get('id');
      if (urlId) setSelectedId(urlId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectConversation = (id: string | null) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        window.history.replaceState(null, '', `/admin/messages?id=${id}`);
      } else {
        window.history.replaceState(null, '', '/admin/messages');
      }
    }
  };

  // Attachment state (deferred upload on send)
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string } | null>(null);
  const pendingFileRef = useRef(pendingFile);
  pendingFileRef.current = pendingFile;

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pendingFileRef.current) {
        URL.revokeObjectURL(pendingFileRef.current.previewUrl);
      }
    };
  }, []);

  const handleRemovePendingFile = () => {
    if (pendingFile) {
      URL.revokeObjectURL(pendingFile.previewUrl);
      setPendingFile(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitialChatLoadRef = useRef<boolean>(true);
  const prevSelectedIdRef = useRef<string | null>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);
  const lastScrollTopRef = useRef<number>(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isFetchingConversationsRef = useRef<boolean>(false);

  // 1. Load conversations (supports silent background refresh)
  const loadConversations = useCallback(async (silent = false) => {
    if (isFetchingConversationsRef.current && !silent) return;
    isFetchingConversationsRef.current = true;
    try {
      if (!silent) setLoadingList(true);
      const res = await chatService.listAdminConversations({
        limit: 50,
        archived: isViewingArchived ? true : false,
      });

      const sorted = (res.items || []).sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      setConversations(sorted);
      setArchivedCount(res.archivedCount || 0);

      if (!silent) {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlId = urlParams?.get('id');
        const orderParam = urlParams?.get('order');

        if (urlId) {
          if (sorted.some((c) => c.id === urlId)) {
            setSelectedId(urlId);
          } else {
            // Direct URL navigation from Order Details "Chat with user" (may have 0 messages yet)
            try {
              const directConv = await chatService.getAdminConversation(urlId);
              if (directConv?.id) {
                sorted.unshift(directConv);
                setConversations([...sorted]);
                setSelectedId(directConv.id);
              }
            } catch {
              setSelectedId(urlId);
            }
          }
        } else if (sorted.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedId((prev) => (prev && sorted.some((c) => c.id === prev) ? prev : sorted[0].id));
        }

        if (orderParam) {
          setReplyText((prev) => (prev ? prev : `Hi! Regarding your order ${orderParam}: `));
        }
      }
    } catch {
      if (!silent) toast.error('Failed to load conversations');
    } finally {
      isFetchingConversationsRef.current = false;
      if (!silent) setLoadingList(false);
    }
  }, [isViewingArchived]);

  // Re-fetch conversations only when switching between active and archived tabs or on login/user switch
  useEffect(() => {
    loadConversations();
  }, [loadConversations, me?.id]);

  // 2. Load initial 20 messages for active conversation
  const loadMessages = useCallback(async (id: string) => {
    try {
      setLoadingMessages(true);
      setInitialChatReady(false);
      isInitialChatLoadRef.current = true;
      const data = await chatService.getAdminMessages(id, PAGE_SIZE);
      const items = data || [];
      setMessages(items);
      const more = items.length >= PAGE_SIZE;
      setHasMoreMessages(more);
      hasMoreMessagesRef.current = more;
      lastLatestMessageIdRef.current = items.length > 0 ? items[items.length - 1].id : null;
      setLoadingMessages(false);

      // Auto-mark read by admin via socket and REST in background
      const socket = getChatSocket();
      if (socket.connected) {
        socket.emit('chat:read', { conversationId: id, readerType: 'admin' });
        socket.emit('chat:mark_read', { conversationId: id, readerType: 'admin' });
      }
      chatService.markAdminRead(id).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadAdminCount: 0 } : c)),
      );
    } catch {
      toast.error('Failed to load messages');
      setLoadingMessages(false);
      setInitialChatReady(true);
    }
  }, []);

  // 3. Scroll pagination: load older 20 messages when scrolled towards top
  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || isLoadingOlderRef.current || !hasMoreMessagesRef.current || messages.length === 0) return;

    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    isLoadingOlderRef.current = true;
    setLoadingOlderMessages(true);

    const el = messagesContainerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    const prevScrollTop = el?.scrollTop || 0;

    try {
      const older = await chatService.getAdminMessages(selectedId, PAGE_SIZE, oldest.createdAt);

      if (!older || older.length === 0) {
        setHasMoreMessages(false);
        hasMoreMessagesRef.current = false;
      } else {
        if (older.length < PAGE_SIZE) {
          setHasMoreMessages(false);
          hasMoreMessagesRef.current = false;
        }

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = older.filter((m) => !existingIds.has(m.id));
          if (uniqueOlder.length === 0) {
            setHasMoreMessages(false);
            hasMoreMessagesRef.current = false;
            return prev;
          }
          return [...uniqueOlder, ...prev];
        });

        // Maintain exact scroll position so viewport does not jump
        requestAnimationFrame(() => {
          if (el) {
            const heightDiff = el.scrollHeight - prevScrollHeight;
            el.scrollTop = prevScrollTop + heightDiff;
            lastScrollTopRef.current = el.scrollTop;
          }
        });
      }
    } catch {
      toast.error('Failed to load older messages');
    } finally {
      isLoadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [selectedId, messages]);

  const loadCustomerContext = useCallback(async (id: string) => {
    try {
      setLoadingContext(true);
      const ctx = await chatService.getCustomerContext(id);
      setCustomerContext(ctx);
    } catch {
      setCustomerContext(null);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      loadCustomerContext(selectedId);
      setIsSearchingChat(false);
      setChatSearchQuery('');
      if (pendingFileRef.current) {
        URL.revokeObjectURL(pendingFileRef.current.previewUrl);
        setPendingFile(null);
      }
      inputRef.current?.focus({ preventScroll: true });
    } else {
      setMessages([]);
      setCustomerContext(null);
      if (pendingFileRef.current) {
        URL.revokeObjectURL(pendingFileRef.current.previewUrl);
        setPendingFile(null);
      }
    }
  }, [selectedId, loadMessages, loadCustomerContext]);

  // 3. Setup WebSocket connection for live WhatsApp synchronization
  useEffect(() => {
    if (!me?.id) return;

    const socket = connectChatSocket();

    const joinAdminRooms = () => {
      socket.emit('chat:join', { role: 'admin' });
      if (selectedId) {
        socket.emit('chat:join', { conversationId: selectedId, role: 'admin' });
      }
      loadConversations(true);
    };

    socket.on('connect', joinAdminRooms);
    if (socket.connected) {
      joinAdminRooms();
    }

    // Live update when conversation metadata changes or customer sends message
    const onConversationUpdated = (payload: {
      conversation: Conversation;
      latestMessage?: ChatMessage;
    }) => {
      const conv = payload.conversation;

      // Do not add conversations that have never had a message sent
      const hasMessage = Boolean(
        conv.lastMessageAt ||
        (conv as any).last_message_at ||
        payload.latestMessage?.id ||
        conv.lastMessageText
      );
      if (!hasMessage) {
        return;
      }

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conv.id);

        if (isViewingArchived && !conv.isArchived) {
          return prev.filter((c) => c.id !== conv.id);
        }
        if (!isViewingArchived && conv.isArchived) {
          return prev.filter((c) => c.id !== conv.id);
        }

        const merged: Conversation = {
          ...(idx >= 0 ? prev[idx] : conv),
          ...conv,
          lastMessageText: payload.latestMessage?.text || conv.lastMessageText,
          lastMessageAt: payload.latestMessage?.createdAt || conv.lastMessageAt || (idx >= 0 ? prev[idx].lastMessageAt : undefined),
        };

        const rest = prev.filter((c) => c.id !== conv.id);
        return [merged, ...rest];
      });

      if (payload.latestMessage && payload.latestMessage.senderType === 'customer') {
        playIncomingChime();
      }
    };

    // Live message incoming
    const onMessage = (msg: ChatMessage) => {
      if (msg.conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.senderType === 'customer') {
          playIncomingChime();
          socket.emit('chat:read', { conversationId: selectedId, readerType: 'admin' });
          socket.emit('chat:mark_read', { conversationId: selectedId, readerType: 'admin' });
          chatService.markAdminRead(msg.conversationId).catch(() => {});
        }
      } else if (msg.senderType === 'customer') {
        playIncomingChime();
      }

      // Re-sort conversation to top of list
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx >= 0) {
          const target = {
            ...prev[idx],
            lastMessageText: msg.text,
            lastMessageAt: msg.createdAt,
            unreadAdminCount:
              msg.senderType === 'customer' && msg.conversationId !== selectedId
                ? (prev[idx].unreadAdminCount || 0) + 1
                : prev[idx].unreadAdminCount,
          };
          const rest = prev.filter((c) => c.id !== msg.conversationId);
          return [target, ...rest];
        } else {
          // New conversation started: reload list so it appears in admin list immediately
          loadConversations(true);
          return prev;
        }
      });
    };

    const onTyping = (payload: {
      conversationId: string;
      isTyping: boolean;
      senderType: string;
    }) => {
      if (payload.conversationId === selectedId && payload.senderType === 'customer') {
        setIsCustomerTyping(payload.isTyping);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (payload.isTyping) {
          typingTimerRef.current = setTimeout(() => setIsCustomerTyping(false), 3000);
        }
      }
    };

    const onReadReceipt = (payload: { conversationId: string; readerType?: string }) => {
      if (payload.conversationId === selectedId && (payload.readerType === 'customer' || !payload.readerType)) {
        setMessages((prev) =>
          prev.map((m) => (m.senderType === 'admin' ? { ...m, isRead: true } : m)),
        );
      }
    };

    socket.on('chat:conversation_updated', onConversationUpdated);
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read_receipt', onReadReceipt);

    return () => {
      socket.off('connect', joinAdminRooms);
      socket.off('chat:conversation_updated', onConversationUpdated);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read_receipt', onReadReceipt);
    };
  }, [selectedId, isViewingArchived, me?.id, loadConversations]);

  // Reset initial load and pagination flags when selected conversation changes
  useEffect(() => {
    if (selectedId !== prevSelectedIdRef.current) {
      isInitialChatLoadRef.current = true;
      setInitialChatReady(false);
      setHasMoreMessages(true);
      hasMoreMessagesRef.current = true;
      setLoadingOlderMessages(false);
      isLoadingOlderRef.current = false;
      prevSelectedIdRef.current = selectedId;
      prevMessagesCountRef.current = 0;
      lastLatestMessageIdRef.current = null;
      setChatSearchQuery('');
      setIsSearchingChat(false);
      setActiveMatchIndex(0);
    }
  }, [selectedId]);

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
      lastScrollTopRef.current = el.scrollTop;
      isNearBottomRef.current = true;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      isNearBottomRef.current = true;
    }
  }, []);

  const handleMessagesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      lastScrollTopRef.current = el.scrollTop;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = distanceFromBottom < 100;

      // Auto-trigger pagination when scrolled near the top (< 80px)
      if (
        el.scrollTop < 80 &&
        !isLoadingOlderRef.current &&
        hasMoreMessagesRef.current &&
        !isInitialChatLoadRef.current &&
        messages.length >= PAGE_SIZE
      ) {
        loadOlderMessages();
      }
    },
    [loadOlderMessages, messages.length],
  );

  // Instantly pin to bottom on initial conversation open BEFORE browser paint (no top-to-bottom scroll)
  useIsomorphicLayoutEffect(() => {
    if (!selectedId || messages.length === 0 || loadingMessages) return;

    if (isInitialChatLoadRef.current) {
      const el = messagesContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
        lastScrollTopRef.current = el.scrollHeight;
        isNearBottomRef.current = true;
      }
      prevMessagesCountRef.current = messages.length;
      lastLatestMessageIdRef.current = messages[messages.length - 1]?.id || null;
      isInitialChatLoadRef.current = false;
      setInitialChatReady(true);
      return;
    }

    // Only auto-scroll down if a BRAND NEW message arrived at the bottom
    const latestId = messages[messages.length - 1]?.id || null;
    const isNewMessageAtBottom = latestId && latestId !== lastLatestMessageIdRef.current;
    if (isNewMessageAtBottom) {
      lastLatestMessageIdRef.current = latestId;
      if (isNearBottomRef.current) {
        scrollToBottom(false);
      }
    } else if (isCustomerTyping && isNearBottomRef.current) {
      scrollToBottom(false);
    }

    prevMessagesCountRef.current = messages.length;
  }, [selectedId, messages, loadingMessages, isCustomerTyping, scrollToBottom]);

  // Handle tab switch / window focus / document visibility change: keep anchored to bottom or preserve scroll
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        const el = messagesContainerRef.current;
        if (!el) return;
        if (isNearBottomRef.current) {
          scrollToBottom(true);
          requestAnimationFrame(() => scrollToBottom(true));
        } else if (lastScrollTopRef.current > 0) {
          el.scrollTop = lastScrollTopRef.current;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [scrollToBottom]);

  // Re-anchor bottom when container resizes (e.g. desktop side-panel toggled or window resized)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When Customer Insights / Orders Drawer or desktop panel toggles, re-anchor cleanly
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = messagesContainerRef.current;
      if (!el) return;
      if (isNearBottomRef.current) {
        scrollToBottom(true);
      } else if (lastScrollTopRef.current > 0) {
        el.scrollTop = lastScrollTopRef.current;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showCustomerContext, scrollToBottom]);

  // Adjust admin textarea height: starts at 36px (matching send button h-9), auto-expands up to 5 lines
  const adjustAdminTextareaHeight = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '36px';
    if (!el.value) {
      el.style.height = '36px';
      el.style.overflowY = 'hidden';
      return;
    }
    const scrollHeight = el.scrollHeight;
    if (scrollHeight > 38) {
      const maxHeight = 120;
      el.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    } else {
      el.style.height = '36px';
      el.style.overflowY = 'hidden';
    }
  }, []);

  useEffect(() => {
    adjustAdminTextareaHeight(inputRef.current);
  }, [replyText, adjustAdminTextareaHeight]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      if (tab === 'unread' && (c.unreadAdminCount || 0) <= 0) return false;
      if (tab === 'blocked' && !c.isBlocked) return false;
      if (q) {
        const matchesName = (c.customerName || '').toLowerCase().includes(q);
        const matchesEmail = (c.customerEmail || '').toLowerCase().includes(q);
        const matchesPhone = (c.customerPhone || '').toLowerCase().includes(q);
        const matchesLastMsg = (c.lastMessageText || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesLastMsg) {
          return false;
        }
      }
      return true;
    });
  }, [conversations, tab, searchQuery]);

  // Filter messages within current chat
  const matchingMessageIds = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const q = chatSearchQuery.trim().toLowerCase();
    return messages
      .filter((m) => (m.text || '').toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, chatSearchQuery]);

  const inChatMatchesCount = matchingMessageIds.length;

  const handleNextMatch = useCallback(() => {
    if (matchingMessageIds.length === 0) return;
    setActiveMatchIndex((prev) => {
      const nextIdx = (prev + 1) % matchingMessageIds.length;
      const targetId = matchingMessageIds[nextIdx];
      document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return nextIdx;
    });
  }, [matchingMessageIds]);

  const handlePrevMatch = useCallback(() => {
    if (matchingMessageIds.length === 0) return;
    setActiveMatchIndex((prev) => {
      const prevIdx = (prev - 1 + matchingMessageIds.length) % matchingMessageIds.length;
      const targetId = matchingMessageIds[prevIdx];
      document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return prevIdx;
    });
  }, [matchingMessageIds]);

  // When search query changes, reset to first match and scroll to it
  useEffect(() => {
    if (matchingMessageIds.length > 0) {
      setActiveMatchIndex(0);
      const timer = setTimeout(() => {
        const targetId = matchingMessageIds[0];
        document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setActiveMatchIndex(0);
    }
  }, [chatSearchQuery, matchingMessageIds.length]);

  // Handle send admin reply
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = replyText.trim();
    if (!selectedId || (!textToSend && !pendingFile) || isSending || activeConversation?.isBlocked) return;

    setIsSending(true);

    try {
      let attachmentPayload: { url: string; type: string } | undefined = undefined;

      if (pendingFile) {
        try {
          const isPdf = pendingFile.file.type === 'application/pdf' || pendingFile.file.name.toLowerCase().endsWith('.pdf');
          const isVideo = !isPdf && pendingFile.file.type.startsWith('video/');
          const res = await chatService.uploadAdminAttachment(pendingFile.file);
          attachmentPayload = { url: res.url, type: res.type || (isPdf ? 'pdf' : isVideo ? 'video' : 'image') };
        } catch {
          const isPdf = pendingFile.file.type === 'application/pdf' || pendingFile.file.name.toLowerCase().endsWith('.pdf');
          const isVideo = !isPdf && pendingFile.file.type.startsWith('video/');
          toast.error(`Failed to upload ${isPdf ? 'PDF' : isVideo ? 'video' : 'image'}. Please try again.`);
          setIsSending(false);
          return;
        }
      }

      const socket = getChatSocket();
      const adminName = me?.name || 'Support Agent';

      if (socket.connected) {
        socket.timeout(3000).emit(
          'chat:message',
          {
            conversationId: selectedId,
            text: textToSend,
            attachmentUrl: attachmentPayload?.url,
            attachmentType: attachmentPayload?.type || 'image',
            senderType: 'admin',
            senderName: adminName,
          },
          async (err: any, response: any) => {
            if (err || !response?.success) {
              try {
                const res = await chatService.sendAdminReply(
                  selectedId,
                  textToSend,
                  attachmentPayload,
                );
                const saved: ChatMessage = (res as any)?.message ?? res;
                if (saved && saved.id) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === saved.id)) return prev;
                    return [...prev, saved];
                  });
                }
              } catch (fallbackErr) {
                console.error('Admin reply REST fallback failed:', fallbackErr);
              }
            }
          },
        );
      } else {
        const res = await chatService.sendAdminReply(
          selectedId,
          textToSend,
          attachmentPayload,
        );
        const saved: ChatMessage = (res as any)?.message ?? res;
        if (saved && saved.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === saved.id)) return prev;
            return [...prev, saved];
          });
        }
      }

      setReplyText('');
      if (pendingFile) {
        URL.revokeObjectURL(pendingFile.previewUrl);
        setPendingFile(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowQuickReplies(false);
      if (inputRef.current) {
        inputRef.current.style.height = '36px';
        inputRef.current.style.overflowY = 'hidden';
      }

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === selectedId);
        if (idx >= 0) {
          const item = {
            ...prev[idx],
            lastMessageText: textToSend || (attachmentPayload?.type === 'video' ? '🎥 Video' : '📷 Photo'),
            lastMessageAt: new Date().toISOString(),
          };
          const rest = prev.filter((c) => c.id !== selectedId);
          return [item, ...rest];
        }
        return prev;
      });

      if (socket.connected) {
        socket.emit('chat:typing', {
          conversationId: selectedId,
          isTyping: false,
          senderName: adminName,
          senderType: 'admin',
        });
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);
    adjustAdminTextareaHeight(e.target);

    if (selectedId) {
      const socket = getChatSocket();
      if (socket.connected) {
        socket.emit('chat:typing', {
          conversationId: selectedId,
          isTyping: val.length > 0,
          senderName: me?.name || 'Support Agent',
          senderType: 'admin',
        });
      }
    }
  };

  // 1-Click Send Order Info into chat composer
  const handleInsertOrderInfo = (ord: any) => {
    const ref = ord.reference || ord.id.slice(0, 8);
    const awbSnippet = ord.trackingNumber ? ` (AWB: ${ord.trackingNumber})` : '';
    const courierSnippet = ord.carrier ? ` via ${ord.carrier}` : '';
    const trackingLink = ord.trackingNumber
      ? ` Track live: https://shiprocket.co/tracking/${encodeURIComponent(ord.trackingNumber)}`
      : '';

    const text = `Hi, regarding your order #${ref}: Current status is ${ord.status.toUpperCase()}${courierSnippet}${awbSnippet}.${trackingLink}`;
    setReplyText(text);
    if (isMobile) {
      setShowCustomerContext(false);
    }
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 100);
    toast.success('Order information inserted into message');
  };

  // Handle admin image, video, or PDF attachment (deferred upload on send)
  const handleAdminFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg'];
    const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg', 'video/x-matroska'];
    const isImage = allowedImages.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
    const isVideo = allowedVideos.includes(file.type.toLowerCase()) || file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isVideo && !isPdf) {
      toast.error('Only images (JPG, PNG, WEBP, GIF), videos (MP4, WEBM, MOV), and PDF documents are supported');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (!isVideo && !isPdf && file.size > 15 * 1024 * 1024) {
      toast.error('Image must be under 15MB');
      return;
    }
    if (file.size > maxSize) {
      toast.error(`${isPdf ? 'PDF' : 'Video'} must be under 50MB`);
      return;
    }

    if (pendingFile) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }

    const previewUrl = isPdf ? '' : URL.createObjectURL(file);
    setPendingFile({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Archive / Unarchive
  const handleToggleArchive = async (convId?: string) => {
    const targetId = convId || selectedId;
    if (!targetId) return;

    const targetConv = conversations.find((c) => c.id === targetId);
    if (!targetConv) return;

    const nextArchived = !targetConv.isArchived;
    const name = targetConv.customerName || targetConv.customerEmail || 'this customer';

    const ok = await confirm({
      title: nextArchived ? 'Archive conversation?' : 'Unarchive conversation?',
      description: nextArchived
        ? `Are you sure you want to archive the conversation with ${name}? It will be moved to the Archived tab.`
        : `Are you sure you want to unarchive the conversation with ${name}? It will be restored to your active inbox.`,
      confirmText: nextArchived ? 'Archive' : 'Unarchive',
    });
    if (!ok) return;

    try {
      await chatService.archiveConversation(targetId, nextArchived);

      setConversations((prev) => {
        if (!isViewingArchived && nextArchived) return prev.filter((c) => c.id !== targetId);
        if (isViewingArchived && !nextArchived) return prev.filter((c) => c.id !== targetId);
        return prev.map((c) => (c.id === targetId ? { ...c, isArchived: nextArchived } : c));
      });

      setArchivedCount((prev) => (nextArchived ? prev + 1 : Math.max(0, prev - 1)));

      if (targetId === selectedId && (!isViewingArchived && nextArchived)) {
        const remaining = conversations.filter((c) => c.id !== targetId);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }

      toast.success(nextArchived ? 'Chat archived' : 'Chat unarchived');
    } catch {
      toast.error('Failed to update archive status');
    }
  };

  // Block / Unblock
  const handleToggleBlock = async (convId?: string) => {
    const targetId = convId || selectedId;
    if (!targetId) return;

    const targetConv = conversations.find((c) => c.id === targetId);
    if (!targetConv) return;

    const nextBlocked = !targetConv.isBlocked;
    const name = targetConv.customerName || targetConv.customerEmail || 'this customer';

    const ok = await confirm({
      title: nextBlocked ? 'Block customer?' : 'Unblock customer?',
      description: nextBlocked
        ? `Are you sure you want to block ${name}? They will not be able to send any messages to your store.`
        : `Are you sure you want to unblock ${name}? They will be able to message support again.`,
      confirmText: nextBlocked ? 'Block' : 'Unblock',
      destructive: nextBlocked,
    });
    if (!ok) return;

    try {
      await chatService.blockConversation(targetId, nextBlocked);

      setConversations((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, isBlocked: nextBlocked } : c)),
      );

      toast.success(nextBlocked ? 'Customer blocked' : 'Customer unblocked');
    } catch {
      toast.error('Failed to update block status');
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#efeae2]/30 dark:bg-[#0b141a]/90 font-sans">
      {/* ── Left Pane: WhatsApp Chat List & Sidebar ───────────────── */}
      <div
        className={cn(
          'flex flex-col h-full min-h-0 border-r bg-background shrink-0 select-none shadow-xs',
          activeConversation ? 'hidden md:flex md:w-72 lg:w-80 xl:w-96' : 'w-full md:w-72 lg:w-80 xl:w-96',
        )}
      >
        {/* Top Header with Search Bar */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 shrink-0 h-16">
          {isViewingArchived ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewingArchived(false)}
                className="h-8 gap-1.5 text-xs font-semibold text-[#187b7b] hover:text-[#136363] px-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Chats
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                {archivedCount} archived
              </span>
            </div>
          ) : (
            <>
              {/* Search Bar right in the header */}
              <div className="relative flex-1 flex items-center min-w-0">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-9 w-full rounded-lg bg-background border pl-9 pr-8 text-xs font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#187b7b] focus:border-[#187b7b] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                {/* Auto-Reply Keywords Bot Button */}
                <button
                  type="button"
                  onClick={() => setAutoReplyOpen(true)}
                  title="Auto-reply keyword rules"
                  className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-[#187b7b]"
                  aria-label="Auto-reply keyword rules"
                >
                  <Bot className="h-4 w-4 text-[#187b7b]" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                </button>

                <button
                  onClick={() => setIsViewingArchived(true)}
                  title="Archived chats"
                  className={cn(
                    'relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    archivedCount > 0 && 'text-[#187b7b]',
                  )}
                  aria-label="View archived chats"
                >
                  <Archive className="h-4 w-4" />
                  {archivedCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>

                <button
                  onClick={() => loadConversations()}
                  disabled={loadingList}
                  title="Refresh chats"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Refresh conversation list"
                >
                  <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Filter Chips */}
        <div className="border-b bg-card px-3 shrink-0 h-11 flex items-center">
          <div className="flex items-center gap-1.5">
            {(['all', 'unread', 'blocked'] as FilterTab[]).map((f) => {
              const active = tab === f;
              const count = f === 'unread' ? totalUnreadCount : f === 'blocked' ? blockedCount : null;

              return (
                <button
                  key={f}
                  onClick={() => setTab(f)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all capitalize',
                    active
                      ? 'bg-[#187b7b] text-white shadow-2xs font-semibold'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>{f}</span>
                  {count !== null && count > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1 text-[10px] font-bold leading-none py-0.5',
                        active ? 'bg-white/20 text-white' : 'bg-muted-foreground/20 text-foreground',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Archived Banner */}
        {!isViewingArchived && archivedCount > 0 && (
          <button
            onClick={() => setIsViewingArchived(true)}
            className="flex items-center justify-between border-b px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <div className="flex items-center gap-3">
              <Archive className="h-4 w-4 text-[#187b7b]" />
              <span className="font-semibold text-foreground">Archived</span>
            </div>
            <span className="text-xs font-bold text-[#187b7b]">{archivedCount}</span>
          </button>
        )}

        {/* Conversation List Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 overscroll-contain">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#187b7b]" />
              <p className="text-xs font-medium">Loading chats...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 stroke-1 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {isViewingArchived ? 'No archived chats' : 'No chats found'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                Customer messages will appear here in real time.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const hasUnread = (conv.unreadAdminCount || 0) > 0;
              const avatarLetter = (conv.customerName?.[0] || conv.customerEmail?.[0] || 'C').toUpperCase();
              const avatarBg = getAvatarBg(conv.customerName || conv.customerEmail);

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors border-l-4',
                    isSelected
                      ? 'bg-muted/70 border-l-[#187b7b]'
                      : 'hover:bg-muted/40 border-l-transparent',
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full text-white font-bold text-sm shadow-2xs select-none',
                        avatarBg,
                      )}
                    >
                      {avatarLetter}
                    </div>
                    {conv.isBlocked && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                        <Ban className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center h-11">
                    <div className="flex items-center justify-between gap-1 h-5">
                      <span className="font-semibold text-xs md:text-sm truncate text-foreground leading-normal">
                        {conv.customerEmail || 'Store Customer'}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] shrink-0 font-medium',
                          hasUnread ? 'text-[#25D366] font-bold' : 'text-muted-foreground',
                        )}
                      >
                        {formatWhatsAppTime(conv.lastMessageAt || conv.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 h-5 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0 text-xs text-muted-foreground truncate">
                        <p className="truncate line-clamp-1 text-[11px] md:text-xs leading-normal">
                          {conv.lastMessageText || 'Chat started'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 h-5">
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(conv.id);
                            }}
                            title={conv.isArchived ? 'Unarchive' : 'Archive'}
                            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                          >
                            {conv.isArchived ? (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBlock(conv.id);
                            }}
                            title={conv.isBlocked ? 'Unblock' : 'Block'}
                            className={cn(
                              'h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-background transition-colors',
                              conv.isBlocked ? 'text-emerald-600 hover:text-emerald-700' : 'hover:text-rose-600',
                            )}
                          >
                            {conv.isBlocked ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {hasUnread && (
                          <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white shadow-2xs">
                            {conv.unreadAdminCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Middle/Right Pane: WhatsApp Active Chat or Initial Page ── */}
      <div
        className={cn(
          'flex-1 h-full min-h-0 overflow-hidden relative',
          activeConversation ? 'flex flex-col w-full' : 'hidden md:flex',
        )}
      >
        <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-[#efeae2]/40 dark:bg-[#0b141a]/95 relative">
          {loadingList ? (
            /* Neutral loading state while fetching conversation list — prevents flashing the WhatsApp illustration empty state */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center select-none">
              <Loader2 className="h-8 w-8 animate-spin text-[#187b7b]/50" />
            </div>
          ) : !activeConversation ? (
            /* ── WhatsApp Initial Page ── */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center select-none border-b-[6px] border-b-[#25D366]">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-[#187b7b] dark:text-[#25D366] mb-6 shadow-sm ring-1 ring-emerald-500/20">
                <MessageSquare className="h-12 w-12 stroke-[1.5]" />
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                Customer Support Live Chat
              </h1>

              <p className="text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
                Send and receive real-time messages with storefront customers. Keep conversations organized, view customer order history, or send photos seamlessly.
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-background/60 backdrop-blur-xs px-4 py-2 rounded-full border shadow-2xs">
                <Lock className="h-3.5 w-3.5 text-[#187b7b]" />
                <span>Real-time WebSockets • MinIO Object Storage • PostgreSQL Persistence</span>
              </div>
            </div>
          ) : (
            /* ── WhatsApp Active Chat ── */
            <>
              {/* WhatsApp Top Contact Bar */}
              <div className="flex items-center justify-between border-b bg-card px-2.5 sm:px-4 md:px-5 shrink-0 shadow-2xs z-10 h-16">
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1 mr-1.5 sm:mr-3">
                  {/* Mobile Back to List Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(null)}
                    className="md:hidden -ml-1 rounded-lg p-1 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="relative shrink-0 select-none">
                    <div
                      className={cn(
                        'flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-white font-bold text-xs sm:text-xs md:text-sm shadow-2xs shrink-0',
                        getAvatarBg(activeConversation.customerName || activeConversation.customerEmail),
                      )}
                    >
                      {(activeConversation.customerName?.[0] ||
                        messages.find((m) => m.senderType === 'customer')?.senderName?.[0] ||
                        activeConversation.customerEmail?.[0] ||
                        'C').toUpperCase()}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                        {activeConversation.customerName ||
                          messages.find((m) => m.senderType === 'customer')?.senderName ||
                          'Store Customer'}
                      </h2>

                      {activeConversation.isBlocked && (
                        <Badge className="bg-rose-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 shrink-0 font-medium">
                          Blocked
                        </Badge>
                      )}
                      {activeConversation.isArchived && (
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] border-amber-500/50 text-amber-600 px-1 sm:px-1.5 py-0 h-4 shrink-0 font-medium">
                          Archived
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5 min-w-0 truncate">
                      {activeConversation.customerEmail && (
                        <span className="truncate min-w-0">{activeConversation.customerEmail}</span>
                      )}
                      {activeConversation.customerPhone && (
                        <span className="hidden sm:flex items-center gap-1 shrink-0">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{activeConversation.customerPhone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* In-Chat Message Search Toggle */}
                  <Button
                    variant={isSearchingChat ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => {
                      setIsSearchingChat(!isSearchingChat);
                      if (isSearchingChat) setChatSearchQuery('');
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    title="Search messages in this chat"
                  >
                    <Search className="h-4 w-4" />
                  </Button>

                  {/* Customer Orders & Insights Toggle Button */}
                  <Button
                    variant={showCustomerContext ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowCustomerContext(!showCustomerContext)}
                    className={cn(
                      'h-8 text-xs gap-1 px-2 sm:px-2.5 md:px-3 shrink-0',
                      showCustomerContext
                        ? 'bg-[#187b7b] hover:bg-[#136363] text-white'
                        : 'border-border text-foreground',
                    )}
                    title="View customer orders & profile"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Orders</span>
                    {customerContext?.stats?.totalOrders ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0 text-[10px] font-bold',
                          showCustomerContext ? 'bg-white/20 text-white' : 'bg-muted text-foreground',
                        )}
                      >
                        {customerContext.stats.totalOrders}
                      </span>
                    ) : null}
                  </Button>

                  {/* Archive Icon Button */}
                  <Button
                    variant={activeConversation.isArchived ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => handleToggleArchive()}
                    className={cn(
                      'h-8 w-8 shrink-0 transition-colors',
                      activeConversation.isArchived
                        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    title={activeConversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
                    aria-label={activeConversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
                  >
                    {activeConversation.isArchived ? (
                      <ArchiveRestore className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Block Icon Button */}
                  <Button
                    variant={activeConversation.isBlocked ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => handleToggleBlock()}
                    className={cn(
                      'h-8 w-8 shrink-0 transition-colors',
                      activeConversation.isBlocked
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'text-muted-foreground hover:text-rose-600',
                    )}
                    title={activeConversation.isBlocked ? 'Unblock customer' : 'Block customer'}
                    aria-label={activeConversation.isBlocked ? 'Unblock customer' : 'Block customer'}
                  >
                    {activeConversation.isBlocked ? (
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Ban className="h-4 w-4 text-rose-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* In-Chat Message Search Input Bar */}
              {isSearchingChat && (
                <div className="flex items-center gap-1.5 sm:gap-2 border-b bg-background px-3 sm:px-4 text-xs animate-in slide-in-from-top-1 shrink-0 h-11">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.shiftKey) {
                          handlePrevMatch();
                        } else {
                          handleNextMatch();
                        }
                      } else if (e.key === 'Escape') {
                        setIsSearchingChat(false);
                        setChatSearchQuery('');
                      }
                    }}
                    placeholder="Search in conversation..."
                    className="h-7 text-xs bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-[#187b7b] flex-1 min-w-0"
                    autoFocus
                  />
                  {chatSearchQuery.trim() && (
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'text-[11px] select-none font-medium',
                          matchingMessageIds.length > 0 ? 'text-muted-foreground' : 'text-rose-500',
                        )}
                      >
                        {matchingMessageIds.length > 0
                          ? `${activeMatchIndex + 1} of ${matchingMessageIds.length}`
                          : 'No matches'}
                      </span>

                      {matchingMessageIds.length > 0 && (
                        <div className="flex items-center border-l pl-1 sm:pl-1.5 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevMatch}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Previous match (Shift+Enter or Up)"
                            aria-label="Previous match"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleNextMatch}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Next match (Enter or Down)"
                            aria-label="Next match"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchingChat(false);
                      setChatSearchQuery('');
                    }}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                    title="Close search"
                    aria-label="Close search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Message History */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className={cn(
                  'flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-3 flex flex-col gap-3 overscroll-contain',
                  !initialChatReady && loadingMessages ? 'opacity-0' : 'opacity-100 transition-opacity duration-150',
                )}
              >
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-[#187b7b]" />
                    <p className="text-xs">Loading message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                    <Inbox className="h-10 w-10 stroke-1 mb-2 text-muted-foreground/40" />
                    <p className="text-xs font-semibold text-foreground">No messages in this chat yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Scroll Pagination Top Indicator */}
                    {loadingOlderMessages ? (
                      <div className="flex items-center justify-center py-2 text-muted-foreground gap-2 select-none">
                        <Loader2 className="h-4 w-4 animate-spin text-[#187b7b]" />
                        <span className="text-[11px] font-medium">Loading older messages...</span>
                      </div>
                    ) : hasMoreMessages && messages.length >= PAGE_SIZE ? (
                      <div className="flex justify-center py-1 select-none">
                        <button
                          type="button"
                          onClick={loadOlderMessages}
                          className="text-[11px] text-muted-foreground hover:text-[#187b7b] hover:bg-muted font-medium py-1 px-3 rounded-full bg-background/70 border shadow-2xs transition-colors"
                        >
                          Load older messages
                        </button>
                      </div>
                    ) : !hasMoreMessages && messages.length >= PAGE_SIZE ? (
                      <div className="flex justify-center my-2 select-none">
                        <span className="rounded-md bg-muted/40 px-2.5 py-0.5 text-[10px] text-muted-foreground/70">
                          Beginning of conversation history
                        </span>
                      </div>
                    ) : null}

                    {messages.map((msg, i) => {
                    const isAdmin = msg.senderType === 'admin';
                    const isSystem = msg.senderType === 'system';
                    const showDateDivider =
                      i === 0 ||
                      formatMessageDateDivider(msg.createdAt) !==
                        formatMessageDateDivider(messages[i - 1].createdAt);

                    // Highlight matching search query
                    const matchesSearch =
                      chatSearchQuery.trim() &&
                      (msg.text || '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase());
                    const isActiveMatch =
                      matchesSearch &&
                      matchingMessageIds[activeMatchIndex] === msg.id;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateDivider && (
                          <div className="flex justify-center my-2 select-none">
                            <span className="rounded-md bg-background/80 dark:bg-card/80 backdrop-blur-xs px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-2xs border">
                              {formatMessageDateDivider(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          id={`msg-${msg.id}`}
                          className={cn(
                            'flex flex-col max-w-[80%] md:max-w-[70%] transition-all duration-200 scroll-mt-20',
                            isAdmin ? 'self-end items-end' : 'self-start items-start',
                          )}
                        >
                          <div
                            className={cn(
                              'relative px-3.5 py-2 text-xs md:text-sm shadow-2xs leading-relaxed break-words whitespace-pre-wrap transition-all',
                              isAdmin
                                ? 'bg-[#d9fdd3] text-gray-900 dark:bg-[#005c4b] dark:text-white rounded-lg rounded-tr-none'
                                : isSystem
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/40 rounded-lg rounded-tl-none'
                                : 'bg-white text-gray-900 dark:bg-[#202c33] dark:text-white rounded-lg rounded-tl-none border border-black/5 dark:border-white/5',
                              matchesSearch && !isActiveMatch && 'ring-2 ring-amber-400/80 ring-offset-1',
                              isActiveMatch && 'ring-2 ring-[#187b7b] ring-offset-2 shadow-md scale-[1.01]',
                            )}
                          >
                            {!isAdmin && (
                              <p
                                className={cn(
                                  'font-semibold text-[11px] mb-0.5',
                                  isSystem
                                    ? 'text-amber-700 dark:text-amber-300'
                                    : 'text-[#187b7b] dark:text-[#25D366]',
                                )}
                              >
                                {msg.senderName || (isSystem ? 'Bot Assistant' : 'Customer')}
                              </p>
                            )}

                            {/* Media / Document Attachment Rendering (PDF / Image / Video) */}
                            {msg.attachmentUrl && (
                              <div className="mb-2 overflow-hidden rounded-lg">
                                {msg.attachmentType === 'pdf' || /\.pdf$/i.test(msg.attachmentUrl) ? (
                                  <a
                                    href={mediaSrc(msg.attachmentUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className={cn(
                                      'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer group/pdf',
                                      isAdmin
                                        ? 'bg-[#d9fdd3]/70 dark:bg-emerald-950/40 hover:bg-[#d9fdd3] dark:hover:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/40 text-foreground'
                                        : 'bg-background hover:bg-muted/80 border-border text-foreground',
                                    )}
                                    title="Open or download PDF document"
                                  >
                                    <div className="h-9 w-9 rounded-md bg-red-500/15 dark:bg-red-500/25 text-red-500 flex items-center justify-center shrink-0">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate max-w-[200px] sm:max-w-[240px]">
                                        {msg.attachmentUrl.split('/').pop() || 'Document.pdf'}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        PDF Document • Click to view
                                      </p>
                                    </div>
                                    <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover/pdf:translate-y-0.5" />
                                  </a>
                                ) : msg.attachmentType === 'video' || /\.(mp4|webm|mov|mkv|ogg)$/i.test(msg.attachmentUrl) ? (
                                  <video
                                    src={mediaSrc(msg.attachmentUrl)}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="max-h-60 w-auto max-w-full rounded-lg bg-black/90 object-contain shadow-xs"
                                    onLoadedMetadata={() => {
                                      if (isNearBottomRef.current && messagesContainerRef.current) {
                                        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                      }
                                    }}
                                  />
                                ) : (
                                  <a
                                    href={mediaSrc(msg.attachmentUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block group relative cursor-pointer"
                                    title="Open image in new tab"
                                  >
                                    <img
                                      src={mediaSrc(msg.attachmentUrl)}
                                      alt="Attachment"
                                      className="max-h-56 w-auto rounded-lg object-cover group-hover:opacity-95 transition-opacity"
                                      loading="lazy"
                                      onLoad={() => {
                                        if (isNearBottomRef.current && messagesContainerRef.current) {
                                          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                        }
                                      }}
                                    />
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.text &&
                              msg.text !== '📷 Photo' &&
                              msg.text !== '🎥 Video' &&
                              msg.text !== '📄 PDF Document' &&
                              msg.text !== '📎 Attachment' && (
                              <p className="text-inherit leading-relaxed">{msg.text}</p>
                            )}

                            <div
                              className={cn(
                                'flex items-center justify-end gap-1 mt-1 text-[10px] select-none',
                                isAdmin
                                  ? 'text-gray-600 dark:text-emerald-100/70'
                                  : 'text-gray-500 dark:text-gray-400',
                              )}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              {isAdmin && (
                                <CheckCheck
                                  className={cn(
                                    'h-3.5 w-3.5',
                                    msg.isRead
                                      ? 'text-sky-500 dark:text-sky-400'
                                      : 'text-gray-400 dark:text-gray-400/80',
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  </>
                )}

                {isCustomerTyping && (
                  <div className="flex items-center gap-2 self-start bg-white dark:bg-[#202c33] border rounded-full px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#187b7b] animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#187b7b] animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#187b7b] animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground">
                      {activeConversation.customerName || 'Customer'} is typing...
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Replies Dropdown Tray */}
              {showQuickReplies && (
                <div className="border-t bg-background/95 backdrop-blur-md p-3 max-h-56 overflow-y-auto space-y-2 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      Canned Responses / Quick Replies
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoReplyOpen(true)}
                        className="text-[11px] font-medium text-[#187b7b] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Manage automated reply rules"
                      >
                        <Settings className="h-3 w-3" />
                        Manage Rules
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(false)}
                        className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-muted cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {cannedRules.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      <p>No automated quick reply rules found.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAutoReplyOpen(true)}
                        className="mt-2 h-7 text-xs gap-1 cursor-pointer"
                      >
                        <Bot className="h-3 w-3" /> Add Rule in Auto-Reply
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cannedRules.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setReplyText(r.reply);
                            setShowQuickReplies(false);
                            inputRef.current?.focus({ preventScroll: true });
                          }}
                          className="text-left rounded-md border p-2 text-xs hover:bg-muted/80 hover:border-[#187b7b]/50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-foreground truncate group-hover:text-[#187b7b] transition-colors">
                              {r.name}
                            </p>
                            {r.category && (
                              <span className="text-[10px] rounded-sm bg-muted px-1 py-0.5 text-muted-foreground shrink-0">
                                {r.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                            {r.reply}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* WhatsApp Composer */}
              <div className="border-t bg-card px-4 py-3 shrink-0">
                {activeConversation.isBlocked ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>This customer is blocked. Messaging and replies are disabled.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleBlock()}
                      className="h-7 border-rose-300 text-rose-700 hover:bg-rose-100 text-xs dark:border-rose-800 dark:text-rose-200"
                    >
                      Unblock
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Pending media / PDF preview with cancel button */}
                    {pendingFile && (
                      <div className="relative inline-block self-start">
                        {pendingFile.file.type === 'application/pdf' ||
                        pendingFile.file.name.toLowerCase().endsWith('.pdf') ? (
                          /* PDF file chip */
                          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 pr-8 shadow-xs">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30 shrink-0">
                              <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                                {pendingFile.file.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">PDF Document</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemovePendingFile}
                              disabled={isSending}
                              className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black transition-colors cursor-pointer"
                              aria-label="Remove attachment"
                              title="Cancel / Remove"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border shadow-xs bg-muted">
                            {pendingFile.file.type.startsWith('video/') ? (
                              <div className="relative h-full w-full bg-black/80 flex items-center justify-center">
                                <video
                                  src={pendingFile.previewUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                  <Video className="h-5 w-5 text-white drop-shadow-sm" />
                                </div>
                              </div>
                            ) : (
                              <img
                                src={pendingFile.previewUrl}
                                alt="Preview"
                                className="h-full w-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={handleRemovePendingFile}
                              disabled={isSending}
                              className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black transition-colors cursor-pointer"
                              aria-label="Remove attachment"
                              title="Cancel / Remove"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleSendReply} className="flex items-end gap-2">
                      {/* Hidden file input for attachments (images, videos, PDFs) */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,video/mp4,video/webm,video/quicktime,application/pdf,.pdf"
                        onChange={handleAdminFileSelect}
                        className="hidden"
                      />

                      {/* Direct attachment button: immediately opens OS file manager */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isSending}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 w-9 shrink-0 mb-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Attach photo, video or PDF"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>

                      {/* Quick Replies Toggle Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className={cn(
                          'h-9 w-9 shrink-0 mb-0.5 transition-colors',
                          showQuickReplies
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        title="Quick Reply Templates"
                      >
                        <Zap className="h-4 w-4" />
                      </Button>

                      {/* Input textarea (height h-9 matches send button) */}
                      <textarea
                        ref={inputRef}
                        value={replyText}
                        onChange={handleReplyChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        placeholder={pendingFile ? 'Add a caption...' : 'Type a message...'}
                        rows={1}
                        className="flex-1 min-w-0 h-9 min-h-[36px] resize-none rounded-md border border-input bg-background px-3 py-2 text-xs md:text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#187b7b] leading-normal overflow-hidden mb-0.5"
                        autoComplete="off"
                      />

                      <Button
                        type="submit"
                        size="icon"
                        disabled={(!replyText.trim() && !pendingFile) || isSending}
                        className="h-9 w-9 shrink-0 rounded-md bg-[#187b7b] hover:bg-[#136363] text-white disabled:opacity-40 mb-0.5"
                        aria-label="Send message"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Collapsible Customer Insights & Orders Panel ──── */}
        {isMobile ? (
          /* Mobile Bottom Drawer */
          <Drawer
            open={showCustomerContext && !!activeConversation}
            onOpenChange={setShowCustomerContext}
          >
            <DrawerContent className="p-0 md:p-0 flex flex-col h-[85dvh] max-h-[85dvh] md:h-full md:max-h-none w-full md:w-96 md:max-w-96 overflow-hidden rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l shadow-2xl bg-background md:top-0 md:bottom-0 md:right-0 md:left-auto">
              {/* Drawer Header */}
              <DrawerHeader className="px-4 py-3 border-b flex items-center bg-muted/30 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#187b7b]/15 text-[#187b7b] shrink-0">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <DrawerTitle className="text-sm font-bold text-foreground truncate">
                      Customer Insights & Orders
                    </DrawerTitle>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {activeConversation?.customerName || activeConversation?.customerEmail || 'Customer Profile'}
                    </p>
                  </div>
                </div>
              </DrawerHeader>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 overscroll-contain">
                {loadingContext ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#187b7b]" />
                    <p className="text-xs">Loading customer orders...</p>
                  </div>
                ) : !customerContext ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No account profile found for this conversation.
                  </p>
                ) : (
                  <>
                    {/* Lifetime KPI Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border bg-card p-3 shadow-2xs">
                        <p className="text-[11px] font-medium text-muted-foreground">Total Orders</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {customerContext.stats.totalOrders}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3 shadow-2xs">
                        <p className="text-[11px] font-medium text-muted-foreground">Lifetime Spend</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          ₹{customerContext.stats.lifetimeSpend.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="rounded-lg border bg-card p-3 space-y-1.5 shadow-2xs text-xs">
                      <p className="font-semibold text-foreground text-xs pb-1 border-b">Contact Details</p>
                      <p className="text-muted-foreground flex items-center justify-between">
                        <span>Name:</span>
                        <span className="font-medium text-foreground">{customerContext.customer.name || 'N/A'}</span>
                      </p>
                      <p className="text-muted-foreground flex items-center justify-between">
                        <span>Email:</span>
                        <span className="font-medium text-foreground truncate max-w-[170px]">
                          {customerContext.customer.email || 'N/A'}
                        </span>
                      </p>
                      {customerContext.customer.phone && (
                        <p className="text-muted-foreground flex items-center justify-between">
                          <span>Phone:</span>
                          <span className="font-medium text-foreground">{customerContext.customer.phone}</span>
                        </p>
                      )}
                    </div>

                    {/* Recent Orders List with 1-Click "Insert Info into Chat" */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-foreground">Recent Orders ({customerContext.recentOrders.length})</h4>
                      </div>

                      {customerContext.recentOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No orders placed yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {customerContext.recentOrders.map((ord) => (
                            <div key={ord.id} className="rounded-lg border bg-card p-3 text-xs space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  {ord.reference || ord.id.slice(0, 8)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 capitalize"
                                >
                                  {ord.status}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                <span>₹{ord.total.toFixed(2)} • {ord.itemsCount} items</span>
                                <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                              </div>

                              {/* Tracking info if available */}
                              {ord.trackingNumber && (
                                <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                                  <Truck className="h-3.5 w-3.5 text-[#187b7b] shrink-0" />
                                  <span className="font-medium text-foreground truncate">
                                    {ord.carrier || 'Courier'}: {ord.trackingNumber}
                                  </span>
                                </div>
                              )}

                              {/* Actions: 1-Click Send Order Info + View Details */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleInsertOrderInfo(ord)}
                                  className="inline-flex items-center gap-1 font-semibold text-[#187b7b] hover:text-[#136363] hover:underline"
                                  title="Insert tracking and order info into chat reply"
                                >
                                  <MessageSquarePlus className="h-3.5 w-3.5" />
                                  <span>Send to Chat</span>
                                </button>

                                <Link
                                  href={`/admin/orders/${ord.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                                >
                                  <span>View Order</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pb-4" />
                  </>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          /* Desktop Overlay Drawer on Top of Message Detail (does not take width) */
          showCustomerContext && activeConversation && (
            <>
              {/* Click-away backdrop overlay over message detail */}
              <div
                className="absolute inset-0 bg-black/15 backdrop-blur-2xs z-20 transition-opacity animate-in fade-in duration-150"
                onClick={() => setShowCustomerContext(false)}
                aria-label="Close customer insights"
              />

              {/* Drawer mounted directly on top of message detail */}
              <div className="absolute top-0 right-0 bottom-0 z-30 w-80 md:w-96 border-l bg-background shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 bg-muted/30 shrink-0 h-16">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#187b7b]/15 text-[#187b7b] shrink-0">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      Customer Insights & Orders
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {activeConversation.customerName || activeConversation.customerEmail || 'Customer Profile'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCustomerContext(false)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                  aria-label="Close customer insights"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 overscroll-contain">
                {loadingContext ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#187b7b]" />
                    <p className="text-xs">Loading customer orders...</p>
                  </div>
                ) : !customerContext ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No account profile found for this conversation.
                  </p>
                ) : (
                  <>
                    {/* Lifetime KPI Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border bg-card p-3 shadow-2xs">
                        <p className="text-[11px] font-medium text-muted-foreground">Total Orders</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {customerContext.stats.totalOrders}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3 shadow-2xs">
                        <p className="text-[11px] font-medium text-muted-foreground">Lifetime Spend</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          ₹{customerContext.stats.lifetimeSpend.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="rounded-lg border bg-card p-3 space-y-1.5 shadow-2xs text-xs">
                      <p className="font-semibold text-foreground text-xs pb-1 border-b">Contact Details</p>
                      <p className="text-muted-foreground flex items-center justify-between">
                        <span>Name:</span>
                        <span className="font-medium text-foreground">{customerContext.customer.name || 'N/A'}</span>
                      </p>
                      <p className="text-muted-foreground flex items-center justify-between">
                        <span>Email:</span>
                        <span className="font-medium text-foreground truncate max-w-[170px]">
                          {customerContext.customer.email || 'N/A'}
                        </span>
                      </p>
                      {customerContext.customer.phone && (
                        <p className="text-muted-foreground flex items-center justify-between">
                          <span>Phone:</span>
                          <span className="font-medium text-foreground">{customerContext.customer.phone}</span>
                        </p>
                      )}
                    </div>

                    {/* Recent Orders List with 1-Click "Insert Info into Chat" */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-foreground">Recent Orders ({customerContext.recentOrders.length})</h4>
                      </div>

                      {customerContext.recentOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No orders placed yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {customerContext.recentOrders.map((ord) => (
                            <div key={ord.id} className="rounded-lg border bg-card p-3 text-xs space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  {ord.reference || ord.id.slice(0, 8)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 capitalize"
                                >
                                  {ord.status}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                <span>₹{ord.total.toFixed(2)} • {ord.itemsCount} items</span>
                                <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                              </div>

                              {/* Tracking info if available */}
                              {ord.trackingNumber && (
                                <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                                  <Truck className="h-3.5 w-3.5 text-[#187b7b] shrink-0" />
                                  <span className="font-medium text-foreground truncate">
                                    {ord.carrier || 'Courier'}: {ord.trackingNumber}
                                  </span>
                                </div>
                              )}

                              {/* Actions: 1-Click Send Order Info + View Details */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleInsertOrderInfo(ord)}
                                  className="inline-flex items-center gap-1 font-semibold text-[#187b7b] hover:text-[#136363] hover:underline"
                                  title="Insert tracking and order info into chat reply"
                                >
                                  <MessageSquarePlus className="h-3.5 w-3.5" />
                                  <span>Send to Chat</span>
                                </button>

                                <Link
                                  href={`/admin/orders/${ord.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                                >
                                  <span>View Order</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )
        )}
      </div>

      {/* Auto-Reply Keyword Rules Drawer */}
      <AutoReplyDrawer open={autoReplyOpen} onOpenChange={setAutoReplyOpen} />
    </div>
  );
}
