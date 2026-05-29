import api from '../api';
import type { Source } from '../types';

export const getSources = (): Promise<Source[]> =>
  api.get('/api/sources').then(r => r.data);

export const createSource = (data: Omit<Source, 'id' | 'enabled'> & { telegramUsername?: string }): Promise<Source> =>
  api.post('/api/sources', data).then(r => r.data);

export const deleteSource = (id: string): Promise<void> =>
  api.delete(`/api/sources/${id}`).then(() => undefined);
