import { api } from '@/lib/api-client';
import {
  AdminConversationListResponse,
  ChatMessage,
  Conversation,
  ConversationStatus,
  CustomerChatContext,
} from '../types';

export const chatService = {
  // ── Customer Endpoints ──
  async getMyConversation(): Promise<Conversation> {
    return api.get<Conversation>('/api/chat/conversation');
  },

  async getMessages(conversationId: string, limit = 20, before?: string): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (before) params.set('before', before);
    const qs = params.toString();
    return api.get<ChatMessage[]>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`);
  },

  async sendMessage(
    conversationId: string,
    text?: string,
    attachment?: { url: string; type?: string },
  ): Promise<ChatMessage> {
    return api.post<ChatMessage>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      text,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type || 'image',
    });
  },

  async uploadAttachment(file: File): Promise<{ url: string; key: string; type: string }> {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<{ url: string; key: string; type: string }>('/api/chat/upload', form);
  },

  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    return api.patch<{ success: boolean }>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`);
  },

  // ── Admin Endpoints ──
  async listAdminConversations(params?: {
    page?: number;
    limit?: number;
    status?: ConversationStatus;
    archived?: boolean;
    blocked?: boolean;
    q?: string;
  }): Promise<AdminConversationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.archived !== undefined) searchParams.set('archived', String(params.archived));
    if (params?.blocked !== undefined) searchParams.set('blocked', String(params.blocked));
    if (params?.q) searchParams.set('q', params.q);

    const qs = searchParams.toString();
    return api.get<AdminConversationListResponse>(`/api/admin/chat/conversations${qs ? `?${qs}` : ''}`);
  },

  async getCustomerContext(conversationId: string): Promise<CustomerChatContext> {
    return api.get<CustomerChatContext>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/customer-context`);
  },

  async getOrCreateAdminUserConversation(
    userId: string,
    contact?: { name?: string; email?: string; phone?: string },
  ): Promise<Conversation> {
    const params = new URLSearchParams();
    if (contact?.name) params.set('name', contact.name);
    if (contact?.email) params.set('email', contact.email);
    if (contact?.phone) params.set('phone', contact.phone);
    const qs = params.toString();
    return api.get<Conversation>(`/api/admin/chat/user/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`);
  },

  async getAdminConversation(conversationId: string): Promise<Conversation> {
    return api.get<Conversation>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}`);
  },

  async getAdminMessages(conversationId: string, limit = 20, before?: string): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (before) params.set('before', before);
    const qs = params.toString();
    return api.get<ChatMessage[]>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`);
  },

  async sendAdminReply(
    conversationId: string,
    text?: string,
    attachment?: { url: string; type?: string },
  ): Promise<ChatMessage> {
    return api.post<ChatMessage>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      text,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type || 'image',
    });
  },

  async uploadAdminAttachment(file: File): Promise<{ url: string; key: string; type: string }> {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<{ url: string; key: string; type: string }>('/api/admin/chat/upload', form);
  },

  async markAdminRead(conversationId: string): Promise<Conversation> {
    return api.patch<Conversation>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/read`);
  },

  async setAdminConversationStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation> {
    return api.patch<Conversation>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/status`, {
      status,
    });
  },

  async archiveConversation(
    conversationId: string,
    isArchived: boolean,
  ): Promise<Conversation> {
    return api.patch<Conversation>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/archive`, {
      isArchived,
    });
  },

  async blockConversation(
    conversationId: string,
    isBlocked: boolean,
  ): Promise<Conversation> {
    return api.patch<Conversation>(`/api/admin/chat/conversations/${encodeURIComponent(conversationId)}/block`, {
      isBlocked,
    });
  },

  async getAdminUnreadCount(): Promise<{ unreadTotal: number }> {
    try {
      // conversations list endpoint calculates and returns unreadTotal with 200 OK
      const res = await api.get<AdminConversationListResponse>('/api/admin/chat/conversations?limit=1');
      return { unreadTotal: res?.unreadTotal ?? 0 };
    } catch {
      return { unreadTotal: 0 };
    }
  },
};
