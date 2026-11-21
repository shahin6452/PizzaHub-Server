import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { db, mongoClient } from "../db.js";
import { env } from "../config/env.js";

export const auth = betterAuth({
  appName: "PizzaHub",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: env.MONGODB_USE_TRANSACTIONS === "true" ? mongodbAdapter(db, { client: mongoClient }) : mongodbAdapter(db),
  trustedOrigins: [env.CLIENT_URL],
  emailAndPassword: { enabled: true, minPasswordLength: 6, autoSignIn: true },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const password = String(ctx.body?.password || "");
        if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
          throw new APIError("BAD_REQUEST", { message: "Password must be at least 6 characters and include one uppercase and one lowercase letter." });
        }
      }
    }),
  },
  socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, mapProfileToUser: (profile) => ({ image: profile.picture }) },
  } : {},
  user: {
    modelName: "users",
    additionalFields: {
      role: { type: ["customer", "vendor", "admin"], required: false, defaultValue: "customer", input: false },
      isBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
      businessName: { type: "string", required: false, input: false },
      businessDescription: { type: "string", required: false, input: false },
      businessLocation: { type: "string", required: false, input: false },
      businessPhone: { type: "string", required: false, input: false },
      subscriptionPlan: { type: "string", required: false, defaultValue: "free", input: false },
      subscriptionExpiresAt: { type: "date", required: false, input: false },
      favorites: { type: "string[]", required: false, defaultValue: [], input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            // Public sign-up may select only customer/vendor. Admin is granted by seed/admin flow only.
            role: user.role === "vendor" ? "vendor" : "customer",
            isBlocked: false,
            subscriptionPlan: "free",
            favorites: [],
          },
        }),
      },
    },
  },
  advanced: { defaultCookieAttributes: env.NODE_ENV === "production" ? { sameSite: "none", secure: true, httpOnly: true } : { sameSite: "lax", secure: false, httpOnly: true } },
  plugins: [jwt({
    jwt: {
      issuer: env.BETTER_AUTH_URL,
      audience: env.BETTER_AUTH_URL,
      expirationTime: "15m",
      definePayload: ({ user }) => ({
        sub: user.id,
        email: user.email,
        role: (user as typeof user & { role?: string }).role || "customer",
      }),
    },
    jwks: { rotationInterval: 60 * 60 * 24 * 30, gracePeriod: 60 * 60 * 24 * 30 },
  })],
});
