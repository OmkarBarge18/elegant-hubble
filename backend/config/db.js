/**
 * Database Configuration & Connection Pool Module (PostgreSQL)
 * Implements resilient client pooling and fallback storage when running in standalone mode.
 */

const { Pool } = require('pg');

// Environment configurations
const POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/urlshortener';

let pool;
let isConnected = false;

try {
  pool = new Pool({
    connectionString: POSTGRES_URL,
    max: 20, // Maximum client pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
} catch (e) {
  console.warn('PostgreSQL Pool initialization notice:', e.message);
}

// In-Memory Storage Engine for Standalone / Demo execution
const inMemoryDb = {
  urls: new Map(),
  clicks: [],
  dailyStats: new Map()
};

async function query(text, params = []) {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      isConnected = true;
      return res;
    } catch (err) {
      // Fallback to in-memory store if postgres is not currently active locally
      return executeInMemory(text, params);
    }
  }
  return executeInMemory(text, params);
}

function executeInMemory(text, params) {
  const sql = text.trim();
  
  if (sql.includes('INSERT INTO urls')) {
    // INSERT INTO urls (id, original_url, slug, title, is_custom, created_at, expires_at)
    const [id, original_url, slug, title, is_custom, created_at, expires_at] = params;
    const record = { id, original_url, slug, title, is_custom: !!is_custom, click_count: 0, created_at: created_at || new Date(), expires_at };
    inMemoryDb.urls.set(slug, record);
    return { rows: [record], rowCount: 1 };
  }

  if (sql.includes('SELECT * FROM urls WHERE slug =')) {
    const slug = params[0];
    const record = inMemoryDb.urls.get(slug);
    return { rows: record ? [record] : [], rowCount: record ? 1 : 0 };
  }

  if (sql.includes('UPDATE urls SET click_count = click_count + 1')) {
    const slug = params[0];
    const record = inMemoryDb.urls.get(slug);
    if (record) {
      record.click_count = (Number(record.click_count) || 0) + 1;
    }
    return { rowCount: record ? 1 : 0 };
  }

  if (sql.includes('INSERT INTO clicks')) {
    const [id, url_id, slug, clicked_at, ip_address, user_agent, referrer, country_code, country_name, device_type, browser, os] = params;
    const clickObj = {
      id, url_id, slug, clicked_at: clicked_at || new Date(), ip_address, user_agent, referrer, country_code, country_name, device_type, browser, os
    };
    inMemoryDb.clicks.push(clickObj);
    return { rows: [clickObj], rowCount: 1 };
  }

  if (sql.includes('SELECT') && sql.includes('FROM clicks WHERE slug =')) {
    const slug = params[0];
    const slugClicks = inMemoryDb.clicks.filter(c => c.slug === slug);
    return { rows: slugClicks, rowCount: slugClicks.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  pool,
  inMemoryDb,
  getIsConnected: () => isConnected
};
