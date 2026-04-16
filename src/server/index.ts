export { defineRoute } from './defineRoute';
export { defineNamespace } from './defineNamespace';
export { BackendError } from './errors';
export type {
  BackendErrorPayload,
  ErrorCode,
  ErrorDetails,
} from './errors';
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
