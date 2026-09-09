/**
 * Standardized ApiError class for throwing custom HTTP errors across the application.
 * Example: throw new ApiError(404, "Organization not found");
 */
export class ApiError extends Error {
  public statusCode: number;
  public success: boolean;
  public errors: any[];

  constructor(
    statusCode: number,
    message: string = "Internal Server Error",
    errors: any[] = [],
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

