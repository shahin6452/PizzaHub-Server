import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db.js";
import { menuRouter } from "./routes/menu.js";
import { ordersRouter, vendorOrdersRouter } from "./routes/orders.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { adminRouter } from "./routes/admin.js";
import { subscriptionsRouter, stripeWebhookHandler } from "./routes/subscriptions.js";
import { uploadsRouter } from "./routes/uploads.js";
import { favoritesRouter, reviewsRouter } from "./routes/community.js";
import { usersRouter } from "./routes/users.js";
import { vendorRouter } from "./routes/vendor.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
}));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/token",
});

const tokenRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api/auth", authRateLimit);
app.use("/api/auth/token", tokenRateLimit);

// Better Auth must receive the untouched request stream.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe webhook requires the original raw request body.
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const signatureHeader = req.headers["stripe-signature"];
      const signature = Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader;

      const result = await stripeWebhookHandler(req.body as Buffer, signature);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "PizzaHub API",
    time: new Date().toISOString(),
  });
});

app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/vendor/orders", vendorOrdersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/admin", adminRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/users", usersRouter);
app.use("/api/vendor", vendorRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/reviews", reviewsRouter);

app.use(notFound);
app.use(errorHandler);

await connectDatabase();
app.listen(env.PORT, () => {
  console.log(`PizzaHub API listening on port ${env.PORT}`);
});
