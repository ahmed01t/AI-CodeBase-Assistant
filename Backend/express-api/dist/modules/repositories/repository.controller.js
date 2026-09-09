import { repositoryService } from "./repository.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
/**
 * Repository Controller
 * Handles HTTP requests and responses for the Repository module.
 * Extracts parameters and Bearer token, calling RepositoryService and returning structured ApiResponse payloads.
 */
/**
 * Handles POST /api/v1/repositories (Create Repository Record)
 */
export async function createRepository(req, res, next) {
    try {
        const token = req.token;
        const input = req.body;
        const repository = await repositoryService.createRepository(token, input);
        return res
            .status(201)
            .json(new ApiResponse(201, repository, "Repository record created successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles GET /api/v1/repositories (List Repositories for a Project or User)
 */
export async function listRepositories(req, res, next) {
    try {
        const token = req.token;
        // Supports query parameter ?project_id=... or route param :projectId
        const projectId = (req.query.project_id || req.params.projectId);
        const repositories = await repositoryService.listRepositories(token, projectId);
        return res
            .status(200)
            .json(new ApiResponse(200, repositories, "Repositories retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles GET /api/v1/repositories/:id (Get Repository by ID)
 */
export async function getRepository(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const repository = await repositoryService.getRepositoryById(token, id);
        return res
            .status(200)
            .json(new ApiResponse(200, repository, "Repository retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles DELETE /api/v1/repositories/:id (Delete Repository)
 */
export async function deleteRepository(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const deletedRepository = await repositoryService.deleteRepository(token, id);
        return res
            .status(200)
            .json(new ApiResponse(200, deletedRepository, "Repository deleted successfully"));
    }
    catch (error) {
        next(error);
    }
}
