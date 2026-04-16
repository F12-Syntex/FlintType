export { defineRoute } from './defineRoute';
export { defineNamespace } from './defineNamespace';
export { BackendError } from '@/lib/errors';
export type {
  BackendErrorPayload,
  ErrorCode,
  ErrorDetails,
} from '@/lib/errors';
export { createLogger, logger } from './logger';
export type { LogContext, LogLevel, Logger, LoggerOptions } from './logger';
export type {
  AnyNamespaceDef,
  AnyRouteDef,
  Middleware,
  MiddlewareNext,
  NamespaceChild,
  NamespaceDef,
  NamespaceRecord,
  RouteContext,
  RouteDef,
  RouteHandler,
} from './types';
