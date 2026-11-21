
import { Router } from "express";
import { ObjectId, type Document, type UpdateFilter } from "mongodb";
import { z } from "zod";
import { db } from "../db.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { userIdFilter } from "../utils/user-filter.js";

function getRouteParam(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `Invalid ${label}.`);
  }
  return value;
}

export const favoritesRouter = Router();

favoritesRouter.post("/:itemId", authenticate, allowRoles("customer"), asyncHandler(async (req, res) => {
  const itemId = getRouteParam(req.params.itemId, "menu item ID");
  if (!ObjectId.isValid(itemId)) throw new HttpError(400, "Invalid menu item ID.");

  const item = await db.collection("menuItems").findOne({
    _id: new ObjectId(itemId),
    status: "approved",
  });
  if (!item) throw new HttpError(404, "Menu item not found.");

  const user = await db.collection("users").findOne(userIdFilter(req.user!.id));
  if (!user?._id) throw new HttpError(404, "User account not found.");

  const favorites = (user.favorites || []) as string[];
  const exists = favorites.includes(itemId);

  if (exists) {
    const update = {
      $pull: { favorites: itemId },
    } as unknown as UpdateFilter<Document>;

    await db.collection("users").updateOne(
      { _id: user._id },
      update,
    );
  } else {
    await db.collection("users").updateOne(
      { _id: user._id },
      { $addToSet: { favorites: itemId } },
    );
  }

  res.json({ saved: !exists });
}));

favoritesRouter.get("/", authenticate, allowRoles("customer"), asyncHandler(async (req, res) => {
  const user = await db.collection("users").findOne(userIdFilter(req.user!.id));
  const ids = (user?.favorites || []) as string[];
  const validIds = ids.filter((id) => ObjectId.isValid(id));

  const items = await db.collection("menuItems").find({
    _id: { $in: validIds.map((id) => new ObjectId(id)) },
  }).toArray();

  res.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}));

export const reviewsRouter = Router();

reviewsRouter.post("/:itemId", authenticate, allowRoles("customer"), asyncHandler(async (req, res) => {
  const itemId = getRouteParam(req.params.itemId, "menu item ID");
  if (!ObjectId.isValid(itemId)) throw new HttpError(400, "Invalid menu item ID.");

  const body = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(700),
  }).parse(req.body);

  const bought = await db.collection("orders").findOne({
    customerId: req.user!.id,
    itemId,
    status: "accepted",
  });

  if (!bought) {
    throw new HttpError(403, "You can review only an item you have ordered.");
  }

  const item = await db.collection("menuItems").findOne({
    _id: new ObjectId(itemId),
    status: "approved",
  });
  if (!item) throw new HttpError(404, "Menu item not found.");

  const review = {
    customerId: req.user!.id,
    customerName: req.user!.name,
    rating: body.rating,
    comment: body.comment,
    createdAt: new Date(),
  };

  const reviews = [
    ...(item.reviews || []).filter(
      (r: any) => r.customerId !== req.user!.id,
    ),
    review,
  ];

  const rating =
    reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
    reviews.length;

  await db.collection("menuItems").updateOne(
    { _id: item._id },
    {
      $set: {
        reviews,
        rating: Number(rating.toFixed(1)),
        reviewCount: reviews.length,
      },
    },
  );

  res.status(201).json({ message: "Thank you for your review." });
}));
