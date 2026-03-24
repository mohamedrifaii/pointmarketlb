const rateLimitStore = new Map();

function createRateLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.ip || 'unknown')
      .toString()
      .split(',')[0]
      .trim();
    const now = Date.now();
    const current = rateLimitStore.get(ip);

    if (!current || current.expiresAt <= now) {
      rateLimitStore.set(ip, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        message,
        retryAfterSeconds: Math.ceil((current.expiresAt - now) / 1000),
      });
      return;
    }

    current.count += 1;
    next();
  };
}

module.exports = {
  createRateLimiter,
};
