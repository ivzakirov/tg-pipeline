export interface Message {
  id?: string;
  telegramMessageId?: number;
  pipelineId: string;
  pipelineName: string;
  channelId: number;
  senderId: number;
  senderName: string;
  text: string;
  mediaType?: string;
  mediaMimeType?: string;
  timestamp: string;
  receivedAt?: string;
  replyToMsgId?: number;
  replyToText?: string;
  replyToSenderName?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  enabled: boolean;
  filterConfig?: any;
}
