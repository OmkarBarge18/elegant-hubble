-- PostgreSQL Database Schema for URL Shortener & Analytics System
-- Production-ready schema with indexed lookup fields and click analytics tracking

-- Enable UUID extension if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. URLs Table: Stores original URLs, short slugs, metadata and creation parameters
CREATE TABLE IF NOT EXISTS urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_url TEXT NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255),
    is_custom BOOLEAN DEFAULT FALSE,
    click_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for O(log N) lookup speed on redirection
CREATE INDEX IF NOT EXISTS idx_urls_slug ON urls(slug);
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls(created_at DESC);

-- 2. Clicks Table: Granular click tracking logs for rich analytics
CREATE TABLE IF NOT EXISTS clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
    slug VARCHAR(64) NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT DEFAULT 'Direct',
    country_code VARCHAR(10) DEFAULT 'US',
    country_name VARCHAR(100) DEFAULT 'United States',
    device_type VARCHAR(20) DEFAULT 'Desktop', -- Desktop, Mobile, Tablet
    browser VARCHAR(50) DEFAULT 'Chrome',
    os VARCHAR(50) DEFAULT 'Windows'
);

-- Indexes for analytical queries and aggregations
CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);
CREATE INDEX IF NOT EXISTS idx_clicks_slug_clicked ON clicks(slug, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_analytics ON clicks(slug, country_code, device_type);

-- 3. Daily Aggregated Stats: Pre-aggregated table for fast dashboard rendering
CREATE TABLE IF NOT EXISTS daily_analytics (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(64) NOT NULL,
    date DATE NOT NULL,
    total_clicks INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    UNIQUE(slug, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_slug_date ON daily_analytics(slug, date);
