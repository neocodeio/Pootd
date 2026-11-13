function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map()
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, Math.min(windowMs, 60_000))
  cleanup.unref()

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)
      res.set('Retry-After', String(retryAfterSeconds))
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message,
          retryAfterSeconds,
        },
      })
      return
    }

    next()
  }
}

module.exports = { createRateLimiter }
