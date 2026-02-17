// NOTE: in-memory — resets on deploy. Migrate to Redis if scaling.

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

const LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/chat': { maxTokens: 10, refillRate: 10 / 60 }, // 10 req/min
  '/api/query': { maxTokens: 60, refillRate: 60 / 60 }, // 60 req/min
  '/api/export': { maxTokens: 5, refillRate: 5 / 60 }, // 5 req/min
  '/api/n8n': { maxTokens: 30, refillRate: 30 / 60 }, // 30 req/min
};

const DEFAULT_LIMIT: RateLimitConfig = { maxTokens: 60, refillRate: 1 };

const buckets = new Map<string, TokenBucket>();

export function extractIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export function checkRateLimit(
  ip: string,
  endpoint: string
): { allowed: boolean; retryAfter?: number } {
  const config = LIMITS[endpoint] || DEFAULT_LIMIT;
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    config.maxTokens,
    bucket.tokens + elapsed * config.refillRate
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  // Calculate retry-after in seconds
  const retryAfter = Math.ceil((1 - bucket.tokens) / config.refillRate);
  return { allowed: false, retryAfter };
}
