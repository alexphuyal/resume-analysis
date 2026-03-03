export class Result<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;
  public readonly error?: { code?: string; details?: unknown };

  private constructor(success: boolean, message: string, data?: T, error?: { code?: string; details?: unknown }) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static ok<T>(message: string, data?: T): Result<T> {
    return new Result<T>(true, message, data);
  }

  static fail(message: string, code?: string, details?: unknown): Result {
    return new Result(false, message, undefined, { code, details });
  }
}
