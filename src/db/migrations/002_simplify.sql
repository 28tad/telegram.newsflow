-- Migration: Remove projects table, add AI fields to news

-- Drop foreign key and column from sources
ALTER TABLE sources DROP COLUMN IF EXISTS project_id;

-- Drop projects table
DROP TABLE IF EXISTS projects;

-- Add AI processed fields to news
ALTER TABLE news ADD COLUMN IF NOT EXISTS ai_title TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS ai_content TEXT;

-- Update default status (for new records, old migration already set 'pending')
-- Existing 'pending' records stay as is, new flow will use 'raw' -> 'processed' -> 'pending'

-- Drop old index
DROP INDEX IF EXISTS idx_sources_project;

-- Add new index
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);
