import { githubService } from "./github.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
/**
 * GitHub Controller
 * Handles HTTP requests and responses for the GitHub module.
 * Extracts parameters and delegates logic to GitHubService.
 */
/**
 * Handles GET /api/v1/github/repos/:owner/:repo (Get GitHub Repository Metadata)
 */
export async function getRepoMetadata(req, res, next) {
    try {
        const owner = req.params.owner;
        const repo = req.params.repo;
        // Optionally accept a custom user GitHub token passed in header
        const customToken = req.headers["x-github-token"];
        const metadata = await githubService.getRepoMetadata({
            owner,
            repo,
            customToken,
        });
        return res
            .status(200)
            .json(new ApiResponse(200, metadata, "GitHub repository metadata retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
