import { organizationService, AppError } from "./organization.service.js";
/**
 * Organization Controller
 * Handles HTTP concerns only (extracting request parameters, invoking services, returning responses).
 * Delegates all business logic and database access to the Service and Repository layers.
 */
/**
 * Handles POST /api/v1/organizations (Create Organization)
 */
export async function createOrganization(req, res, next) {
    try {
        const token = req.token;
        const input = req.body;
        const organization = await organizationService.createOrganization(token, input);
        return res.status(201).json({
            success: true,
            message: "Organization created successfully",
            data: organization,
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
}
/**
 * Handles GET /api/v1/organizations (List Accessible Organizations)
 */
export async function listOrganizations(req, res, next) {
    try {
        const token = req.token;
        const organizations = await organizationService.listOrganizations(token);
        return res.status(200).json({
            success: true,
            data: organizations,
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
}
/**
 * Handles GET /api/v1/organizations/:id (Get Single Organization)
 */
export async function getOrganization(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const organization = await organizationService.getOrganizationById(token, id);
        return res.status(200).json({
            success: true,
            data: organization,
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
}
/**
 * Handles PATCH /api/v1/organizations/:id (Update Organization)
 */
export async function updateOrganization(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const input = req.body;
        const updatedOrganization = await organizationService.updateOrganization(token, id, input);
        return res.status(200).json({
            success: true,
            message: "Organization updated successfully",
            data: updatedOrganization,
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
}
/**
 * Handles DELETE /api/v1/organizations/:id (Delete Organization)
 */
export async function deleteOrganization(req, res, next) {
    try {
        const token = req.token;
        const id = req.params.id;
        const deletedOrganization = await organizationService.deleteOrganization(token, id);
        return res.status(200).json({
            success: true,
            message: "Organization deleted successfully",
            data: deletedOrganization,
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        next(error);
    }
}
