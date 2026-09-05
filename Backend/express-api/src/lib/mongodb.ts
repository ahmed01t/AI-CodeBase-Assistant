import { MongoClient, Db } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Connects lazily to MongoDB and returns the database instance.
 * If MONGODB_URI is omitted in environment, returns null to allow fallback handling.
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!env.MONGODB_URI) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (!client) {
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();
    dbInstance = client.db(env.MONGODB_DB_NAME);
  }

  return dbInstance;
}

/**
 * Closes the MongoDB connection on graceful shutdown
 */
export async function closeMongoDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
  }
}

