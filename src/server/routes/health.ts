import { defineRoute } from '../defineRoute';

export const health = {
  ping: defineRoute<void, { ok: true; ts: number }>({
    handler: () => ({ ok: true, ts: Date.now() }),
  }),
};
