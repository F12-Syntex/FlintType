export type RateLimitPingOutput = {
  ok: true;
  ts: number;
  limit: number;
  windowMs: number;
};
