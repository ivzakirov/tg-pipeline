import { isFilterGroup, FilterGroup, FilterCondition } from '@tg-pipeline/shared-types';
import type { RawTelegramMessage } from '@tg-pipeline/kafka-schemas';

export function evaluate(node: FilterGroup | FilterCondition, msg: RawTelegramMessage): boolean {
  if (isFilterGroup(node)) {
    return evaluateGroup(node, msg);
  }
  return evaluateCondition(node, msg);
}

function evaluateGroup(group: FilterGroup, msg: RawTelegramMessage): boolean {
  const { operator, children } = group;

  let result: boolean;
  if (operator === 'AND') {
    result = children.every((child) => evaluate(child, msg));
  } else if (operator === 'OR') {
    result = children.some((child) => evaluate(child, msg));
  } else {
    // NOT — expects exactly one child
    result = children.length > 0 ? !evaluate(children[0], msg) : false;
  }
  return result;
}

function evaluateCondition(cond: FilterCondition, msg: RawTelegramMessage): boolean {
  let matches: boolean;

  switch (cond.type) {
    case 'keyword': {
      const terms = Array.isArray(cond.value) ? cond.value : [cond.value ?? ''];
      const text = msg.text.toLowerCase();
      matches = terms.some((t) => text.includes(t.toLowerCase()));
      break;
    }
    case 'regex': {
      const pattern = typeof cond.value === 'string' ? cond.value : '';
      matches = new RegExp(pattern, 'i').test(msg.text);
      break;
    }
    case 'sender': {
      const senders = Array.isArray(cond.value) ? cond.value : [cond.value ?? ''];
      matches = senders.some(
        (s) => s === String(msg.senderId) || s.toLowerCase() === msg.senderName.toLowerCase(),
      );
      break;
    }
    case 'has_media': {
      matches = !!msg.mediaType;
      break;
    }
    case 'media_type': {
      const types = Array.isArray(cond.value) ? cond.value : [cond.value ?? ''];
      matches = types.some((t) => t.toLowerCase() === msg.mediaType?.toLowerCase());
      break;
    }
    default:
      matches = false;
  }

  return cond.negate ? !matches : matches;
}
