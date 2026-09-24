import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
const app = express();
app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use("/api/v1", routes);
// Global Error Handler Middleware
app.use(errorHandler);
export default app;
