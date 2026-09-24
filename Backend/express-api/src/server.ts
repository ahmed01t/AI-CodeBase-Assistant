import app from "./app.js";
import { env } from "./config/env.js";
import { initMongoDb, closeMongoDb } from "./lib/mongodb.js";

const server = app.listen(env.PORT, async () => {
  console.log(`\x1b[36m🚀 [API Server] Running on http://localhost:${env.PORT}\x1b[0m`);
  
  // Connect to MongoDB on server startup
  await initMongoDb();
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down...");
  await closeMongoDb();
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  await closeMongoDb();
  server.close(() => {
    process.exit(0);
  });
});