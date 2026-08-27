import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as { userId: string }).userId;

  return res.json({
    success: true,
    message: "Authenticated request",
    userId,
  });
});

export default router;