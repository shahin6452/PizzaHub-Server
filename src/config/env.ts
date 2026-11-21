import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:5000"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default("pizzahub"),
  MONGODB_USE_TRANSACTIONS: z.enum(["true","false"]).default("false"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PREMIUM_PRICE_ID: z.string().optional().default(""),
  IMGBB_API_KEY: z.string().optional().default(""),
  ADMIN_NAME: z.string().optional().default("PizzaHub Admin"),
  ADMIN_EMAIL: z.string().email().optional().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().optional().default(""),
});
export const env = schema.parse(process.env);
