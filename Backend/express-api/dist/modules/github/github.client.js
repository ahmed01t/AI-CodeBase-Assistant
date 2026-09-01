import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
/**
 * GitHub REST API Client
 * Low-level client responsible ONLY for HTTP communication with api.github.com.
 * Configures headers, manages request timeouts, and converts GitHub HTTP error responses into ApiErrors.
 */
export class GitHubClient {
    baseUrl;
    defaultToken;
    timeoutMs;
    constructor() {
        this.baseUrl = env.GITHUB_API_URL.replace(/\/$/, "");
        this.defaultToken = env.GITHUB_TOKEN;
        this.timeoutMs = 8000; // 8 second request timeout
    }
    /**
     * Constructs headers required for GitHub REST API v3
     */
    getHeaders(customToken) {
        const token = customToken || this.defaultToken;
        const headers = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "AI-CodeBase-Assistant-Backend",
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }
    /**
     * Executes a GET request against the GitHub REST API with timeout protection.
     */
    async get(endpoint, customToken) {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: this.getHeaders(customToken),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                let errorMessage = response.statusText;
                try {
                    const errorBody = await response.json();
                    if (errorBody?.message) {
                        errorMessage = errorBody.message;
                    }
                }
                catch {
                    // Ignore JSON parse errors on error responses
                }
                if (response.status === 404) {
                    throw new ApiError(404, `GitHub resource not found at '${endpoint}'`);
                }
                if (response.status === 401) {
                    throw new ApiError(401, "Invalid GitHub credentials or authentication required");
                }
                if (response.status === 403) {
                    throw new ApiError(403, `GitHub API rate limit exceeded or access forbidden: ${errorMessage}`);
                }
                throw new ApiError(response.status, `GitHub API error (${response.status}): ${errorMessage}`);
            }
            return (await response.json());
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new ApiError(504, `GitHub API request timed out after ${this.timeoutMs}ms`);
            }
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(500, `Failed to communicate with GitHub API: ${error.message}`);
        }
    }
    /**
     * Fetches raw repository metadata from GitHub GET /repos/{owner}/{repo}
     */
    async fetchRepoMetadata(owner, repo, customToken) {
        const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
        return await this.get(endpoint, customToken);
    }
}
export const githubClient = new GitHubClient();
