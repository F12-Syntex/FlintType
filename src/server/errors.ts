export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}
