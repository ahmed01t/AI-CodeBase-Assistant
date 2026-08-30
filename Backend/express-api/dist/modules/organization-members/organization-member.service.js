import { organizationMemberRepository } from "./organization-member.repository.js";
import { ApiError } from "../../utils/ApiError.js";
/**
 * Organization Member Service
 * Contains business logic and authorization enforcement for membership management.
 * Enforces ownership transfer rules, admin limits, and final owner protections.
 */
export class OrganizationMemberService {
    repository;
    constructor(repository = organizationMemberRepository) {
        this.repository = repository;
    }
    /**
     * Helper function to verify the requester's membership and return their role.
     * Throws 404 if the organization is not found or requester is not a member.
     */
    async getRequesterMembership(token, organizationId, requesterUserId) {
        const membership = await this.repository.findByOrganizationAndUser(token, organizationId, requesterUserId);
        if (!membership) {
            throw new ApiError(404, "Organization not found or access denied");
        }
        return membership;
    }
    /**
     * Lists all members of an organization.
     * Business Logic: Requester must be a member of the organization.
     */
    async listMembers(token, organizationId, requesterUserId) {
        await this.getRequesterMembership(token, organizationId, requesterUserId);
        return await this.repository.findAllByOrganization(token, organizationId);
    }
    /**
     * Adds an existing user to an organization with a specified role.
     * Authorization Rules:
     * - Requester must be an 'owner' or 'admin'.
     * - 'admin' cannot assign the 'owner' role.
     * - User must exist in public.profiles.
     * - User must not already be a member of the organization.
     */
    async addMember(token, organizationId, requesterUserId, input) {
        const requester = await this.getRequesterMembership(token, organizationId, requesterUserId);
        if (requester.role === "member" || requester.role === "viewer") {
            throw new ApiError(403, "Forbidden: Only organization owners and admins can add members");
        }
        if (requester.role === "admin" && input.role === "owner") {
            throw new ApiError(403, "Forbidden: Admins cannot assign the owner role");
        }
        const userExists = await this.repository.userProfileExists(token, input.user_id);
        if (!userExists) {
            throw new ApiError(404, "User profile not found");
        }
        const existingMember = await this.repository.findByOrganizationAndUser(token, organizationId, input.user_id);
        if (existingMember) {
            throw new ApiError(409, "User is already a member of this organization");
        }
        return await this.repository.create(token, {
            organization_id: organizationId,
            user_id: input.user_id,
            role: input.role,
        });
    }
    /**
     * Updates an organization member's role.
     * Authorization Rules:
     * - Requester must be an 'owner' or 'admin'.
     * - 'admin' cannot modify an 'owner' or promote anyone to 'owner'.
     * - Cannot demote the final owner of an organization.
     */
    async updateMemberRole(token, organizationId, targetUserId, requesterUserId, input) {
        const requester = await this.getRequesterMembership(token, organizationId, requesterUserId);
        if (requester.role === "member" || requester.role === "viewer") {
            throw new ApiError(403, "Forbidden: Only organization owners and admins can update member roles");
        }
        const targetMember = await this.repository.findByOrganizationAndUser(token, organizationId, targetUserId);
        if (!targetMember) {
            throw new ApiError(404, "Member not found in this organization");
        }
        if (requester.role === "admin") {
            if (targetMember.role === "owner") {
                throw new ApiError(403, "Forbidden: Admins cannot modify an owner's role");
            }
            if (input.role === "owner") {
                throw new ApiError(403, "Forbidden: Admins cannot promote users to owner");
            }
        }
        if (targetMember.role === "owner" && input.role !== "owner") {
            const ownerCount = await this.repository.countOwners(token, organizationId);
            if (ownerCount <= 1) {
                throw new ApiError(400, "Cannot demote the final owner of the organization");
            }
        }
        const updated = await this.repository.updateRole(token, organizationId, targetUserId, input.role);
        if (!updated) {
            throw new ApiError(400, "Failed to update member role");
        }
        return updated;
    }
    /**
     * Removes a member from an organization.
     * Authorization Rules:
     * - Requester must be an 'owner' or 'admin'.
     * - 'admin' cannot remove an 'owner'.
     * - Cannot remove the final owner of an organization.
     */
    async removeMember(token, organizationId, targetUserId, requesterUserId) {
        const requester = await this.getRequesterMembership(token, organizationId, requesterUserId);
        if (requester.role === "member" || requester.role === "viewer") {
            throw new ApiError(403, "Forbidden: Only organization owners and admins can remove members");
        }
        const targetMember = await this.repository.findByOrganizationAndUser(token, organizationId, targetUserId);
        if (!targetMember) {
            throw new ApiError(404, "Member not found in this organization");
        }
        if (requester.role === "admin" && targetMember.role === "owner") {
            throw new ApiError(403, "Forbidden: Admins cannot remove an organization owner");
        }
        if (targetMember.role === "owner") {
            const ownerCount = await this.repository.countOwners(token, organizationId);
            if (ownerCount <= 1) {
                throw new ApiError(400, "Cannot remove the final owner of the organization");
            }
        }
        const deleted = await this.repository.delete(token, organizationId, targetUserId);
        if (!deleted) {
            throw new ApiError(400, "Failed to remove organization member");
        }
        return deleted;
    }
}
export const organizationMemberService = new OrganizationMemberService();
