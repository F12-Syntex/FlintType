import type { RouteDef } from './types';

export function defineRoute<I, O>(def: RouteDef<I, O>): RouteDef<I, O> {
  return def;
}
