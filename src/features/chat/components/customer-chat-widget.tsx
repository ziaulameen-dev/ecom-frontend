'use client';

import {
  ArrowLeft,
  Bell,
  BellOff,
  Bot,
  Check,
  CheckCheck,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageCircleMore,
  MessageSquare,
  MessageSquareText,
  Package,
  Paperclip,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  User,
  Video,
  Volume2,
  X,
  ZoomIn,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useAuthModal, useMe } from '@/features/auth';
import { useContent } from '@/features/catalog';
import { cn, mediaSrc } from '@/lib/utils';
import { useChat } from '../hooks/use-chat';
import { chatService } from '../services/chat.service';
import { ChatMessage } from '../types';
import { isSoundMuted, playIncomingChime, setSoundMuted } from '../utils/chat-sound';

interface ActiveToastState {
  id: string;
  senderName: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

const PROMPT_DISMISSED_KEY = 'support_chat_prompt_dismissed';

function isPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(PROMPT_DISMISSED_KEY) === 'true' ||
      localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true'
    );
  } catch {
    return false;
  }
}

function persistPromptDismissed() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  } catch {}
}

function formatChatTime(dateString?: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CustomerChatWidget() {
  const { data: content } = useContent();

  // Disabled by default during loading or if toggled off by admin.
  // Widget, prompt bubble, and socket connections only mount once confirmed enabled.
  if (content?.contactSupportEnabled !== true) {
    return null;
  }

  return <CustomerChatWidgetContent />;
}

function CustomerChatWidgetContent() {
  const { data: me } = useMe();
  const { data: content } = useContent();
  const attachmentsAllowed = content?.chatAttachmentsEnabled !== false;
  const openLogin = useAuthModal((s) => s.openLogin);

  const pathname = usePathname();

  // Pages with mobile-only fixed bottom action bars (Add to Cart, Checkout, etc.)
  const isCartOrCheckout = pathname === '/cart' || pathname === '/checkout';
  const isProductPage = Boolean(pathname?.startsWith('/product'));

  const mobileHiddenClass = isCartOrCheckout
    ? 'hidden lg:flex'
    : isProductPage
    ? 'hidden md:flex'
    : 'flex';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'settings'>('messages');
  const [isStarted, setIsStarted] = useState<boolean>(false);

  // Automatically close drawer when user navigates between pages
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Reset chat started state on login/user switch so new user sees welcome template
  useEffect(() => {
    setIsStarted(false);
  }, [me?.id]);

  const [promptDismissed, setPromptDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return isPromptDismissed();
  });

  const lastCloseTimeRef = useRef<number>(0);
  const [isFabInteractive, setIsFabInteractive] = useState<boolean>(true);
  const messagesCountRef = useRef<number>(0);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      lastCloseTimeRef.current = Date.now();
      setIsFabInteractive(false);
      // Wait for drawer exit animation to complete before re-enabling FAB clicks
      setTimeout(() => {
        setIsFabInteractive(true);
      }, 400);
      if (pendingFileRef.current) {
        URL.revokeObjectURL(pendingFileRef.current.previewUrl);
        setPendingFile(null);
      }
      if (messagesCountRef.current === 0) {
        setIsStarted(false);
      }
    } else {
      isInitialOpenRef.current = true;
      wasOpenRef.current = true;
      isReturningFromSettingsRef.current = false;
      setActiveTab('messages');
    }
    setIsOpen(open);
  }, []);

  const dismissPrompt = useCallback(() => {
    setPromptDismissed(true);
    persistPromptDismissed();
  }, []);

  useEffect(() => {
    setPromptDismissed(isPromptDismissed());
  }, []);
  const [inputText, setInputText] = useState('');
  const [activeToast, setActiveToast] = useState<ActiveToastState | null>(null);
  const [toastTranslateY, setToastTranslateY] = useState<number>(0);
  const [isToastDismissing, setIsToastDismissing] = useState<boolean>(false);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingToastRef = useRef<boolean>(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string } | null>(null);
  const pendingFileRef = useRef(pendingFile);
  pendingFileRef.current = pendingFile;

  // Sound settings state
  const [soundMuted, setLocalSoundMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialOpenRef = useRef<boolean>(true);
  const wasOpenRef = useRef<boolean>(false);
  const isReturningFromSettingsRef = useRef<boolean>(false);
  const prevMessagesCountRef = useRef<number>(0);
  const isSwitchingTabRef = useRef<boolean>(false);

  const isLoggedIn = !!me;

  useEffect(() => {
    setLocalSoundMuted(isSoundMuted());
  }, []);

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pendingFileRef.current) {
        URL.revokeObjectURL(pendingFileRef.current.previewUrl);
      }
    };
  }, []);

  const dismissToast = useCallback((direction: 'up' | 'down' | 'instant' = 'instant') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (direction === 'instant') {
      setActiveToast(null);
      setToastTranslateY(0);
      setIsToastDismissing(false);
    } else {
      setIsToastDismissing(true);
      setToastTranslateY(direction === 'down' ? 120 : -120);
      setTimeout(() => {
        setActiveToast(null);
        setToastTranslateY(0);
        setIsToastDismissing(false);
      }, 220);
    }
  }, []);

  // Handle incoming message when drawer is closed -> Floating card notification (4s)
  const handleIncomingMessage = useCallback(
    (msg: ChatMessage) => {
      if (!isOpen && (msg.senderType === 'admin' || msg.senderType === 'system')) {
        setToastTranslateY(0);
        setIsToastDismissing(false);
        setActiveToast({
          id: msg.id,
          senderName: msg.senderName || (msg.senderType === 'system' ? 'Support Assistant' : 'Support Team'),
          text: msg.text || (msg.attachmentUrl ? (msg.attachmentType === 'pdf' ? '📄 Sent a PDF document' : msg.attachmentType === 'video' ? '🎥 Sent a video' : '📷 Sent a photo') : 'New message'),
          attachmentUrl: msg.attachmentUrl,
          attachmentType: msg.attachmentType,
        });

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        // Automatically dismiss toast after 4 seconds
        toastTimerRef.current = setTimeout(() => {
          dismissToast('instant');
        }, 4000);
      }
    },
    [isOpen, dismissToast],
  );

  const {
    conversation,
    messages,
    isLoading,
    isTyping,
    sendMessage,
    sendTyping,
  } = useChat({
    enabled: isLoggedIn,
    isOpen,
    onIncomingMessage: handleIncomingMessage,
    onAuthRequired: () => {
      openLogin();
    },
  });

  messagesCountRef.current = messages.length;

  // Clear toast when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveToast(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }
  }, [isOpen]);

  // Contextual Chat Event Listener (from order cards, PDP, etc.)
  useEffect(() => {
    const handleContextChat = (e: any) => {
      const detail = e.detail;
      setIsOpen(true);
      setActiveTab('messages');
      setIsStarted(true);
      dismissPrompt();
      if (!isLoggedIn) {
        openLogin();
      }
      if (detail?.text) {
        setInputText(detail.text);
      }
    };

    window.addEventListener('open-support-chat', handleContextChat);
    return () => {
      window.removeEventListener('open-support-chat', handleContextChat);
    };
  }, [isLoggedIn, openLogin, dismissPrompt]);

  // Track drawer opening state to ensure opening jumps immediately to bottom without scrolling animation
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      isInitialOpenRef.current = true;
      wasOpenRef.current = true;
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  const scrollToBottom = useCallback((instant = false) => {
    if (scrollContainerRef.current) {
      if (instant) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? 'instant' : 'smooth',
      block: 'end',
    });
  }, []);

  const handleMessagesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (activeTab === 'messages' && !isInitialOpenRef.current && !isSwitchingTabRef.current) {
        lastScrollTopRef.current = e.currentTarget.scrollTop;
      }
    },
    [activeTab],
  );

  // Restore previous scroll position ONLY when specifically returning from Settings tab in an open drawer
  useIsomorphicLayoutEffect(() => {
    if (activeTab === 'messages' && isReturningFromSettingsRef.current && scrollContainerRef.current) {
      isReturningFromSettingsRef.current = false;
      const target = lastScrollTopRef.current;
      scrollContainerRef.current.scrollTop = target;
    }
  }, [activeTab]);

  // When opening a chat or when messages finish loading, ensure we stay solidly locked at latest message
  useEffect(() => {
    if (!isOpen || activeTab !== 'messages') return;

    if (isInitialOpenRef.current) {
      const scrollAll = () => scrollToBottom(true);
      scrollAll();
      const raf = requestAnimationFrame(scrollAll);
      const t1 = setTimeout(scrollAll, 50);
      const t2 = setTimeout(scrollAll, 150);
      const t3 = setTimeout(scrollAll, 300);
      const t4 = setTimeout(() => {
        scrollAll();
        isInitialOpenRef.current = false;
      }, 450);

      prevMessagesCountRef.current = messages.length;
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [isOpen, activeTab, messages.length, isLoading, scrollToBottom]);

  // Auto-scroll when new messages arrive while user is actively on the messages tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'messages') {
      prevMessagesCountRef.current = messages.length;
      return;
    }

    if (!isInitialOpenRef.current && messages.length > prevMessagesCountRef.current) {
      scrollToBottom(false);
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length, isOpen, activeTab, scrollToBottom]);

  // Adjust textarea height: auto-expand up to 5 lines, then scroll
  const adjustTextareaHeight = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const paddingTop = parseFloat(computed.paddingTop) || 8;
    const paddingBottom = parseFloat(computed.paddingBottom) || 8;
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
    const maxHeight = lineHeight * 5 + paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = lineHeight * 1 + paddingTop + paddingBottom + borderTop + borderBottom;

    if (el.scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
      el.style.overflowY = 'hidden';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight(textAreaRef.current);
  }, [inputText, adjustTextareaHeight]);

  const handleRemovePendingFile = () => {
    if (pendingFile) {
      URL.revokeObjectURL(pendingFile.previewUrl);
      setPendingFile(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLoggedIn) {
      toast.error('Please log in to chat with support');
      openLogin();
      return;
    }
    const textToSend = inputText.trim();
    if ((!textToSend && !pendingFile) || conversation?.isBlocked || isSending) return;

    setIsSending(true);

    try {
      let attachmentPayload: { url: string; type: string } | undefined = undefined;

      if (pendingFile) {
        try {
          const isPdf = pendingFile.file.type === 'application/pdf' || pendingFile.file.name.toLowerCase().endsWith('.pdf');
          const isVideo = pendingFile.file.type.startsWith('video/');
          const res = await chatService.uploadAttachment(pendingFile.file);
          attachmentPayload = { url: res.url, type: res.type || (isPdf ? 'pdf' : isVideo ? 'video' : 'image') };
        } catch {
          const isPdf = pendingFile.file.type === 'application/pdf' || pendingFile.file.name.toLowerCase().endsWith('.pdf');
          const isVideo = pendingFile.file.type.startsWith('video/');
          toast.error(`Failed to upload ${isPdf ? 'PDF' : isVideo ? 'video' : 'photo'}. Please try again.`);
          setIsSending(false);
          return;
        }
      }

      sendMessage(
        textToSend,
        me?.name || me?.email || 'Customer',
        attachmentPayload,
      );

      setInputText('');
      if (pendingFile) {
        URL.revokeObjectURL(pendingFile.previewUrl);
        setPendingFile(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      sendTyping(false, me?.name || 'Customer');
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
        textAreaRef.current.style.overflowY = 'hidden';
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    sendTyping(val.length > 0, me?.name || 'Customer');
    adjustTextareaHeight(e.target);
  };

  // Handle image, video, or PDF attachment selection (deferred upload on send)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachmentsAllowed) {
      toast.error('Customer media attachments are disabled by the store administrator');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg'];
    const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg', 'video/x-matroska'];
    const isImage = allowedImages.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
    const isVideo = allowedVideos.includes(file.type.toLowerCase()) || file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isVideo && !isPdf) {
      toast.error('Only JPG, PNG, WEBP, GIF images, MP4/WEBM/MOV videos, and PDF documents are supported');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB for all
    if (!isVideo && !isPdf && file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be under 15MB');
      return;
    }
    if (file.size > maxSize) {
      toast.error(`${isPdf ? 'PDF' : 'Video'} size must be under 50MB`);
      return;
    }

    // Revoke previous object URL if any
    if (pendingFile) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }

    const previewUrl = isPdf ? '' : URL.createObjectURL(file);
    setPendingFile({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showWelcomeScreen = isLoggedIn && messages.length === 0 && !isStarted;

  const handleQuickPrompt = (promptText: string) => {
    setIsStarted(true);
    setInputText(promptText);
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 80);
  };

  const handleStartChat = () => {
    setIsStarted(true);
    if (!inputText.trim()) {
      setInputText('Hi! I have a question.');
    }
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 80);
  };

  const handleAttachFromWelcome = () => {
    setIsStarted(true);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 80);
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    setLocalSoundMuted(next);
    if (!next) {
      playIncomingChime();
      toast.success('Notification sound enabled');
    } else {
      toast.info('Notification sound muted');
    }
  };

  const unreadCount = conversation?.unreadCustomerCount ?? 0;

  // Update browser tab title when a new message arrives while drawer is closed
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = document.title.replace(/^\(\d+\)\s*(New message •\s*)?/, '');
    if (unreadCount > 0 && !isOpen) {
      document.title = `(${unreadCount}) New message • ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount, isOpen]);

  return (
    <>
      {/* ── iOS-Style Push Notification (Anchored above chat launcher) ── */}
      {activeToast && !isOpen && (
        <div
          onPointerDown={(e) => {
            dragStartYRef.current = e.clientY;
            isDraggingToastRef.current = false;
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragStartYRef.current === null) return;
            const deltaY = e.clientY - dragStartYRef.current;
            if (Math.abs(deltaY) > 5) {
              isDraggingToastRef.current = true;
            }
            setToastTranslateY(deltaY);
          }}
          onPointerUp={(e) => {
            if (dragStartYRef.current === null) return;
            const deltaY = e.clientY - dragStartYRef.current;
            const wasDragging = isDraggingToastRef.current || Math.abs(deltaY) > 12;
            dragStartYRef.current = null;
            isDraggingToastRef.current = false;

            if (Math.abs(deltaY) > 30) {
              // Dragged up or down past threshold -> dismiss smoothly in that direction
              dismissToast(deltaY > 0 ? 'down' : 'up');
            } else {
              // Return to original position
              setToastTranslateY(0);
              if (!wasDragging) {
                // Clicked -> Open chat drawer
                if (Date.now() - lastCloseTimeRef.current < 450) return;
                handleOpenChange(true);
                setActiveTab('messages');
                setActiveToast(null);
              } else {
                // Reset 4-second dismiss timer
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => {
                  dismissToast('instant');
                }, 4000);
              }
            }
          }}
          onPointerCancel={() => {
            dragStartYRef.current = null;
            isDraggingToastRef.current = false;
            setToastTranslateY(0);
          }}
          onMouseEnter={() => {
            if (dragStartYRef.current === null && toastTimerRef.current) {
              clearTimeout(toastTimerRef.current);
            }
          }}
          onMouseLeave={() => {
            if (dragStartYRef.current === null) {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              toastTimerRef.current = setTimeout(() => {
                dismissToast('instant');
              }, 4000);
            }
          }}
          role="alert"
          aria-live="assertive"
          style={{
            transform: `translateY(${toastTranslateY}px)`,
            opacity: isToastDismissing ? 0 : Math.max(0.1, 1 - Math.abs(toastTranslateY) / 120),
            touchAction: 'none',
          }}
          className={cn(
            'fixed bottom-[56px] right-2 md:bottom-[68px] md:right-3 z-50 w-[calc(100vw-1rem)] sm:w-[350px] max-w-sm rounded-2xl bg-background/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.22)] cursor-grab active:cursor-grabbing select-none overflow-hidden animate-in fade-in-0 slide-in-from-bottom-3 duration-200 print:hidden',
            mobileHiddenClass === 'hidden lg:flex' ? 'hidden lg:block' : mobileHiddenClass === 'hidden md:flex' ? 'hidden md:block' : 'block',
            (dragStartYRef.current === null || isToastDismissing) && 'transition-all duration-200 ease-out',
          )}
        >
          {/* Notification header */}
          <div className="flex items-center justify-between gap-2 px-3.5 pt-2.5 pb-1">
            <div className="flex items-center gap-2 min-w-0">
              {/* Circular app icon */}
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#187b7b] text-white shrink-0 shadow-xs">
                <MessageSquare className="h-2.5 w-2.5 fill-white stroke-none" />
              </div>
              <span className="text-[11px] font-semibold tracking-wider text-[#187b7b] uppercase">
                Support
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground font-normal">now</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast('instant');
                }}
                className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Dismiss"
                aria-label="Dismiss notification"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* iOS notification divider */}
          <div className="mx-4 h-px bg-border/50 pointer-events-none" />

          {/* Notification body */}
          <div className="flex items-start gap-3 px-4 pt-2.5 pb-3.5 pointer-events-none">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-tight">
                {activeToast.senderName}
              </p>
              <p className="text-xs sm:text-[13px] text-foreground/80 leading-snug line-clamp-3 mt-0.5">
                {activeToast.text}
              </p>
            </div>
            {/* Media / PDF thumbnail on the right */}
            {activeToast.attachmentUrl && (
              <div className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border bg-muted">
                {activeToast.attachmentType === 'pdf' ? (
                  <div className="h-full w-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                ) : activeToast.attachmentType === 'video' ? (
                  <div className="h-full w-full bg-black/80 flex items-center justify-center">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <img
                    src={mediaSrc(activeToast.attachmentUrl)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Fixed FAB Widget + Prompt Bubble ───────────────────────── */}
      <div
        className={cn(
          'fixed bottom-2 right-2 md:bottom-3 md:right-3 z-40 items-center gap-2 md:gap-2.5 print:hidden',
          mobileHiddenClass,
        )}
      >
        {/* Speech Bubble Prompt (Left side of chat widget) */}
        {!isOpen && !promptDismissed && !activeToast && (
          <div
            role="status"
            aria-live="polite"
            onClick={() => {
              if (Date.now() - lastCloseTimeRef.current < 450) return;
              handleOpenChange(true);
              dismissPrompt();
            }}
            className="relative flex cursor-pointer items-start gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-background/95 px-2.5 py-1.5 md:px-3.5 md:py-2 text-foreground shadow-lg md:shadow-xl ring-1 ring-border/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in-0 slide-in-from-right-2 max-w-[calc(100vw-4.5rem)] md:max-w-xs"
          >
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 text-[11px] md:text-xs font-semibold text-[#187b7b]">
                <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                <span>Hey there!</span>
              </div>
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap">
                How can we help you?
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissPrompt();
              }}
              className="ml-0.5 -mr-0.5 -mt-0.5 rounded-full p-0.5 md:p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss greeting"
            >
              <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
            {/* Arrow pointing right towards the chat widget button */}
            <div className="absolute -right-1 md:-right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 md:h-3 md:w-3 rotate-45 border-t border-r border-border/80 bg-background/95" />
          </div>
        )}

        {/* Circular FAB Button (Protected against ghost-clicks on drawer dismissal) */}
        <button
          onClick={() => {
            if (Date.now() - lastCloseTimeRef.current < 450) {
              return;
            }
            handleOpenChange(true);
            dismissPrompt();
          }}
          className={cn(
            'relative flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-[#187b7b] text-white shadow-lg md:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#187b7b] focus-visible:ring-offset-2',
            isOpen && 'opacity-0 pointer-events-none',
            !isFabInteractive && 'pointer-events-none',
          )}
          aria-label="Open live customer chat"
        >
          <MessageCircleMore className="h-5 w-5 md:h-6 md:w-6" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] md:h-5 md:min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] md:text-[11px] font-bold text-white shadow-md animate-in zoom-in-50 duration-200 ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Responsive Chat Drawer (Right sheet on Desktop, Bottom sheet on Mobile) ── */}
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent
          hideHandle
          className="p-0 md:p-0 flex flex-col md:max-w-md h-[88vh] md:h-full overflow-hidden border-none md:border-l shadow-2xl"
        >
          {/* Drawer Top / Header — teal only when logged in & messaging, otherwise minimal */}
          {isLoggedIn && !showWelcomeScreen ? (
            /* Teal header for active messaging */
            <DrawerHeader className="relative border-b border-[#136363]/80 bg-[#187b7b] text-white px-4 pt-0 pb-2.5 md:px-5 md:pt-3 md:pb-4 shrink-0 select-none md:cursor-default touch-none">
              <DrawerHandle pillClassName="bg-white/40 hover:bg-white/60" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 md:gap-3">
                  {messages.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsStarted(false)}
                      className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm shrink-0 cursor-pointer transition-colors"
                      title="Back to options"
                    >
                      <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  ) : (
                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm shrink-0">
                      <Headphones className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                  )}
                  <div>
                    <DrawerTitle className="text-sm md:text-base font-semibold text-white tracking-tight leading-tight">
                      {activeTab === 'settings' ? 'Chat Settings' : 'Customer Support'}
                    </DrawerTitle>
                    <p className="text-[11px] md:text-xs text-white/80 font-normal leading-tight mt-0.5">
                      We typically reply within a few minutes
                    </p>
                  </div>
                </div>
                {/* Mobile: settings toggle */}
                <div className="flex md:hidden items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'messages') {
                        if (scrollContainerRef.current) lastScrollTopRef.current = scrollContainerRef.current.scrollTop;
                        isSwitchingTabRef.current = true;
                        setActiveTab('settings');
                        setTimeout(() => { isSwitchingTabRef.current = false; }, 100);
                      } else {
                        isSwitchingTabRef.current = true;
                        isReturningFromSettingsRef.current = true;
                        setActiveTab('messages');
                        setTimeout(() => { isSwitchingTabRef.current = false; }, 100);
                      }
                    }}
                    className="relative flex h-8 w-8 items-center justify-center text-white hover:text-white/80 active:scale-95 transition-all"
                    title={activeTab === 'messages' ? 'Chat Settings' : 'Back to Messages'}
                    aria-label={activeTab === 'messages' ? 'Chat Settings' : 'Back to Messages'}
                  >
                    {activeTab === 'messages' ? <Settings className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
                    {activeTab === 'settings' && unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[#25D366] ring-1 ring-[#187b7b]" />
                    )}
                  </button>
                </div>
                {/* Desktop: close button */}
                <div className="hidden md:flex items-center gap-1">
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/80 hover:bg-white/20 hover:text-white">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close chat</span>
                    </Button>
                  </DrawerClose>
                </div>
              </div>
            </DrawerHeader>
          ) : (
            /* Guest / Welcome — drag pill on mobile only, close button on desktop only */
            <div className="relative shrink-0">
              <DrawerHandle pillClassName="bg-muted-foreground/25 hover:bg-muted-foreground/40" />
              <div className="hidden md:flex justify-end px-3 pt-2">
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close chat</span>
                  </Button>
                </DrawerClose>
              </div>
              {/* a11y: required but hidden */}
              <DrawerTitle className="sr-only">Live Support Chat</DrawerTitle>
            </div>
          )}

          {/* ── Main Tab Content ── */}
          {!isLoggedIn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="flex flex-col items-center text-center bg-card rounded-2xl border shadow-sm max-w-sm w-full p-7">
                <div className="h-14 w-14 rounded-full bg-[#187b7b]/10 flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-[#187b7b]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Log in to start chatting
                </h3>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed max-w-[260px]">
                  Sign in so we can connect you with our support team and link your order history.
                </p>
                <Button
                  onClick={() => openLogin()}
                  className="w-full bg-[#187b7b] hover:bg-[#136363] text-white rounded-xl font-medium text-sm py-2.5 shadow-sm"
                >
                  Log In to Chat
                </Button>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Don&apos;t have an account? Sign up is quick and seamless.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* ── Settings View (Independent scroll container) ── */}
              <div
                className={cn(
                  'flex-1 overflow-y-auto flex flex-col bg-muted/20',
                  activeTab !== 'settings' && 'hidden',
                )}
              >
                <div className="p-4 space-y-4">
                  {/* Sound Settings Card */}
                  <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#187b7b]/10 text-[#187b7b]">
                          <Volume2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Sound Notifications</p>
                          <p className="text-[11px] text-muted-foreground">Play pleasant chime on incoming message</p>
                        </div>
                      </div>
                      <Button
                        variant={soundMuted ? 'outline' : 'default'}
                        size="sm"
                        onClick={toggleSound}
                        className={cn(
                          'h-7 text-xs font-medium rounded-full px-3',
                          !soundMuted && 'bg-[#187b7b] hover:bg-[#136363] text-white',
                        )}
                      >
                        {soundMuted ? 'Muted' : 'Enabled'}
                      </Button>
                    </div>
                  </div>


                  {/* Customer Account Details Card */}
                  <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#187b7b]" />
                        <span className="font-semibold text-foreground">Chat Identity</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Verified Member
                      </span>
                    </div>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium text-foreground">{me?.name || 'Customer'}</span>
                    </p>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Email:</span>
                      <span className="font-medium text-foreground truncate max-w-[200px]">{me?.email}</span>
                    </p>
                    {(me?.mobile || conversation?.customerPhone) && (
                      <p className="text-muted-foreground flex justify-between">
                        <span>Phone:</span>
                        <span className="font-medium text-foreground">{me?.mobile || conversation?.customerPhone}</span>
                      </p>
                    )}
                  </div>

                  {/* Quick Help & Navigation Links */}
                  <div className="rounded-xl border bg-card divide-y overflow-hidden shadow-2xs text-xs">
                    <Link
                      href="/account"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="h-4 w-4 text-[#187b7b]" />
                        <span className="font-medium text-foreground">My Orders & Live Tracking</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link
                      href="/shipping-returns"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <RotateCcw className="h-4 w-4 text-[#187b7b]" />
                        <span className="font-medium text-foreground">Returns & Exchanges Policy</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Messages View (Preserved in DOM to maintain exact scroll position) ── */}
              <div
                ref={scrollContainerRef}
                onScroll={handleMessagesScroll}
                className={cn(
                  'flex-1 overflow-y-auto flex flex-col bg-muted/20',
                  activeTab !== 'messages' && 'hidden',
                )}
              >
                <div className="flex-1 px-4 pt-4 pb-3 flex flex-col justify-between">
                  {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-[#187b7b]" />
                      <p className="text-xs">Connecting to live support...</p>
                    </div>
                  ) : showWelcomeScreen ? (
                    /* ── Welcome Template Before First Message ── */
                    <div className="my-auto py-2 sm:py-4 flex flex-col items-center text-center max-w-sm mx-auto px-1 animate-in fade-in-50 duration-300">
                      {/* Top Icon */}
                      <div className="h-14 w-14 rounded-2xl bg-[#187b7b]/10 text-[#187b7b] flex items-center justify-center shadow-xs border border-[#187b7b]/20 mb-3">
                        <Headphones className="h-7 w-7 stroke-[1.75]" />
                      </div>

                      <h3 className="text-base font-bold text-foreground">
                        Welcome to Live Support!
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed max-w-[280px]">
                        Hi {me?.name ? me.name.split(' ')[0] : 'there'}, we're here to help. Here are some things you can do:
                      </p>

                      {/* Interactive capability action cards */}
                      <div className="w-full space-y-2 text-left mb-4">
                        <button
                          type="button"
                          onClick={() => handleQuickPrompt("Hi! I'd like to check my order status.")}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl border bg-card hover:bg-muted/70 hover:border-[#187b7b]/40 transition-all text-xs group cursor-pointer shadow-2xs"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#187b7b]/10 text-[#187b7b] shrink-0 group-hover:scale-105 transition-transform">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">Track an Order</p>
                            <p className="text-[11px] text-muted-foreground truncate">Check delivery status, shipping, or returns</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-[#187b7b] group-hover:translate-x-0.5 transition-all" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickPrompt("Hello, I have a question about product details and sizing.")}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl border bg-card hover:bg-muted/70 hover:border-[#187b7b]/40 transition-all text-xs group cursor-pointer shadow-2xs"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#187b7b]/10 text-[#187b7b] shrink-0 group-hover:scale-105 transition-transform">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">Product & Sizing Questions</p>
                            <p className="text-[11px] text-muted-foreground truncate">Ask about dimensions, materials, or stock</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-[#187b7b] group-hover:translate-x-0.5 transition-all" />
                        </button>

                        {attachmentsAllowed && (
                          <button
                            type="button"
                            onClick={handleAttachFromWelcome}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl border bg-card hover:bg-muted/70 hover:border-[#187b7b]/40 transition-all text-xs group cursor-pointer shadow-2xs"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#187b7b]/10 text-[#187b7b] shrink-0 group-hover:scale-105 transition-transform">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground">Send Photos or Documents</p>
                              <p className="text-[11px] text-muted-foreground truncate">Attach photos or PDFs for faster resolution</p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-[#187b7b] group-hover:translate-x-0.5 transition-all" />
                          </button>
                        )}
                      </div>

                      {/* Start Chat Button */}
                      <Button
                        type="button"
                        onClick={handleStartChat}
                        className="w-full h-10 bg-[#187b7b] hover:bg-[#136363] text-white font-semibold text-xs md:text-sm rounded-xl gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Start Chat</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pt-2">
                      {/* Greeting automated bubble */}
                      <div className="flex gap-2.5 max-w-[85%] self-start">
                        <div className="h-7 w-7 rounded-full bg-[#187b7b]/10 text-[#187b7b] flex items-center justify-center shrink-0 text-xs font-semibold">
                          <Headphones className="h-3.5 w-3.5" />
                        </div>
                        <div className="rounded-2xl rounded-tl-xs bg-card border px-3.5 py-2.5 text-xs md:text-sm text-card-foreground shadow-2xs">
                          <p className="font-semibold text-[11px] text-[#187b7b] mb-0.5">Support Team</p>
                          <p>
                            Hello {me?.name ? me.name.split(' ')[0] : 'there'}! How can we help you today? Leave us a message{attachmentsAllowed ? ', ask about orders, or attach a photo or video.' : ' or ask about orders.'}
                          </p>
                        </div>
                      </div>

                      {/* Message List */}
                      {messages.map((msg) => {
                        const isCustomer = msg.senderType === 'customer';
                        const isSystem = msg.senderType === 'system';

                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              'flex flex-col max-w-[85%]',
                              isCustomer ? 'self-end items-end' : 'self-start items-start',
                            )}
                          >
                            <div
                              className={cn(
                                'px-3.5 py-2.5 text-xs md:text-sm shadow-2xs leading-relaxed break-words whitespace-pre-wrap',
                                isCustomer
                                  ? 'bg-[#187b7b] text-white rounded-2xl rounded-tr-xs'
                                  : isSystem
                                  ? 'bg-amber-50/90 border border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-200 rounded-2xl rounded-tl-xs'
                                  : 'bg-card border text-card-foreground rounded-2xl rounded-tl-xs',
                              )}
                            >
                              {!isCustomer && (
                                <p
                                  className={cn(
                                    'font-semibold text-[11px] mb-0.5 flex items-center gap-1',
                                    isSystem ? 'text-amber-800 dark:text-amber-300' : 'text-[#187b7b]',
                                  )}
                                >
                                  {isSystem && <Bot className="h-3 w-3" />}
                                  {msg.senderName || (isSystem ? 'Assistant' : 'Support Agent')}
                                </p>
                              )}

                              {/* Media / Document Attachment Rendering (PDF / Video / Image) */}
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
                                        isCustomer
                                          ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                          : 'bg-background hover:bg-muted/80 border-border text-foreground',
                                      )}
                                      title="Open or download PDF document"
                                    >
                                      <div className="h-9 w-9 rounded-md bg-red-500/15 dark:bg-red-500/25 text-red-500 flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium truncate max-w-[170px] sm:max-w-[200px]">
                                          {msg.attachmentUrl.split('/').pop() || 'Document.pdf'}
                                        </p>
                                        <p
                                          className={cn(
                                            'text-[10px]',
                                            isCustomer ? 'text-white/70' : 'text-muted-foreground',
                                          )}
                                        >
                                          PDF Document • Click to view
                                        </p>
                                      </div>
                                      <Download
                                        className={cn(
                                          'h-4 w-4 shrink-0 transition-transform group-hover/pdf:translate-y-0.5',
                                          isCustomer ? 'text-white/80' : 'text-muted-foreground',
                                        )}
                                      />
                                    </a>
                                  ) : msg.attachmentType === 'video' || /\.(mp4|webm|mov|mkv|ogg)$/i.test(msg.attachmentUrl) ? (
                                    <video
                                      src={mediaSrc(msg.attachmentUrl)}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="max-h-56 w-auto max-w-full rounded-lg bg-black/90 object-contain shadow-2xs"
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
                                        className="max-h-48 w-auto rounded-lg object-cover group-hover:opacity-90 transition-opacity"
                                        loading="lazy"
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
                                <p>{msg.text}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground">
                              {formatChatTime(msg.createdAt) && (
                                <span>{formatChatTime(msg.createdAt)}</span>
                              )}
                              {isCustomer && (
                                <CheckCheck
                                  className={cn(
                                    'h-3 w-3',
                                    msg.isRead ? 'text-[#187b7b]' : 'text-muted-foreground/60',
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing indicator */}
                      {isTyping && (
                        <div className="flex items-center gap-2 self-start bg-card border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.2s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.4s]" />
                          </div>
                          <span className="text-[11px]">Support is typing...</span>
                        </div>
                      )}

                      <div ref={messagesEndRef} className="h-0 w-0 -mt-3 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Input Bar (Only visible when on Messages tab, logged in, and not on welcome screen) ── */}
          {isLoggedIn && !showWelcomeScreen && (
            <div
              className={cn(
                'border-t border-border bg-card p-3 shrink-0',
                activeTab !== 'messages' && 'hidden',
              )}
            >
              {conversation?.isBlocked ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <Lock className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <p>Messaging is currently disabled for this account. Please contact support via email.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Pending media / PDF preview with cancel button */}
                  {attachmentsAllowed && pendingFile && (
                    <div className="relative inline-block self-start">
                      {(pendingFile.file.type === 'application/pdf' || pendingFile.file.name.toLowerCase().endsWith('.pdf')) ? (
                        /* PDF file chip */
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 pr-8 shadow-xs">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30 shrink-0">
                            <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
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

                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    {/* Hidden file input for image/video (only rendered if attachments enabled) */}
                    {attachmentsAllowed && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*,video/mp4,video/webm,video/quicktime,application/pdf,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {/* Direct attachment button: immediately triggers native file manager */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSending}
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground transition-colors mb-0.5 cursor-pointer"
                          title="Attach photo or video"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <textarea
                      ref={textAreaRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={pendingFile ? 'Add a caption...' : 'Type a message...'}
                      rows={1}
                      className="flex-1 min-w-0 min-h-[38px] resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs md:text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#187b7b] leading-relaxed overflow-hidden"
                      autoComplete="off"
                    />

                    <Button
                      type="submit"
                      size="icon"
                      disabled={(!inputText.trim() && !pendingFile) || isSending}
                      className="h-9 w-9 shrink-0 rounded-md bg-[#187b7b] hover:bg-[#136363] text-white disabled:opacity-40 mb-0.5"
                      aria-label="Send chat message"
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
          )}

          {/* ── Customer Drawer Bottom Navigation Bar (Desktop Only) ── */}
          {isLoggedIn && (
            <div className="hidden md:flex border-t bg-muted/40 px-4 py-1.5 md:px-6 md:py-2 items-center justify-around shrink-0 select-none">
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'messages') {
                    isSwitchingTabRef.current = true;
                    isReturningFromSettingsRef.current = true;
                    setActiveTab('messages');
                    setTimeout(() => {
                      isSwitchingTabRef.current = false;
                    }, 100);
                  }
                }}
                title="Messages"
                aria-label="Messages"
                className={cn(
                  'relative flex h-8 w-11 md:h-8.5 md:w-13 items-center justify-center transition-colors',
                  activeTab === 'messages'
                    ? 'text-[#187b7b]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquareText className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 md:right-2.5 h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'settings') {
                    if (scrollContainerRef.current) {
                      lastScrollTopRef.current = scrollContainerRef.current.scrollTop;
                    }
                    isSwitchingTabRef.current = true;
                    setActiveTab('settings');
                    setTimeout(() => {
                      isSwitchingTabRef.current = false;
                    }, 100);
                  }
                }}
                title="Settings"
                aria-label="Settings"
                className={cn(
                  'relative flex h-8 w-11 md:h-8.5 md:w-13 items-center justify-center transition-colors',
                  activeTab === 'settings'
                    ? 'text-[#187b7b]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Settings className="h-4 w-4 md:h-[18px] md:w-[18px]" />
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
