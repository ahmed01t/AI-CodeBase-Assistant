import { organizationMemberService } from "./organization-member.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
/**
 * Organization Member Controller
 * Handles HTTP requests for organization member operations.
 * Extracts parameters and authenticated identity from req context, delegating logic to the service layer.
 */
/**
 * Handles GET /api/v1/organizations/:organizationId/members (List Members)
 */
export async function listMembers(req, res, next) {
    try {
        const token = req.token;
        const requesterUserId = req.userId;
        const organizationId = req.params.organizationId;
        const members = await organizationMemberService.listMembers(token, organizationId, requesterUserId);
        return res
            .status(200)
            .json(new ApiResponse(200, members, "Organization members retrieved successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles POST /api/v1/organizations/:organizationId/members (Add Member)
 */
export async function addMember(req, res, next) {
    try {
        const token = req.token;
        const requesterUserId = req.userId;
        const organizationId = req.params.organizationId;
        const input = req.body;
        const newMember = await organizationMemberService.addMember(token, organizationId, requesterUserId, input);
        return res
            .status(201)
            .json(new ApiResponse(201, newMember, "Organization member added successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles PATCH /api/v1/organizations/:organizationId/members/:userId (Update Role)
 */
export async function updateMemberRole(req, res, next) {
    try {
        const token = req.token;
        const requesterUserId = req.userId;
        const organizationId = req.params.organizationId;
        const targetUserId = req.params.userId;
        const input = req.body;
        const updatedMember = await organizationMemberService.updateMemberRole(token, organizationId, targetUserId, requesterUserId, input);
        return res
            .status(200)
            .json(new ApiResponse(200, updatedMember, "Member role updated successfully"));
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handles DELETE /api/v1/organizations/:organizationId/members/:userId (Remove Member)
 */
export async function removeMember(req, res, next) {
    try {
        const token = req.token;
        const requesterUserId = req.userId;
        const organizationId = req.params.organizationId;
        const targetUserId = req.params.userId;
        const deletedMember = await organizationMemberService.removeMember(token, organizationId, targetUserId, requesterUserId);
        return res
            .status(200)
            .json(new ApiResponse(200, deletedMember, "Organization member removed successfully"));
    }
    catch (error) {
        next(error);
    }
}
