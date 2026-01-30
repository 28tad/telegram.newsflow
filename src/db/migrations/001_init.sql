-- Projects (sites that receive news)
CREATE TABLE IF NOT EXISTS projects (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(100) NOT NULL,
  slug                   VARCHAR(50) UNIQUE NOT NULL,
  tg_moderation_chat_id  BIGINT NOT NULL,
  tg_publish_channel_id  BIGINT,
  api_key                VARCHAR(64) NOT NULL,
  is_active              BOOLEAN DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- News sources
CREATE TABLE IF NOT EXISTS sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(20) NOT NULL,
  url             TEXT NOT NULL,
  config          JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  parse_interval  INTEGER DEFAULT 3600,
  last_parsed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- News articles
CREATE TABLE IF NOT EXISTS news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id   VARCHAR(255),
  title         TEXT NOT NULL,
  content       TEXT,
  summary       TEXT,
  url           TEXT,
  image_url     TEXT,
  status        VARCHAR(20) DEFAULT 'pending',
  tg_message_id BIGINT,
  moderated_by  VARCHAR(100),
  moderated_at  TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(source_id, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);
