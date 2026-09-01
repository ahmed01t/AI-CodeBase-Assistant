import type { Request, Response, NextFunction } from "express";
import { organizationService } from "./organization.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "./organization.types.js";

/**
 * Organization Controller
 * Handles HTTP concerns only (extracting request parameters, invoking services, returning responses).
 * Delegates all business logic and database access to the Service and Repository layers.
 */

/**
 * Handles POST /api/v1/organizations (Create Organization)
 */
export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const userId = req.userId!;
    const input: CreateOrganizationInput = req.body;

    const organization = await organizationService.createOrganization(token, input, userId);

    return res
      .status(201)
      .json(new ApiResponse(201, organization, "Organization created successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Handles GET /api/v1/organizations (List Accessible Organizations)
 */
export async function listOrganizations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;

    const organizations = await organizationService.listOrganizations(token);

    return res
      .status(200)
      .json(new ApiResponse(200, organizations, "Organizations retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Handles GET /api/v1/organizations/:id (Get Single Organization)
 */
export async function getOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const id = req.params.id as string;

    const organization = await organizationService.getOrganizationById(token, id);

    return res
      .status(200)
      .json(new ApiResponse(200, organization, "Organization retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Handles PATCH /api/v1/organizations/:id (Update Organization)
 */
export async function updateOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const id = req.params.id as string;
    const input: UpdateOrganizationInput = req.body;

    const updatedOrganization = await organizationService.updateOrganization(
      token,
      id,
      input
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedOrganization, "Organization updated successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Handles DELETE /api/v1/organizations/:id (Delete Organization)
 */
export async function deleteOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.token!;
    const id = req.params.id as string;

    const deletedOrganization = await organizationService.deleteOrganization(token, id);

    return res
      .status(200)
      .json(new ApiResponse(200, deletedOrganization, "Organization deleted successfully"));
  } catch (error) {
    next(error);
  }
}
