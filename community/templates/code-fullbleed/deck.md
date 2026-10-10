<!-- layout: custom:code-fullbleed -->
^ src/server/rate-limit.ts
# A sliding-window rate limiter in 10 lines
```ts
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return Math.ceil((windowMs - (now - recent[0])) / 1000);
  recent.push(now);
  hits.set(key, recent);
  return 0;
}
```
