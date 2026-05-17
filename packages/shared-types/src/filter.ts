export type FilterConditionType =
  | 'keyword'
  | 'regex'
  | 'sender'
  | 'has_media'
  | 'media_type';

export interface FilterCondition {
  type: FilterConditionType;
  value?: string | string[];
  negate?: boolean;
}

export interface FilterGroup {
  operator: 'AND' | 'OR' | 'NOT';
  children: (FilterGroup | FilterCondition)[];
}

export function isFilterGroup(node: FilterGroup | FilterCondition): node is FilterGroup {
  return 'operator' in node;
}
