import { MongoClient, Db } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export function getMongoDatabaseName(): string {
  return env.DB_NAME || env.MONGODB_DB_NAME || "codebase-assistant";
}

/**
 * Safely percent-encodes credentials in MongoDB URI if special characters like '@' are present.
 */
function sanitizeMongoUri(rawUri: string): string {
  const protocolMatch = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
  if (!protocolMatch) return rawUri;

  const protocol = protocolMatch[1];
  const rest = protocolMatch[2];

  const lastAtIdx = rest.lastIndexOf("@");
  if (lastAtIdx === -1) return rawUri;

  const userPassPart = rest.substring(0, lastAtIdx);
  const hostAndOptions = rest.substring(lastAtIdx + 1);

  const colonIdx = userPassPart.indexOf(":");
  if (colonIdx === -1) return rawUri;

  const username = userPassPart.substring(0, colonIdx);
  let password = userPassPart.substring(colonIdx + 1);

  try {
    const decodedPassword = decodeURIComponent(password);
    password = encodeURIComponent(decodedPassword);
  } catch {
    password = encodeURIComponent(password);
  }

  return `${protocol}${username}:${password}@${hostAndOptions}`;
}

/**
 * Initializes and verifies the MongoDB database connection.
 * Prints a clean status message on the terminal.
 */
export async function initMongoDb(): Promise<Db | null> {
  const rawUri = env.MONGODB_URI;
  if (!rawUri || (!rawUri.startsWith("mongodb://") && !rawUri.startsWith("mongodb+srv://"))) {
    console.warn("⚠ [MongoDB] No valid MONGODB_URI found in environment. Running in disconnected mode.");
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  const dbName = getMongoDatabaseName();
  const uri = sanitizeMongoUri(rawUri);

  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();

    // Ping the database to verify active connection
    dbInstance = client.db(dbName);
    await dbInstance.command({ ping: 1 });

    console.log(`\x1b[32m✓ [MongoDB] Connected successfully to database: "${dbName}"\x1b[0m`);
    return dbInstance;
  } catch (error: any) {
    console.error(`\x1b[31m✗ [MongoDB] Database connection error ("${dbName}"): ${error?.message || error}\x1b[0m`);
    return null;
  }
}

/**
 * Connects lazily to MongoDB and returns the database instance.
 */
export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) {
    return dbInstance;
  }
  return await initMongoDb();
}

/**
 * Closes the MongoDB connection on graceful shutdown
 */
export async function closeMongoDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log("ℹ [MongoDB] Connection closed.");
  }
}
