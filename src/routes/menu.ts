import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { db } from "../db.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { userIdFilters } from "../utils/user-filter.js";

export const menuRouter = Router();

function getRouteParam(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `Invalid ${label}.`)
  }
  return value;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const menuSchema = z.object({
  itemName: z.string().min(2).max(100),
  category: z.enum([
    "Classic Pizzas",
    "Vegetarian Pizzas",
    "Meat Lovers",
    "Specialty / Gourmet Pizzas",
    "Sides & Appetizers",
    "Beverages & Desserts",
  ]),
  description: z.string().min(10).max(1500),
  price: z.number().positive(),
  location: z.string().min(2).max(120),
  images: z.array(z.string().url()).min(1).max(5),
});

async function attachVendor(items: any[]) {
  const ids = [...new Set(items.map((item) => String(item.vendorId)))];
  const users = await db.collection("users").find(
    ids.length ? userIdFilters(ids) : { _id: { $exists: false } },
    {
      projection: {
        name: 1,
        businessName: 1,
        businessDescription: 1,
        businessLocation: 1,
        businessPhone: 1,
        subscriptionPlan: 1,
        id: 1,
      },
    },
  ).toArray();

  const lookup = new Map<string, any>();
  for (const user of users) {
    lookup.set(String(user._id), user);
    if (user.id) lookup.set(String(user.id), user);
  }

  return items.map((item) => {
    const vendor = lookup.get(String(item.vendorId));
    return {
      ...item,
      _id: String(item._id),
      vendorName: vendor?.businessName || vendor?.name || "Local kitchen",
      vendorInfo: vendor ? {
        name: vendor.businessName || vendor.name || "Local kitchen",
        description: vendor.businessDescription || "",
        location: vendor.businessLocation || "",
        phone: vendor.businessPhone || "",
      } : undefined,
      isPremiumVendor: vendor?.subscriptionPlan === "premium",
    };
  });
}

menuRouter.get("/", asyncHandler(async (req, res) => {
  const search = String(req.query.search || "");
  const category = String(req.query.category || "");
  const location = String(req.query.location || "");
  const sort = String(req.query.sort || "newest");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));

  const filter: Record<string, any> = {
    status: "approved",
    isAvailable: { $ne: false },
  };
  if (category && category !== "All") filter.category = category;
  if (location) {
    filter.location = { $regex: escapeRegex(location), $options: "i" };
  }
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { itemName: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const sortSpec: Record<string, 1 | -1> =
    sort === "price-asc" ? { price: 1 } :
    sort === "price-desc" ? { price: -1 } :
    { createdAt: -1 };

  const [items, total] = await Promise.all([
    db.collection("menuItems").find(filter).sort(sortSpec)
      .skip((page - 1) * limit).limit(limit).toArray(),
    db.collection("menuItems").countDocuments(filter),
  ]);

  const enriched = await attachVendor(items);
  if (sort !== "price-asc" && sort !== "price-desc") {
    enriched.sort(
      (a: any, b: any) =>
        Number(Boolean(b.isPremiumVendor)) - Number(Boolean(a.isPremiumVendor)),
    );
  }
  res.json({ items: enriched, total, page, pages: Math.ceil(total / limit) });
}));

menuRouter.get("/mine", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const items = await db.collection("menuItems")
    .find({ vendorId: req.user!.id }).sort({ createdAt: -1 }).toArray();
  res.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}));

menuRouter.get("/:id", asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "menu item ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid menu item ID.");

  const item = await db.collection("menuItems").findOne({
    _id: new ObjectId(id),
    status: "approved",
    isAvailable: { $ne: false },
  });
  if (!item) {
    throw new HttpError(404, "Menu item is unavailable or does not exist.");
  }
  const [withVendor] = await attachVendor([item]);
  res.json({ item: withVendor });
}));

menuRouter.post("/", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const data = menuSchema.parse(req.body);
  const doc = {
    ...data,
    vendorId: req.user!.id,
    status: "pending",
    isAvailable: true,
    reviews: [],
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection("menuItems").insertOne(doc);
  res.status(201).json({
    message: "Menu item submitted for admin approval.",
    item: { ...doc, _id: String(result.insertedId) },
  });
}));

menuRouter.put("/:id", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "menu item ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid menu item ID.");
  const data = menuSchema.partial().parse(req.body);

  const result = await db.collection("menuItems").updateOne(
    { _id: new ObjectId(id), vendorId: req.user!.id },
    { $set: { ...data, status: "pending", updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new HttpError(404, "Menu item not found.");
  res.json({ message: "Changes saved and sent for review." });
}));

menuRouter.delete("/:id", authenticate, allowRoles("vendor", "admin"), asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "menu item ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid menu item ID.");
  const filter: Record<string, any> = { _id: new ObjectId(id) };
  if (req.user!.role === "vendor") filter.vendorId = req.user!.id;

  const result = await db.collection("menuItems").deleteOne(filter);
  if (!result.deletedCount) {
    throw new HttpError(404, "Menu item not found or not owned by you.");
  }
  res.json({ message: "Menu item deleted." });
}));

menuRouter.patch("/:id/availability", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "menu item ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid menu item ID.");
  const available = z.boolean().parse(req.body.isAvailable);

  const item = await db.collection("menuItems").findOne({
    _id: new ObjectId(id),
    vendorId: req.user!.id,
  });
  if (!item) throw new HttpError(404, "Menu item not found.");
  if (available && item.status !== "approved") {
    throw new HttpError(400, "Only approved items can be made available.");
  }

  if (available && req.user!.subscriptionPlan !== "premium") {
    const count = await db.collection("menuItems").countDocuments({
      vendorId: req.user!.id,
      status: "approved",
      isAvailable: true,
    });
    if (count >= 3 && !item.isAvailable) {
      throw new HttpError(
        403,
        "Free plan allows only 3 active menu items. Upgrade to Premium.",
      );
    }
  }

  await db.collection("menuItems").updateOne(
    { _id: item._id },
    {
      $set: { isAvailable: available, updatedAt: new Date() },
      $unset: { disabledByPlanLimit: "" },
    },
  );
  res.json({ message: "Availability updated." });
}));
