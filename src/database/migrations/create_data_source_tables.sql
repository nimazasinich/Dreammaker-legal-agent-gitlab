-- Migration: Create tables for Unified Data Source Manager
-- Created: 2025-11-28
-- Purpose: Support data caching, failure tracking, and health monitoring

-- Table: data_retrieval_log
-- Purpose: Store all successfully retrieved data for future reference
CREATE TABLE IF NOT EXISTS data_retrieval_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  cache_key TEXT UNIQUE NOT NULL,
  data TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_retrieval_category ON data_retrieval_log(category);
CREATE INDEX IF NOT EXISTS idx_data_retrieval_timestamp ON data_retrieval_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_retrieval_source ON data_retrieval_log(source);

-- Table: data_source_failures
-- Purpose: Track all data source failures for monitoring and analysis
CREATE TABLE IF NOT EXISTS data_source_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_failures_source ON data_source_failures(source_name);
CREATE INDEX IF NOT EXISTS idx_failures_timestamp ON data_source_failures(timestamp);
CREATE INDEX IF NOT EXISTS idx_failures_category ON data_source_failures(category);

-- Table: data_source_health
-- Purpose: Store historical health metrics for data sources
CREATE TABLE IF NOT EXISTS data_source_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  is_healthy BOOLEAN NOT NULL DEFAULT 1,
  consecutive_failures INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time REAL DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_source ON data_source_health(source_name);
CREATE INDEX IF NOT EXISTS idx_health_timestamp ON data_source_health(timestamp);

-- Table: huggingface_responses
-- Purpose: Store all HuggingFace model responses for faster future access
CREATE TABLE IF NOT EXISTS huggingface_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT NOT NULL,
  request_type TEXT NOT NULL,
  symbol TEXT,
  request_params TEXT,
  response_data TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hf_model ON huggingface_responses(model_name);
CREATE INDEX IF NOT EXISTS idx_hf_type ON huggingface_responses(request_type);
CREATE INDEX IF NOT EXISTS idx_hf_symbol ON huggingface_responses(symbol);
CREATE INDEX IF NOT EXISTS idx_hf_timestamp ON huggingface_responses(timestamp);

-- Table: market_data_cache
-- Purpose: Enhanced market data caching with metadata
CREATE TABLE IF NOT EXISTS market_data_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'price', 'ohlcv', 'ticker', etc.
  timeframe TEXT,
  data TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_cache_symbol ON market_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_market_cache_type ON market_data_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_market_cache_expires ON market_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_market_cache_timestamp ON market_data_cache(timestamp);

-- Table: sentiment_data_cache
-- Purpose: Cache sentiment analysis results
CREATE TABLE IF NOT EXISTS sentiment_data_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT,
  keyword TEXT,
  sentiment_score REAL,
  sentiment_label TEXT,
  data TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sentiment_symbol ON sentiment_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_keyword ON sentiment_data_cache(keyword);
CREATE INDEX IF NOT EXISTS idx_sentiment_expires ON sentiment_data_cache(expires_at);

-- Table: news_data_cache
-- Purpose: Cache news articles and analysis
CREATE TABLE IF NOT EXISTS news_data_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  url TEXT UNIQUE,
  content TEXT,
  source TEXT NOT NULL,
  published_at INTEGER,
  sentiment_score REAL,
  relevance_score REAL,
  timestamp INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_source ON news_data_cache(source);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_data_cache(published_at);
CREATE INDEX IF NOT EXISTS idx_news_expires ON news_data_cache(expires_at);

-- Table: data_source_config
-- Purpose: Store runtime configuration for data sources
CREATE TABLE IF NOT EXISTS data_source_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  max_retries INTEGER NOT NULL DEFAULT 2,
  rate_limit_per_minute INTEGER DEFAULT 60,
  config_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: data_source_notifications
-- Purpose: Store user notifications about data source events
CREATE TABLE IF NOT EXISTS data_source_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'warning', 'error', 'info', 'success'
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  details TEXT,
  is_read BOOLEAN DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON data_source_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON data_source_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON data_source_notifications(timestamp);

-- Cleanup: Remove expired cache entries (should be run periodically)
-- This can be executed by a cron job or scheduled task
CREATE VIEW IF NOT EXISTS expired_cache_entries AS
SELECT 'market_data_cache' as table_name, id, expires_at FROM market_data_cache WHERE expires_at < unixepoch() * 1000
UNION ALL
SELECT 'sentiment_data_cache' as table_name, id, expires_at FROM sentiment_data_cache WHERE expires_at < unixepoch() * 1000
UNION ALL
SELECT 'news_data_cache' as table_name, id, expires_at FROM news_data_cache WHERE expires_at < unixepoch() * 1000;
