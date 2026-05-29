import { useState, useCallback } from 'react';
import type { Source } from '../types';
import * as sourceService from '../services/sourceService';

export interface SourceFormState {
  name: string;
  telegramId: string;
  telegramUsername: string;
  type: 'channel' | 'group';
}

const EMPTY_FORM: SourceFormState = { name: '', telegramId: '', telegramUsername: '', type: 'channel' };

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [srcForm, setSrcForm] = useState<SourceFormState>(EMPTY_FORM);
  const [srcError, setSrcError] = useState('');

  const load = useCallback(async () => {
    const data = await sourceService.getSources();
    setSources(data);
  }, []);

  const create = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSrcError('');
    const telegramId = parseInt(srcForm.telegramId, 10);
    if (isNaN(telegramId)) { setSrcError('Telegram ID must be a number'); return; }
    try {
      const data = await sourceService.createSource({
        name: srcForm.name,
        telegramId,
        telegramUsername: srcForm.telegramUsername || undefined,
        type: srcForm.type,
      });
      setSources(prev => [...prev, data]);
      setSrcForm(EMPTY_FORM);
      setShowAddSource(false);
    } catch (err: any) {
      setSrcError(err.response?.data?.message ?? 'Failed to create source');
    }
  }, [srcForm]);

  const remove = useCallback(async (s: Source): Promise<boolean> => {
    if (!confirm(`Delete source "${s.name}"?`)) return false;
    await sourceService.deleteSource(s.id);
    setSources(prev => prev.filter(x => x.id !== s.id));
    return true;
  }, []);

  return {
    sources,
    showAddSource,
    setShowAddSource,
    srcForm,
    setSrcForm,
    srcError,
    setSrcError,
    load,
    create,
    remove,
  };
}
