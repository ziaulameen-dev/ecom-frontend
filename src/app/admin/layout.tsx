'use client';

import {
  BadgePercent, Boxes, FileText, Gift, Home, LayoutDashboard, ListTree, Menu, MessageSquare,
  PackageSearch, PanelLeftClose, PanelLeftOpen, ShoppingCart, Star, Undo2, Settings, Store, Users, Video, X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthModal, useMe } from '@/features/auth';
import { ChatMessage, Conversation, chatService, connectChatSocket } from '@/features/chat';
import { playIncomingChime } from '@/features/chat/utils/chat-sound';
import { sseUrl } from '@/lib/api-client';
import { cn, mediaSrc } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/returns', label: 'Returns', icon: Undo2 },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    title: 'Store & Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: PackageSearch },
      { href: '/admin/categories', label: 'Categories', icon: ListTree },
      { href: '/admin/attributes', label: 'Attributes', icon: Boxes },
      { href: '/admin/coupons', label: 'Coupons', icon: BadgePercent },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface AdminChatToastState {
  id: string;
  conversationId: string;
  customerName: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const openLogin = useAuthModal((s) => s.openLogin);
  const isAdmin = !!me?.roles?.includes('admin');
  const isMessagesPage = pathname?.startsWith('/admin/messages');
  const [live, setLive] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== 'undefined' ? window.location.pathname.startsWith('/admin/messages') : false));
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Synchronously auto-collapse sidebar during render when navigating to Messages (eliminates 1-frame layout shift flicker)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (isMessagesPage && !prevPathname?.startsWith('/admin/messages')) {
      setSidebarCollapsed(true);
    }
  }

  // Floating iOS-style push notification banner state
  const [activeChatToast, setActiveChatToast] = useState<AdminChatToastState | null>(null);
  const [toastTranslateY, setToastTranslateY] = useState<number>(0);
  const [isToastDismissing, setIsToastDismissing] = useState<boolean>(false);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingToastRef = useRef<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissChatToast = useCallback((direction: 'up' | 'down' | 'instant' = 'instant') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (direction === 'instant') {
      setActiveChatToast(null);
      setToastTranslateY(0);
      setIsToastDismissing(false);
    } else {
      setIsToastDismissing(true);
      setToastTranslateY(direction === 'up' ? -120 : 120);
      setTimeout(() => {
        setActiveChatToast(null);
        setToastTranslateY(0);
        setIsToastDismissing(false);
      }, 220);
    }
  }, []);

  // Dismiss notification if admin is on or navigates to messages page
  useEffect(() => {
    if (pathname?.startsWith('/admin/messages') && activeChatToast) {
      setActiveChatToast(null);
    }
  }, [pathname, activeChatToast]);

  useEffect(() => {
    if (!isLoading && !me) openLogin('/admin');
  }, [isLoading, me, openLogin]);

  // Live updates: refresh orders/returns as they change server-side (SSE).
  useEffect(() => {
    if (!isAdmin) return;
    const es = new EventSource(sseUrl('/api/admin/events'), {
      withCredentials: true,
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'returns'] });
      try {
        const ev = JSON.parse(e.data);
        if (ev?.type?.startsWith('order')) toast.info(`Order ${ev.status ?? 'updated'}`);
        if (ev?.type?.startsWith('return')) toast.info('Return updated');
      } catch {}
    };
    return () => es.close();
  }, [isAdmin, qc]);

  // Live unread chat count across all conversations (paused when on /admin/messages)
  const { data: unreadChatCount = 0 } = useQuery({
    queryKey: ['admin', 'chat', 'unread-count'],
    queryFn: async () => {
      try {
        const res = await chatService.getAdminUnreadCount();
        return res?.unreadTotal ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: isAdmin && !isMessagesPage,
    staleTime: 15000,
    refetchInterval: isMessagesPage ? false : 30000,
    retry: false,
  });

  // Global chat socket listener: audio chime and toast notification across all admin pages
  useEffect(() => {
    if (!isAdmin) return;

    const socket = connectChatSocket();

    const joinAdmin = () => {
      socket.emit('chat:join', { role: 'admin' });
    };

    socket.on('connect', joinAdmin);
    if (socket.connected) {
      joinAdmin();
    }

    const onConversationUpdated = (payload: {
      conversation?: Conversation;
      latestMessage?: ChatMessage;
    }) => {
      // Invalidate unread count query so sidebar badge stays updated
      qc.invalidateQueries({ queryKey: ['admin', 'chat', 'unread-count'] });

      const conv = payload?.conversation;
      const latestMsg = payload?.latestMessage;

      if (latestMsg && latestMsg.senderType === 'customer') {
        playIncomingChime();

        // If admin is already on the messages page, do not show floating notification banner
        const isOnMessagesPage = pathname?.startsWith('/admin/messages');

        if (!isOnMessagesPage) {
          const customerName = conv?.customerName || conv?.customerEmail || 'Store Customer';
          const msgPreview =
            latestMsg.text ||
            (latestMsg.attachmentUrl
              ? latestMsg.attachmentType === 'pdf'
                ? '📄 Sent a PDF document'
                : latestMsg.attachmentType === 'video'
                ? '🎥 Sent a video'
                : '📷 Sent a photo'
              : 'Sent an attachment');

          setToastTranslateY(0);
          setIsToastDismissing(false);
          setActiveChatToast({
            id: latestMsg.id,
            conversationId: conv?.id || '',
            customerName,
            text: msgPreview,
            attachmentUrl: latestMsg.attachmentUrl,
            attachmentType: latestMsg.attachmentType,
          });

          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => {
            dismissChatToast('instant');
          }, 5000);
        }
      }
    };

    socket.on('chat:conversation_updated', onConversationUpdated);

    return () => {
      socket.off('connect', joinAdmin);
      socket.off('chat:conversation_updated', onConversationUpdated);
    };
  }, [dismissChatToast, isAdmin, pathname, qc, router]);

  if (!isAdmin) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Admins only — redirecting…</div>;
  }

  // ── Sidebar content (shared between desktop and mobile) ──────────────────
  const renderSidebar = (collapsed: boolean, isMobile = false) => (
    <>
      {/* Header: Exactly h-16 to line up straight with messages tab content header */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/50 overflow-hidden',
          isMobile
            ? 'justify-between px-4'
            : collapsed
            ? 'justify-center px-2'
            : 'justify-between px-3.5',
        )}
      >
        {isMobile ? (
          <>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-base font-bold min-w-0"
            >
              <Store className="size-5 shrink-0 text-foreground" />
              <span className="truncate">{process.env.NEXT_PUBLIC_STORE_NAME ?? 'Admin'}</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="rounded-sm p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <X className="size-5" />
            </button>
          </>
        ) : (
          /* Desktop sidebar header: Brand name + open/close toggle */
          <>
            <div
              className={cn(
                'flex items-center gap-2.5 min-w-0 transition-all duration-300 ease-in-out overflow-hidden',
                collapsed
                  ? 'w-0 max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  : 'w-auto max-w-[170px] opacity-100 translate-x-0',
              )}
            >
              <Store className="size-5 shrink-0 text-foreground" />
              <span className="font-bold text-base tracking-tight text-foreground truncate select-none">
                {process.env.NEXT_PUBLIC_STORE_NAME ?? 'SBAZWIDE'}
              </span>
            </div>

            <div className={cn('relative flex items-center justify-center shrink-0', collapsed ? 'w-full group' : '')}>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex size-10 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
              </button>
              {collapsed && (
                <div
                  role="tooltip"
                  className="sidebar-tooltip absolute left-full top-1/2 z-50 ml-1.5
                             rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                >
                  Expand sidebar
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-white dark:bg-zinc-900 border-l border-b border-black/[0.08] dark:border-white/[0.12]" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className={cn('flex-1 space-y-4 py-2 overflow-y-auto overflow-x-hidden scrollbar-none', collapsed ? 'px-0' : 'px-2')}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title || sIdx} className="space-y-1">
            {/* Category header when expanded */}
            {!collapsed && (
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase select-none">
                {section.title}
              </p>
            )}

            {/* Subtle separator when collapsed */}
            {collapsed && sIdx > 0 && (
              <div className="h-px w-6 bg-border/60 my-2 mx-auto" />
            )}

            <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const showUnread = item.href === '/admin/messages' && unreadChatCount > 0 && !isMessagesPage;

                return (
                  <div key={item.href} className={cn('relative group', collapsed && 'flex justify-center w-full')}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex h-9.5 items-center rounded-sm text-sm transition-all relative overflow-hidden',
                        active
                          ? 'bg-[#187b7b] text-white font-semibold shadow-xs'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        collapsed ? 'size-9.5 justify-center p-0' : 'w-full px-3 gap-3',
                      )}
                    >
                      {/* Icon box: centered with unread badge */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <item.icon className={cn('size-4', active ? 'text-white stroke-[2.2]' : '')} />
                        {showUnread && collapsed && (
                          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50">
                            {unreadChatCount > 99 ? '99+' : unreadChatCount}
                          </span>
                        )}
                      </div>

                      {/* Text label: hidden when collapsed */}
                      {!collapsed && (
                        <span className="truncate whitespace-nowrap transition-all duration-300 ease-in-out flex-1">
                          {item.label}
                        </span>
                      )}

                      {/* Unread badge when expanded: docks on right side */}
                      {showUnread && !collapsed && (
                        <span
                          className={cn(
                            'ml-auto mr-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold shadow-xs animate-in zoom-in-50',
                            active ? 'bg-white text-[#187b7b]' : 'bg-rose-600 text-white',
                          )}
                        >
                          {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </span>
                      )}
                    </Link>

                    {/* Tooltip — only in collapsed mode, appears after 1s hover */}
                    {collapsed && (
                      <div
                        role="tooltip"
                        className="sidebar-tooltip absolute left-full top-1/2 z-50 ml-2
                                   rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        {item.label}
                        {/* Clean white arrow pointing left */}
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-white dark:bg-zinc-900 border-l border-b border-black/[0.08] dark:border-white/[0.12]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: back to store */}
      <div className={cn('border-t border-border/50', collapsed ? 'flex justify-center p-2' : 'p-2')}>
        <div className={cn('relative group', collapsed && 'flex justify-center w-full')}>
          <Link
            href="/"
            className={cn(
              'flex h-9.5 items-center rounded-sm text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors overflow-hidden',
              collapsed ? 'size-9.5 justify-center p-0' : 'w-full px-3 gap-3',
            )}
          >
            <Home className="size-4 shrink-0" />
            {!collapsed && (
              <span className="truncate whitespace-nowrap transition-all duration-300 ease-in-out flex-1 font-medium">
                Back to store
              </span>
            )}
          </Link>
          {collapsed && (
            <div
              role="tooltip"
              className="sidebar-tooltip absolute left-full top-1/2 z-50 ml-2
                         rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              Back to store
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-white dark:bg-zinc-900 border-l border-b border-black/[0.08] dark:border-white/[0.12]" />
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'bg-muted/30',
        isMessagesPage
          ? 'h-dvh max-h-dvh flex flex-col overflow-hidden'
          : 'min-h-screen',
      )}
    >
      {/* Mobile top bar with burger */}
      <div
        className={cn(
          'z-30 flex items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden shrink-0',
          !isMessagesPage && 'sticky top-0',
        )}
      >
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-sm p-1 hover:bg-sidebar-accent">
          <Menu className="size-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
          <Store className="size-5 text-foreground" /> Admin
        </Link>
      </div>

      <div className={cn('flex', isMessagesPage && 'flex-1 min-h-0 overflow-hidden')}>
        {/* Desktop sidebar — fixed in place with smooth collapse/expand transition */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-20 overflow-visible fixed top-0 bottom-0 left-0 h-screen',
            sidebarCollapsed ? 'w-[56px]' : 'w-60',
          )}
        >
          {renderSidebar(sidebarCollapsed, false)}
        </aside>

        {/* Mobile drawer (always fully expanded) */}
        <div className={cn('fixed inset-0 z-40 md:hidden', !mobileOpen && 'pointer-events-none')}>
          <div
            onClick={() => setMobileOpen(false)}
            className={cn(
              'absolute inset-0 bg-black/50 transition-opacity duration-300',
              mobileOpen ? 'opacity-100' : 'opacity-0',
            )}
          />
          <aside
            className={cn(
              'absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 ease-in-out z-50',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {renderSidebar(false, true)}
          </aside>
        </div>

        <main
          className={cn(
            'min-w-0 flex-1 max-w-full overflow-x-hidden transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            sidebarCollapsed ? 'md:ml-[56px]' : 'md:ml-60',
            isMessagesPage
              ? 'p-0 h-full min-h-0 overflow-hidden'
              : 'p-4 sm:p-6 lg:p-8',
          )}
        >
          {children}
        </main>
      </div>

      {/* ── iOS-Style Admin Message Push Notification Banner (Top Right) ── */}
      {activeChatToast && (
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
              dismissChatToast(deltaY > 0 ? 'down' : 'up');
            } else {
              setToastTranslateY(0);
              if (!wasDragging) {
                // Clicked -> Navigate to admin conversation
                if (activeChatToast.conversationId) {
                  router.push(`/admin/messages?id=${activeChatToast.conversationId}`);
                } else {
                  router.push('/admin/messages');
                }
                setActiveChatToast(null);
              } else {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => {
                  dismissChatToast('instant');
                }, 5000);
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
                dismissChatToast('instant');
              }, 5000);
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
            'fixed top-4 sm:top-5 left-0 right-0 mx-auto z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-md rounded-[22px] bg-background/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.24)] cursor-grab active:cursor-grabbing select-none overflow-hidden animate-in fade-in-0 slide-in-from-top-4 duration-300',
            sidebarCollapsed ? 'md:left-14' : 'md:left-60',
            (dragStartYRef.current === null || isToastDismissing) && 'transition-all duration-200 ease-out',
          )}
        >
          {/* iOS notification header */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1.5 pointer-events-none">
            <div className="flex items-center gap-2 min-w-0">
              {/* Circular app icon in brand teal */}
              <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#187b7b] text-white shrink-0 shadow-xs">
                <MessageSquare className="h-3 w-3 fill-white stroke-none" />
              </div>
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Messages
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-muted-foreground font-normal">now</span>
            </div>
          </div>

          {/* iOS notification divider */}
          <div className="mx-4 h-px bg-border/50 pointer-events-none" />

          {/* Notification body */}
          <div className="flex items-start gap-3 px-4 pt-2.5 pb-3.5 pointer-events-none">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-tight">
                {activeChatToast.customerName}
              </p>
              <p className="text-xs sm:text-[13px] text-foreground/80 leading-snug line-clamp-3 mt-0.5">
                {activeChatToast.text}
              </p>
            </div>
            {/* Media / PDF thumbnail on the right */}
            {activeChatToast.attachmentUrl && (
              <div className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-border bg-muted">
                {activeChatToast.attachmentType === 'pdf' ? (
                  <div className="h-full w-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                ) : activeChatToast.attachmentType === 'video' ? (
                  <div className="h-full w-full bg-black/80 flex items-center justify-center">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <img
                    src={mediaSrc(activeChatToast.attachmentUrl)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
