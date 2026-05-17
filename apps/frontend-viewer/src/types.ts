export interface Message {
  id?: string;
  pipelineId: string;
  pipelineName: string;
  channelId: number;
  senderId: number;
  senderName: string;
  text: string;
  mediaType?: string;
  timestamp: string;
  receivedAt?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  enabled: boolean;
}
