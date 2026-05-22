import { MigrationInterface, QueryRunner } from 'typeorm';

// This is the baseline migration that captures the schema previously managed by synchronize:true.
// If the tables already exist (upgraded from synchronize:true), the migration is a no-op.
// On a fresh database it creates everything from scratch.
export class InitialSchema1716000000000 implements MigrationInterface {
  name = 'InitialSchema1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If upgrading from synchronize:true the tables already exist — just record the migration.
    if (await queryRunner.hasTable('users')) return;

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "telegram_id" bigint NOT NULL,
        "telegram_username" character varying,
        "type" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "last_telegram_msg_id" bigint NOT NULL DEFAULT 0,
        CONSTRAINT "PK_sources" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sources_owner_telegram" UNIQUE ("owner_id", "telegram_id"),
        CONSTRAINT "FK_sources_owner_id" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pipelines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "filter_config" jsonb,
        CONSTRAINT "PK_pipelines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pipelines_owner_id" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pipeline_sources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "pipeline_id" uuid,
        "source_id" uuid,
        CONSTRAINT "PK_pipeline_sources" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pipeline_sources_pipeline_id" FOREIGN KEY ("pipeline_id")
          REFERENCES "pipelines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pipeline_sources_source_id" FOREIGN KEY ("source_id")
          REFERENCES "sources"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "pipeline_id" character varying NOT NULL,
        "telegram_message_id" bigint NOT NULL,
        "channel_id" bigint NOT NULL,
        "sender_id" bigint NOT NULL,
        "sender_name" character varying NOT NULL,
        "text" text,
        "media_type" character varying,
        "media_url" character varying,
        "media_mime_type" character varying,
        "reply_to_msg_id" bigint,
        "reply_to_text" text,
        "reply_to_sender_name" character varying,
        "received_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_pipeline_id" FOREIGN KEY ("pipeline_id")
          REFERENCES "pipelines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_messages_pipeline_received" ON "messages" ("pipeline_id", "received_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "telegram_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "session_string_encrypted" character varying NOT NULL,
        "phone" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telegram_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_telegram_sessions_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_telegram_sessions_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" character varying NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "revoked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "avatar_cache" (
        "entity_id" bigint NOT NULL,
        "data" text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_avatar_cache" PRIMARY KEY ("entity_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "media_cache" (
        "key" character varying NOT NULL,
        "mime_type" character varying,
        "data" text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_cache" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "media_cache"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "avatar_cache"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pipeline_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pipelines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
