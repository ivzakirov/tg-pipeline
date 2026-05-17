export type SourceType = 'channel' | 'group';

export interface Source {
  id: string;
  ownerId: string;
  name: string;
  telegramId: number;
  telegramUsername?: string;
  type: SourceType;
  enabled: boolean;
}

export interface Pipeline {
  id: string;
  ownerId: string;
  name: string;
  enabled: boolean;
  filterConfig: import('./filter').FilterGroup;
  sources: Source[];
}

export interface Message {
  id: string;
  pipelineId: string;
  telegramMessageId: number;
  channelId: number;
  senderId: number;
  senderName: string;
  text: string;
  mediaType?: string;
  mediaUrl?: string;
  receivedAt: string;
}

export interface TelegramSessionStatus {
  connected: boolean;
  phone?: string;
  connectedAt?: string;
}
