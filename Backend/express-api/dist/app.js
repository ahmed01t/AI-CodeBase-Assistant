import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
const app = express();
app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
// app.get("/api/v1/health", (_req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "AI Codebase Assistant API is running",
//   });
// });
app.use("/api/v1", routes);
export default app;
