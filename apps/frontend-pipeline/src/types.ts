export interface Source {
  id: string;
  name: string;
  telegramId: number;
  type: 'channel' | 'group';
  enabled: boolean;
}

export interface FilterGroup {
  operator: 'AND' | 'OR' | 'NOT';
  children: (FilterGroup | FilterCondition)[];
}

export interface FilterCondition {
  type: 'keyword' | 'regex' | 'sender' | 'has_media' | 'media_type';
  value?: string | string[];
  negate?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  enabled: boolean;
  filterConfig: FilterGroup | null;
  pipelineSources: { source: Source }[];
}
