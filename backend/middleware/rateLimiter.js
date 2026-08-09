/**
 * Sliding Window / Fixed Window Rate Limiter Middleware
 * Uses Redis INCR with key expiration to enforce rate limits per IP address.
 */

const { incrCounter } = require('../config/redis');

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const maxRequests = options.max || 30; // 30 requests per minute
  const ttlSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const key = `ratelimit:${req.path}:${clientIp}`;

      const currentCount = await incrCounter(key, ttlSeconds);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', ttlSeconds);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests allowed per ${ttlSeconds} seconds.`,
          retryAfterSeconds: ttlSeconds
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter middleware error:', error.message);
      next(); // Fail open for resilience
    }
  };
}

module.exports = rateLimiter;
