import { MongoClient, type Db } from "mongodb";
import { env } from "./config/env.js";
export const mongoClient = new MongoClient(env.MONGODB_URI, { maxPoolSize: 20, serverSelectionTimeoutMS: 10000 });
export const db: Db = mongoClient.db(env.MONGODB_DB_NAME);
let connected = false;
export async function connectDatabase() {
  if (connected) return db;
  await mongoClient.connect();
  await db.command({ ping: 1 });
  await Promise.all([
    db.collection("menuItems").createIndex({ status: 1, isAvailable: 1, category: 1, price: 1 }),
    db.collection("menuItems").createIndex({ itemName: "text", description: "text" }),
    db.collection("menuItems").createIndex({ vendorId: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ customerId: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ vendorId: 1, status: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ activeOrderKey: 1 }, { unique: true, sparse: true }),
    db.collection("transactions").createIndex({ stripeSessionId: 1 }, { unique: true, sparse: true }),
    db.collection("transactions").createIndex({ vendorId: 1, createdAt: -1 }),
  ]);
  connected = true;
  console.log(`MongoDB connected: ${env.MONGODB_DB_NAME}`);
  return db;
}
