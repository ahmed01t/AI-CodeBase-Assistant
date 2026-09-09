import { Router } from "express";
import { supabase } from "../lib/supabase.js";
const router = Router();
router.get("/", async (_req, res) => {
    const { error } = await supabase
        .from("organizations")
        .select("id")
        .limit(1);
    if (error) {
        return res.status(503).json({
            success: false,
            message: "Database connection failed",
            error: error.message,
        });
    }
    return res.status(200).json({
        success: true,
        message: "API and database are healthy",
    });
});
export default router;
