<!-- layout: custom:code-explainer -->
^ How it works
# Read-through cache
Check the cache first, fall back to the database.
- One lookup on a hit
- Cached for five minutes
- Same API for callers
```ts
async function getUser(id: string) {
  const hit = await redis.get("user:" + id);
  if (hit) return JSON.parse(hit);
  const user = await db.user.find(id);
  await redis.set("user:" + id, JSON.stringify(user), "EX", 300);
  return user;
}
```
