export type ChatSenderType = 'customer' | 'admin' | 'system';
export type ConversationStatus = 'open' | 'closed';


export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: ChatSenderType;
  senderId?: string | null;
  senderName: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  status: ConversationStatus;
  isArchived: boolean;
  isBlocked: boolean;
  unreadCustomerCount: number;
  unreadAdminCount: number;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  totalPages?: number;
  unreadTotal: number;
  archivedCount: number;
  blockedCount: number;
}

export interface CustomerChatContext {
  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  stats: {
    totalOrders: number;
    lifetimeSpend: number;
  };
  recentOrders: {
    id: string;
    reference: string | null;
    status: string;
    paymentMethod: string;
    total: number;
    carrier: string | null;
    trackingNumber: string | null;
    createdAt: string;
    itemsCount: number;
    items?: {
      id: string;
      name: string;
      quantity: number;
      price: number;
      imageUrl: string | null;
    }[];
  }[];
}

export interface AutoReplyRule {
  id: string;
  name: string;
  category?: string;
  triggers: string[];
  reply: string;
  enabled: boolean;
  isCustom?: boolean;
}


