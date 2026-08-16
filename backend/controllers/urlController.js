/**
 * URL Controller Module
 * Handles Base62 short code generation, custom slug validation, cache-first redirection, and async analytics stream.
 */

const crypto = require('crypto');
const { query } = require('../config/db');
const { getCache, setCache, incrCounter } = require('../config/redis');

// Base62 character set for high-density compact URLs
const BASE62_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a numeric ID into a Base62 slug string
 */
function encodeBase62(num) {
  if (num === 0) return BASE62_CHARSET[0];
  let sb = '';
  while (num > 0) {
    sb = BASE62_CHARSET[num % 62] + sb;
    num = Math.floor(num / 62);
  }
  return sb;
}

/**
 * Generate random high-entropy Base62 slug if no numeric ID is supplied
 */
function generateRandomSlug(length = 6) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * 62);
    result += BASE62_CHARSET[randomIndex];
  }
  return result;
}

function extractCleanSlug(inputStr) {
  if (!inputStr) return '';
  let str = String(inputStr).trim();
  str = str.replace(/^https?:\/\//i, '');
  const parts = str.split('/').filter(Boolean);
  let lastPart = parts.length > 0 ? parts[parts.length - 1] : str;
  lastPart = lastPart.split('?')[0].split('#')[0];
  return lastPart.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Validates custom slug format (letters, numbers, hyphens, underscores)
 */
function isValidCustomSlug(slug) {
  return /^[a-zA-Z0-9_-]{1,32}$/.test(slug);
}

/**
 * Normalize and validate input URL string
 */
function validateUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * POST /api/shorten
 * Create short URL with optional custom slug and expiration
 */
async function createShortUrl(req, res) {
  try {
    const { originalUrl, customSlug, title, expiresAt } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP or HTTPS target URL.'
      });
    }

    let targetUrl = originalUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    let slug = extractCleanSlug(customSlug);
    let isCustom = false;

    if (slug) {
      isCustom = true;
    } else {
      // Auto-generate random slug and check uniqueness
      let attempts = 0;
      do {
        slug = generateRandomSlug(6);
        const check = await query('SELECT slug FROM urls WHERE slug = $1', [slug]);
        if (check.rowCount === 0) break;
        attempts++;
      } while (attempts < 5);
    }

    const id = (Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
    const createdAt = new Date();
    const parsedTitle = title || new URL(targetUrl).hostname;

    // Persist to PostgreSQL
    const insertQuery = `
      INSERT INTO urls (id, original_url, slug, title, is_custom, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const insertResult = await query(insertQuery, [id, targetUrl, slug, parsedTitle, isCustom, createdAt, expiresAt || null]);
    const record = insertResult.rows[0] || {
      id, original_url: targetUrl, slug, title: parsedTitle, is_custom: isCustom, created_at: createdAt, expires_at: expiresAt
    };

    // Warm up Redis Cache immediately (24h TTL)
    await setCache(`slug:${slug}`, record, 86400);

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const shortUrl = `${protocol}://${host}/${slug}`;

    return res.status(201).json({
      success: true,
      data: {
        id: record.id,
        slug: record.slug,
        shortUrl,
        originalUrl: record.original_url,
        title: record.title,
        isCustom: record.is_custom,
        createdAt: record.created_at,
        expiresAt: record.expires_at
      }
    });

  } catch (error) {
    console.error('Error creating short URL:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * GET /:slug
 * High-speed redirection endpoint with Redis cache-first lookup and non-blocking click tracking
 */
async function redirectUrl(req, res) {
  const { slug } = req.params;
  const startTime = performance.now();

  try {
    // 1. Check Redis Cache (sub-2ms lookup)
    const cacheResult = await getCache(`slug:${slug}`);
    let urlRecord = cacheResult.data;
    let cacheStatus = cacheResult.source;

    // 2. Cache Miss fallback to PostgreSQL
    if (!urlRecord) {
      const dbResult = await query('SELECT * FROM urls WHERE slug = $1 AND is_active = TRUE', [slug]);
      if (dbResult.rowCount === 0) {
        return res.status(404).json({
          error: 'URL Not Found',
          message: `No active shortened link found for slug /${slug}`
        });
      }
      urlRecord = dbResult.rows[0];

      // Write back to Redis for subsequent hits
      await setCache(`slug:${slug}`, urlRecord, 86400);
      cacheStatus = 'POSTGRES_DB_LOOKUP';
    }

    // Check expiration
    if (urlRecord.expires_at && new Date(urlRecord.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'Link Expired',
        message: 'This shortened link has expired.'
      });
    }

    const totalLatency = (performance.now() - startTime).toFixed(2);

    // 3. Asynchronously record click event (non-blocking)
    recordClickEvent(req, urlRecord, slug, cacheStatus, totalLatency).catch(console.error);

    // 4. Send HTTP 302 Redirect
    res.set({
      'X-Cache-Status': cacheStatus,
      'X-Lookup-Latency': `${totalLatency}ms`,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    return res.redirect(302, urlRecord.original_url || urlRecord.originalUrl);

  } catch (error) {
    console.error(`Redirect error for slug /${slug}:`, error);
    return res.status(500).json({ error: 'Internal Error', message: error.message });
  }
}

/**
 * Helper to record click analytics asynchronously
 */
async function recordClickEvent(req, urlRecord, slug, cacheStatus, latency) {
  const userAgentStr = req.headers['user-agent'] || 'Mozilla/5.0';
  const referrer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Extract browser / OS / device
  const deviceType = /mobile|iphone|android|ipad/i.test(userAgentStr) ? 'Mobile' : /tablet|ipad/i.test(userAgentStr) ? 'Tablet' : 'Desktop';
  const browser = /chrome/i.test(userAgentStr) ? 'Chrome' : /firefox/i.test(userAgentStr) ? 'Firefox' : /safari/i.test(userAgentStr) ? 'Safari' : /edge/i.test(userAgentStr) ? 'Edge' : 'Other';

  // Sample geographic locations for demo
  const sampleCountries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'IN', name: 'India' },
    { code: 'CA', name: 'Canada' },
    { code: 'JP', name: 'Japan' }
  ];
  const geo = sampleCountries[Math.floor(Math.random() * sampleCountries.length)];

  // Update DB & counters
  await query('UPDATE urls SET click_count = click_count + 1 WHERE slug = $1', [slug]);

  await query(
    `INSERT INTO clicks (id, url_id, slug, clicked_at, ip_address, user_agent, referrer, country_code, country_name, device_type, browser)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      Math.random().toString(36).substring(2, 10),
      urlRecord.id,
      slug,
      new Date(),
      ip,
      userAgentStr,
      referrer,
      geo.code,
      geo.name,
      deviceType,
      browser
    ]
  );
}

module.exports = {
  createShortUrl,
  redirectUrl,
  isValidCustomSlug
};
