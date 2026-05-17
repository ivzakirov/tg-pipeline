export const KAFKA_TOPICS = {
  TELEGRAM_RAW: 'telegram.raw',
  TELEGRAM_RAW_DLT: 'telegram.raw.dlt',
  PIPELINE_FILTERED: 'pipeline.filtered',
  CONFIG_SOURCES_CHANGED: 'config.sources.changed',
  CONFIG_PIPELINES_CHANGED: 'config.pipelines.changed',
  CONFIG_USERS_TELEGRAM_CHANGED: 'config.users.telegram.changed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
