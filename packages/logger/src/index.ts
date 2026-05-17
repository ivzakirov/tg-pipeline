import pino from 'pino';

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
  });
}

export type Logger = ReturnType<typeof createLogger>;
