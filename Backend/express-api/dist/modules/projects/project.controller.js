import { projectService } from "./project.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
/**
 * Project Controller
 * Handles HTTP request and response concerns only.
 * Extracts parameters and headers, calls ProjectService, and returns structured ApiResponse outputs.
 */
/**
 * Handles POST /api/v1/projects (Create Project)
 */
export async function createProject(req, res, next) {
    try {
        const token = req.token;
        const input = req.body;
        const project = await projectService.createProject(token, input);
        return res
            .status(201)
            .json(new ApiResponse(201, project, "Project created successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles GET /api/v1/projects (List Accessible Projects)
 */
export async function listProjects(req, res, next) {
    try {
        const token = req.token;
        const organizationId = req.query.organization_id;
        const projects = await projectService.listProjects(token, organizationId);
        return res
            .status(200)
            .json(new ApiResponse(200, projects, "Projects retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles GET /api/v1/projects/:id (Get Single Project)
 */
export async function getProject(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const project = await projectService.getProjectById(token, id);
        return res
            .status(200)
            .json(new ApiResponse(200, project, "Project retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles PATCH /api/v1/projects/:id (Update Project)
 */
export async function updateProject(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const input = req.body;
        const updatedProject = await projectService.updateProject(token, id, input);
        return res
            .status(200)
            .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles DELETE /api/v1/projects/:id (Delete Project)
 */
export async function deleteProject(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const deletedProject = await projectService.deleteProject(token, id);
        return res
            .status(200)
            .json(new ApiResponse(200, deletedProject, "Project deleted successfully"));
    }
    catch (error) {
        next(error);
    }
}
