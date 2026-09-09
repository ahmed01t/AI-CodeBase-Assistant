/**
 * Standardized ApiResponse class for sending structured JSON responses.
 * Example: res.status(200).json(new ApiResponse(200, data, "Fetch successful"));
 */
export class ApiResponse<T = any> {
  public statusCode: number;
  public success: boolean;
  public message: string;
  public data: T;

  constructor(statusCode: number, data: T, message: string = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

