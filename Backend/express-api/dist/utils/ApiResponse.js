/**
 * Standardized ApiResponse class for sending structured JSON responses.
 * Example: res.status(200).json(new ApiResponse(200, data, "Fetch successful"));
 */
export class ApiResponse {
    statusCode;
    success;
    message;
    data;
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.data = data;
    }
}
