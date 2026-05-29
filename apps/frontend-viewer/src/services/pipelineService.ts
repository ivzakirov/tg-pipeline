import api from '../api';
import type { Pipeline } from '../types';

export const getPipelines = (): Promise<Pipeline[]> =>
  api.get('/api/pipelines').then(r => r.data);

export const getPipeline = (id: string): Promise<Pipeline> =>
  api.get(`/api/pipelines/${id}`).then(r => r.data);

export const patchPipeline = (id: string, data: Record<string, unknown>): Promise<Pipeline> =>
  api.patch(`/api/pipelines/${id}`, data).then(r => r.data);
