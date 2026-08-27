import { Router } from "express";
import healthRouter from "./health.routes.js";
import organizationRouter from "../modules/organizations/organization.routes.js";
const router = Router();
router.use("/health", healthRouter);
router.use("/organizations", organizationRouter);
export default router;
