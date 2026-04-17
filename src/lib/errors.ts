export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYMENT_REQUIRED'
  | 'INTERNAL';

export type ErrorDetails = Record<string, unknown>;

export type BackendErrorPayload = {
  error: string;
  code: ErrorCode;
  status: number;
  details?: ErrorDetails;
};

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'BackendError';
  }

  toJSON(): BackendErrorPayload {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
