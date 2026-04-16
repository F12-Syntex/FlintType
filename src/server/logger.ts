import { IS_DEV, logEnabled, logLevel } from './env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(msg: string, meta?: LogContext): void;
  info(msg: string, meta?: LogContext): void;
  warn(msg: string, meta?: LogContext): void;
  error(msg: string, err?: unknown, meta?: LogContext): void;
  child(context: LogContext): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LoggerOptions = {
  enabled?: boolean;
  level?: LogLevel;
  pretty?: boolean;
  sink?: (level: LogLevel, text: string) => void;
};

function defaultSink(level: LogLevel, text: string): void {
  if (level === 'error' || level === 'warn') {
    console.error(text);
  } else {
    console.log(text);
  }
}

function formatLine(
  level: LogLevel,
  msg: string,
  base: LogContext,
  meta: LogContext | undefined,
  err: unknown,
  pretty: boolean,
): string {
  const merged: LogContext = { ...base, ...meta };
  if (err !== undefined) {
    if (err instanceof Error) {
      merged.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    } else {
      merged.error = err;
    }
  }
  const line = { level, ts: new Date().toISOString(), msg, ...merged };
  if (pretty) {
    const { level: _l, ts, msg: _m, ...rest } = line;
    const time = ts.slice(11, 19);
    const restStr = Object.keys(rest).length
      ? ' ' + JSON.stringify(rest)
      : '';
    return `${level.toUpperCase().padEnd(5)} ${time} ${msg}${restStr}`;
  }
  return JSON.stringify(line);
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const enabled = opts.enabled ?? logEnabled();
  const level = opts.level ?? logLevel();
  const pretty = opts.pretty ?? IS_DEV;
  const sink = opts.sink ?? defaultSink;

  const allowed = (l: LogLevel) =>
    enabled && LEVEL_ORDER[l] >= LEVEL_ORDER[level];

  function build(base: LogContext): Logger {
    return {
      debug(m, meta) {
        if (allowed('debug')) {
          sink('debug', formatLine('debug', m, base, meta, undefined, pretty));
        }
      },
      info(m, meta) {
        if (allowed('info')) {
          sink('info', formatLine('info', m, base, meta, undefined, pretty));
        }
      },
      warn(m, meta) {
        if (allowed('warn')) {
          sink('warn', formatLine('warn', m, base, meta, undefined, pretty));
        }
      },
      error(m, err, meta) {
        if (allowed('error')) {
          sink('error', formatLine('error', m, base, meta, err, pretty));
        }
      },
      child(ctx) {
        return build({ ...base, ...ctx });
      },
    };
  }

  return build({});
}

export const logger: Logger = createLogger();
