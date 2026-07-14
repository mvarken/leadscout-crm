type Attempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;

  if (current.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginRateLimit(key: string) {
  attempts.delete(key);
}
