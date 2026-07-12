import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type LoginAttempt = { failures: number; windowStartedAt: number; blockedUntil: number };

@Injectable()
export class LoginRateLimiter {
  private attempts = new Map<string, LoginAttempt>();
  private readonly windowMs = 5 * 60 * 1000;
  private readonly blockMs = 5 * 60 * 1000;
  private readonly maxFailures = 5;
  private readonly maxEntries = 10_000;

  assertAllowed(username: string, now = Date.now()) {
    const key = this.key(username);
    const attempt = this.attempts.get(key);
    if (!attempt) return;
    if (attempt.blockedUntil > now) {
      throw new HttpException('Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 5 phút', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (now - attempt.windowStartedAt >= this.windowMs) this.attempts.delete(key);
  }

  recordFailure(username: string, now = Date.now()) {
    const key = this.key(username);
    const previous = this.attempts.get(key);
    if (!previous && this.attempts.size >= this.maxEntries) {
      const oldestKey = this.attempts.keys().next().value;
      if (oldestKey) this.attempts.delete(oldestKey);
    }
    const attempt =
      !previous || now - previous.windowStartedAt >= this.windowMs
        ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
        : previous;
    attempt.failures += 1;
    if (attempt.failures >= this.maxFailures) attempt.blockedUntil = now + this.blockMs;
    this.attempts.set(key, attempt);
  }

  reset(username: string) {
    this.attempts.delete(this.key(username));
  }

  private key(username: string) {
    return username.trim().toLocaleLowerCase('vi-VN');
  }
}
