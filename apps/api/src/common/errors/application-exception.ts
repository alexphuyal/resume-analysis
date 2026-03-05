export class ApplicationException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'APPLICATION_EXCEPTION', details?: unknown) {
    super(message);
    this.name = 'ApplicationException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
