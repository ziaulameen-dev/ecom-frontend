'use client';

import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Send,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ChatMessage,
  Conversation,
  chatService,
  connectChatSocket,
  getChatSocket,
} from '@/features/chat';
import type { AdminOrder } from '@/lib/types';
import { cn, formatDate, mediaSrc } from '@/lib/utils';

interface OrderMessagesTabProps {
  order: AdminOrder;
}

export function OrderMessagesTab({ order }: OrderMessagesTabProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const orderRef = order.reference ?? `#${order.id.slice(0, 8)}`;

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Fetch or initialize customer conversation
  useEffect(() => {
    let cancelled = false;

    async function initChat() {
      if (!order.userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const conv = await chatService.getOrCreateAdminUserConversation(order.userId, {
          name: order.shippingAddress?.fullName,
          email: order.customerEmail ?? undefined,
          phone: order.shippingAddress?.phone ?? undefined,
        });

        if (cancelled) return;
        setConversation(conv);

        if (conv?.id) {
          const msgs = await chatService.getAdminMessages(conv.id, 50);
          if (cancelled) return;
          setMessages(msgs || []);
          // Mark as read by admin
          chatService.markAdminRead(conv.id).catch(() => {});
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load messages');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initChat();

    return () => {
      cancelled = true;
    };
  }, [order.userId, order.customerEmail, order.shippingAddress]);

  // WebSocket connection for live messages
  useEffect(() => {
    if (!conversation?.id) return;

    const socket = connectChatSocket();

    const joinRoom = () => {
      socket.emit('chat:join', { conversationId: conversation.id, role: 'admin' });
    };

    socket.on('connect', joinRoom);
    if (socket.connected) {
      joinRoom();
    }

    const onMessage = (msg: ChatMessage) => {
      if (msg.conversationId === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderType === 'customer') {
          chatService.markAdminRead(conversation.id).catch(() => {});
        }
      }
    };

    socket.on('chat:message', onMessage);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('chat:message', onMessage);
    };
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!replyText.trim() && !pendingFile) || !conversation?.id || isSending) return;

    try {
      setIsSending(true);
      let attachment: { url: string; type?: string } | undefined;

      if (pendingFile) {
        const uploaded = await chatService.uploadAdminAttachment(pendingFile.file);
        attachment = { url: uploaded.url, type: uploaded.type };
      }

      const sent = await chatService.sendAdminReply(
        conversation.id,
        replyText.trim() || undefined,
        attachment,
      );

      setMessages((prev) => [...prev, sent]);
      setReplyText('');
      if (pendingFile) {
        URL.revokeObjectURL(pendingFile.previewUrl);
        setPendingFile(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      scrollToBottom(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl });
  };

  const copyToClipboard = (text: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
    toast.success(`Copied ${type}`);
  };

  if (!order.userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            <span>Customer Contact & Messages</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">Guest Order (No User Account)</p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
              This order was placed without a registered user login. You can contact the customer directly using their email or phone number below.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {order.customerEmail && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{order.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => copyToClipboard(order.customerEmail!, 'email')}
                  >
                    {copiedEmail ? <Check className="size-3.5 text-emerald-600" /> : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" asChild>
                    <a href={`mailto:${order.customerEmail}?subject=Order%20${encodeURIComponent(orderRef)}`}>
                      Mail
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {order.shippingAddress?.phone && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium truncate">{order.shippingAddress.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => copyToClipboard(order.shippingAddress!.phone!, 'phone')}
                  >
                    {copiedPhone ? <Check className="size-3.5 text-emerald-600" /> : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" asChild>
                    <a href={`tel:${order.shippingAddress.phone}`}>
                      Call
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Live Chat Panel */}
      <Card className="flex flex-col h-[560px] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/20 space-y-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#187b7b] text-white flex items-center justify-center font-bold text-xs">
              {(order.shippingAddress?.fullName || order.customerEmail || 'C').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">
                {order.shippingAddress?.fullName || 'Customer'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.customerEmail ?? 'Registered User'}
              </p>
            </div>
          </div>

          {conversation?.id && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              asChild
            >
              <Link href={`/admin/messages?id=${conversation.id}&order=${encodeURIComponent(orderRef)}`}>
                <ExternalLink className="size-3.5" />
                <span>Open in Messenger</span>
              </Link>
            </Button>
          )}
        </CardHeader>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-6 text-muted-foreground">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <MessageSquare className="size-5 opacity-60" />
              </div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs max-w-xs mt-1">
                Start a live conversation with this customer regarding order <span className="font-mono font-medium">{orderRef}</span>.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setReplyText(`Hi! Regarding your order ${orderRef}: `)}
                >
                  "Hi! Regarding your order…"
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setReplyText(`Your order ${orderRef} is on its way!`)}
                >
                  "Your order is on its way!"
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderType === 'admin';
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[80%] rounded-lg p-3 text-sm shadow-xs',
                    isAdmin
                      ? 'ml-auto bg-[#187b7b] text-white rounded-br-none'
                      : 'mr-auto bg-card border rounded-bl-none text-foreground',
                  )}
                >
                  {msg.attachmentUrl && (
                    <div className="mb-2 overflow-hidden rounded">
                      {msg.attachmentType === 'image' || msg.attachmentUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                        <a href={mediaSrc(msg.attachmentUrl)} target="_blank" rel="noreferrer">
                          <img
                            src={mediaSrc(msg.attachmentUrl)}
                            alt="Attachment"
                            className="max-h-48 rounded object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={mediaSrc(msg.attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded bg-black/10 p-2 text-xs hover:underline"
                        >
                          <Paperclip className="size-4" /> View attachment
                        </a>
                      )}
                    </div>
                  )}
                  {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                  <div
                    className={cn(
                      'text-[10px] mt-1 flex items-center justify-end gap-1',
                      isAdmin ? 'text-white/70' : 'text-muted-foreground',
                    )}
                  >
                    <span>{formatDate(msg.createdAt).split(',')[1] || formatDate(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending File Attachment Banner */}
        {pendingFile && (
          <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              <ImageIcon className="size-4 text-primary" />
              <span className="truncate font-medium">{pendingFile.file.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                URL.revokeObjectURL(pendingFile.previewUrl);
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t p-3 bg-background flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or file"
          >
            <Paperclip className="size-4" />
          </Button>
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Message customer about ${orderRef}…`}
            className="flex-1 h-9 text-sm"
            disabled={!conversation || isSending}
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3 gap-1.5 bg-[#187b7b] hover:bg-[#187b7b]/90 text-white shrink-0"
            disabled={(!replyText.trim() && !pendingFile) || !conversation || isSending}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Customer Profile & Shortcuts */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <span>Customer Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium text-sm text-foreground mt-0.5">
                {order.shippingAddress?.fullName || 'Registered User'}
              </p>
            </div>
            {order.customerEmail && (
              <div>
                <p className="text-muted-foreground">Email Address</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-medium truncate text-foreground">{order.customerEmail}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.customerEmail!, 'email')}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    {copiedEmail ? <Check className="size-3 text-emerald-600" /> : 'copy'}
                  </button>
                </div>
              </div>
            )}
            {order.shippingAddress?.phone && (
              <div>
                <p className="text-muted-foreground">Phone Number</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-medium text-foreground">{order.shippingAddress.phone}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.shippingAddress!.phone!, 'phone')}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    {copiedPhone ? <Check className="size-3 text-emerald-600" /> : 'copy'}
                  </button>
                </div>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                {order.userId}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Canned Snippets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Reply Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              {
                title: 'Order Status Update',
                text: `Hi ${order.shippingAddress?.fullName?.split(' ')[0] || 'there'}, your order ${orderRef} is currently ${order.status}. We'll notify you as soon as it updates!`,
              },
              {
                title: 'Tracking Details',
                text: order.trackingNumber
                  ? `Your order ${orderRef} has been dispatched with ${order.carrier || 'carrier'}. Tracking number: ${order.trackingNumber}`
                  : `Your order ${orderRef} will be dispatched soon. We will share tracking details shortly!`,
              },
              {
                title: 'Address Verification',
                text: `Hi, please verify if your shipping address for ${orderRef} is correct: ${order.shippingAddress ? [order.shippingAddress.line1, order.shippingAddress.city, order.shippingAddress.postalCode].filter(Boolean).join(', ') : 'on file'}.`,
              },
            ].map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setReplyText(tpl.text)}
                className="w-full text-left rounded-md border p-2 text-xs hover:bg-accent transition-colors block"
              >
                <p className="font-medium text-foreground">{tpl.title}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.text}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
