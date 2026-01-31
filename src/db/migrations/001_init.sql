-- News sources (RSS, manual, etc.)
CREATE TABLE IF NOT EXISTS sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(20) NOT NULL,  -- 'rss', 'manual'
  url             TEXT,
  config          JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  parse_interval  INTEGER DEFAULT 3600,
  last_parsed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- News articles (original + AI processed)
CREATE TABLE IF NOT EXISTS news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id   VARCHAR(255),

  -- Original content
  title         TEXT NOT NULL,
  content       TEXT,
  url           TEXT,
  image_url     TEXT,

  -- AI processed content
  ai_title      TEXT,
  ai_content    TEXT,

  -- Status: raw -> processed -> pending -> approved/rejected
  status        VARCHAR(20) DEFAULT 'raw',

  -- Telegram
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
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);
