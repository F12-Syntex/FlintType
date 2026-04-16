import { describe, expect, it } from 'vitest';
import { defineNamespace } from './defineNamespace';
import { defineRoute } from './defineRoute';
import { resolvePath } from './resolve';
import type { Middleware } from './types';

const mk = (): Middleware => async (_c, n) => n();

describe('resolvePath', () => {
  it('resolves a top-level route and returns no middleware', () => {
    const r = defineRoute<void, string>({ handler: () => 'hi' });
    const ns = defineNamespace({ routes: { ping: r } });
    const res = resolvePath(ns, ['ping']);
    expect(res?.route).toBe(r);
    expect(res?.middleware).toEqual([]);
  });

  it('collects middleware from every namespace traversed', () => {
    const r = defineRoute<void, string>({ handler: () => 'x' });
    const outer = mk();
    const mid = mk();
    const ns = defineNamespace({
      middleware: [outer],
      routes: {
        a: defineNamespace({
          middleware: [mid],
          routes: { list: r },
        }),
      },
    });
    const res = resolvePath(ns, ['a', 'list']);
    expect(res?.middleware).toEqual([outer, mid]);
  });

  it('returns null for unknown segments', () => {
    const ns = defineNamespace({
      routes: {
        a: defineRoute<void, string>({ handler: () => 'x' }),
      },
    });
    expect(resolvePath(ns, ['missing'])).toBeNull();
    expect(resolvePath(ns, ['a', 'too', 'deep'])).toBeNull();
  });

  it('returns null when path lands on a namespace, not a route', () => {
    const ns = defineNamespace({
      routes: {
        a: defineNamespace({
          routes: {
            x: defineRoute<void, string>({ handler: () => 'x' }),
          },
        }),
      },
    });
    expect(resolvePath(ns, ['a'])).toBeNull();
    expect(resolvePath(ns, ['a', 'x'])).not.toBeNull();
  });
});
