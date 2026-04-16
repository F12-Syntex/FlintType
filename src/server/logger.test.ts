import { describe, expect, it } from 'vitest';
import { createLogger, type LogLevel } from './logger';

function captured() {
  const records: Array<{ level: LogLevel; text: string }> = [];
  const sink = (level: LogLevel, text: string) => {
    records.push({ level, text });
  };
  return { records, sink };
}

describe('logger', () => {
  it('emits debug/info/warn/error when enabled and threshold met', () => {
    const { records, sink } = captured();
    const log = createLogger({ enabled: true, level: 'debug', sink });
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(records.map((r) => r.level)).toEqual([
      'debug',
      'info',
      'warn',
      'error',
    ]);
  });

  it('filters messages below the configured threshold', () => {
    const { records, sink } = captured();
    const log = createLogger({ enabled: true, level: 'warn', sink });
    log.debug('nope');
    log.info('nope');
    log.warn('yes');
    log.error('yes');
    expect(records.map((r) => r.level)).toEqual(['warn', 'error']);
  });

  it('silences every level when disabled', () => {
    const { records, sink } = captured();
    const log = createLogger({ enabled: false, level: 'debug', sink });
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(records).toHaveLength(0);
  });

  it('emits JSON with level/msg/ts/meta when pretty=false', () => {
    const { records, sink } = captured();
    const log = createLogger({
      enabled: true,
      level: 'debug',
      pretty: false,
      sink,
    });
    log.info('hello', { foo: 'bar' });
    const parsed = JSON.parse(records[0].text);
    expect(parsed).toMatchObject({ level: 'info', msg: 'hello', foo: 'bar' });
    expect(typeof parsed.ts).toBe('string');
  });

  it('pretty-prints when pretty=true', () => {
    const { records, sink } = captured();
    const log = createLogger({
      enabled: true,
      level: 'debug',
      pretty: true,
      sink,
    });
    log.info('hello', { foo: 'bar' });
    expect(records[0].text).toMatch(
      /^INFO\s+\d{2}:\d{2}:\d{2} hello {"foo":"bar"}$/,
    );
  });

  it('child() logger merges base context into every line', () => {
    const { records, sink } = captured();
    const log = createLogger({
      enabled: true,
      level: 'debug',
      pretty: false,
      sink,
    });
    const scoped = log.child({ requestId: 'req_1' });
    scoped.info('hi', { extra: true });
    const parsed = JSON.parse(records[0].text);
    expect(parsed).toMatchObject({
      requestId: 'req_1',
      extra: true,
      msg: 'hi',
    });
  });

  it('serializes Error objects into a structured field', () => {
    const { records, sink } = captured();
    const log = createLogger({
      enabled: true,
      level: 'debug',
      pretty: false,
      sink,
    });
    log.error('boom', new Error('kaboom'), { path: '/x' });
    const parsed = JSON.parse(records[0].text);
    expect(parsed.error).toMatchObject({ name: 'Error', message: 'kaboom' });
    expect(typeof parsed.error.stack).toBe('string');
    expect(parsed.path).toBe('/x');
  });
});
