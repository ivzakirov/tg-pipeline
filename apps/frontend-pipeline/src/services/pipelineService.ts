import api from '../api';
import type { Pipeline } from '../types';

export const getPipelines = (): Promise<Pipeline[]> =>
  api.get('/api/pipelines').then(r => r.data);

export const createPipeline = (data: Record<string, unknown>): Promise<Pipeline> =>
  api.post('/api/pipelines', data).then(r => r.data);

export const updatePipeline = (id: string, data: Record<string, unknown>): Promise<Pipeline> =>
  api.patch(`/api/pipelines/${id}`, data).then(r => r.data);

export const deletePipeline = (id: string): Promise<void> =>
  api.delete(`/api/pipelines/${id}`).then(() => undefined);
