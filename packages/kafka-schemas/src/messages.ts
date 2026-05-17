export interface RawTelegramMessage {
  userId: string;
  messageId: number;
  channelId: number;
  senderId: number;
  senderName: string;
  text: string;
  mediaType?: string;
  mediaUrl?: string;
  timestamp: string; // ISO 8601
}

export interface FilteredMessage extends RawTelegramMessage {
  pipelineId: string;
  pipelineName: string;
}

export interface RawTelegramMessageDlt {
  originalMessage: RawTelegramMessage;
  error: string;
  failedAt: string;
}

export interface ConfigSourcesChangedEvent {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  sourceId: string;
}

export interface ConfigPipelinesChangedEvent {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  pipelineId: string;
}

export interface ConfigUsersTelegramChangedEvent {
  userId: string;
  action: 'connected' | 'disconnected';
}
