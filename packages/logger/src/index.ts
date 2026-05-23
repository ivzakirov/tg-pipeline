import pino from 'pino';
import { trace } from '@opentelemetry/api';

export interface LoggerOptions {
  service: string;
  level?: string;
}

export function createLogger(options: LoggerOptions) {
  return pino({
    level: options.level ?? process.env['LOG_LEVEL'] ?? 'info',
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    mixin() {
      const span = trace.getActiveSpan();
      if (!span) return {};
      const { traceId, spanId } = span.spanContext();
      return { trace_id: traceId, span_id: spanId };
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
