import api from '../api';
import type { Message } from '../types';

export const getMessages = (pipelineId: string, limit = 50): Promise<Message[]> =>
  api.get(`/api/messages/${pipelineId}?limit=${limit}`).then(r => r.data);

export const getOlderMessages = (pipelineId: string, before: string, limit = 50): Promise<Message[]> =>
  api.get(`/api/messages/${pipelineId}?limit=${limit}&before=${encodeURIComponent(before)}`).then(r => r.data);
