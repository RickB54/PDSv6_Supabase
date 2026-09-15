/**
 * Client-Side Rate Limiter for Public Forms
 * Provides immediate feedback against rapid bot submission and button spamming
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  storageKey: string;
}

export function checkClientRateLimit(
  key: string = 'public_booking_form',
  maxAttempts: number = 3,
  windowMs: number = 60 * 1000
): { allowed: boolean; waitSeconds: number } {
  try {
    const storageKey = `rate_limit_${key}`;
    const now = Date.now();
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Filter to active window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxAttempts) {
      const oldestValid = validTimestamps[0];
      const waitSeconds = Math.ceil((windowMs - (now - oldestValid)) / 1000);
      return { allowed: false, waitSeconds: Math.max(1, waitSeconds) };
    }

    validTimestamps.push(now);
    sessionStorage.setItem(storageKey, JSON.stringify(validTimestamps));
    localStorage.setItem(storageKey, JSON.stringify(validTimestamps));

    return { allowed: true, waitSeconds: 0 };
  } catch {
    // If storage access fails, fail open
    return { allowed: true, waitSeconds: 0 };
  }
}
