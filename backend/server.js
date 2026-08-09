/**
 * URL Shortener + Analytics - Express Backend Server
 * Demonstrates high-throughput architecture with Redis Caching & PostgreSQL persistent storage.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const rateLimiter = require('./middleware/rateLimiter');
const { createShortUrl, redirectUrl } = require('./controllers/urlController');
const { getUrlAnalytics, getSystemMetrics } = require('./controllers/analyticsController');
const { generateQrCode } = require('./controllers/qrController');
const { getIsConnected } = require('./config/db');
const { getIsRedisConnected, cacheMetrics } = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Global API Rate Limiter: max 100 requests per 15 minutes per IP
const apiLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', apiLimiter);

// Shorten Endpoint Limiter (stricter limit to prevent spam): max 15 creations per minute
const shortenLimiter = rateLimiter({ windowMs: 60 * 1000, max: 15 });

/* ==========================================================================
   API Routes
   ========================================================================== */

// 1. Create Shortened URL
app.post('/api/shorten', shortenLimiter, createShortUrl);

// 2. Analytics Endpoints
app.get('/api/analytics/system/metrics', getSystemMetrics);
app.get('/api/analytics/:slug', getUrlAnalytics);

// 3. QR Code Generator Endpoint
app.get('/api/qr/:slug', generateQrCode);

// 4. System Health & Infrastructure Diagnostics
app.get('/api/system/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      expressServer: { status: 'ONLINE', port: PORT },
      redisCache: { status: getIsRedisConnected() ? 'CONNECTED' : 'SIMULATED_LRU_ENGINE' },
      postgresDatabase: { status: getIsConnected() ? 'CONNECTED' : 'STANDALONE_MEMORY_POOL' }
    },
    performanceMetrics: cacheMetrics
  });
});

// 5. Short Link Redirection Handler (Must be registered last to avoid route collision)
app.get('/:slug', redirectUrl);

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 URL Shortener & Analytics Microservice online!`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📊 Analytics Dashboard: http://localhost:${PORT}/#analytics`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
