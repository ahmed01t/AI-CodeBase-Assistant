import { Router } from "express";
import healthRouter from "./health.routes.js";
import organizationRouter from "../modules/organizations/organization.routes.js";
import projectRouter from "../modules/projects/project.routes.js";
import repositoryRouter from "../modules/repositories/repository.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/organizations", organizationRouter);
router.use("/projects", projectRouter);
router.use("/repositories", repositoryRouter);

export default router;