
import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { db } from "../db.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { sendOrderStatusEmail } from "../lib/mailer.js";
import { userIdFilter } from "../utils/user-filter.js";

function getRouteParam(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `Invalid ${label}.`);
  }
  return value;
}

export const ordersRouter = Router();

ordersRouter.post("/", authenticate, allowRoles("customer", "vendor"), asyncHandler(async (req, res) => {
  const data = z.object({
    itemId: z.string().refine((value) => ObjectId.isValid(value)),
    deliveryDate: z.string().min(8),
    deliveryAddress: z.string().trim().min(1, "Delivery address is required.").max(500),
    message: z.string().max(1000).optional().default(""),
  }).parse(req.body);

  const item = await db.collection("menuItems").findOne({
    _id: new ObjectId(data.itemId),
    status: "approved",
    isAvailable: { $ne: false },
  });
  if (!item) throw new HttpError(404, "This menu item is not available.");
  if (String(item.vendorId) === req.user!.id) {
    throw new HttpError(403, "You cannot order your own menu items.");
  }

  const date = new Date(data.deliveryDate);
  if (
    Number.isNaN(date.getTime()) ||
    date.getTime() < new Date(new Date().toDateString()).getTime()
  ) {
    throw new HttpError(400, "Choose a valid future delivery date.");
  }

  const duplicate = await db.collection("orders").findOne({
    customerId: req.user!.id,
    itemId: data.itemId,
    deliveryDate: data.deliveryDate,
    status: { $in: ["pending", "accepted"] },
  });
  if (duplicate) {
    throw new HttpError(
      409,
      "You already have an active order for this item and delivery date.",
    );
  }

  const vendor = await db.collection("users").findOne(
    userIdFilter(String(item.vendorId)),
    { projection: { name: 1, businessName: 1 } },
  );
  const activeOrderKey = `${req.user!.id}:${data.itemId}:${data.deliveryDate}`;
  const order = {
    activeOrderKey,
    itemId: data.itemId,
    itemName: item.itemName,
    itemImage: item.images?.[0] || "",
    itemPrice: Number(item.price) || 0,
    vendorId: String(item.vendorId),
    vendorName: vendor?.businessName || vendor?.name || "Restaurant",
    customerId: req.user!.id,
    customerName: req.user!.name,
    deliveryDate: data.deliveryDate,
    deliveryAddress: data.deliveryAddress,
    message: data.message,
    status: "pending",
    createdAt: new Date(),
  };

  let insertedId: ObjectId;
  try {
    const result = await db.collection("orders").insertOne(order);
    insertedId = result.insertedId;
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      throw new HttpError(
        409,
        "You already have an active order for this item and delivery date.",
      );
    }
    throw error;
  }

  res.status(201).json({
    message: "Your order request has been sent to the restaurant.",
    order: { ...order, _id: String(insertedId) },
  });
}));

ordersRouter.get("/my", authenticate, allowRoles("customer", "vendor"), asyncHandler(async (req, res) => {
  const orders = await db.collection("orders")
    .find({ customerId: req.user!.id }).sort({ createdAt: -1 }).toArray();
  res.json({ orders: orders.map((order) => ({ ...order, _id: String(order._id) })) });
}));

ordersRouter.patch("/:id/cancel", authenticate, allowRoles("customer"), asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "order ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid order ID.");

  const result = await db.collection("orders").updateOne(
    { _id: new ObjectId(id), customerId: req.user!.id, status: "pending" },
    {
      $set: { status: "cancelled", updatedAt: new Date() },
      $unset: { activeOrderKey: "" },
    },
  );
  if (!result.modifiedCount) {
    throw new HttpError(409, "Only your pending orders can be cancelled.");
  }
  res.json({ message: "Order cancelled." });
}));

export const vendorOrdersRouter = Router();

vendorOrdersRouter.get("/", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const orders = await db.collection("orders")
    .find({ vendorId: req.user!.id }).sort({ createdAt: -1 }).toArray();
  res.json({ orders: orders.map((order) => ({ ...order, _id: String(order._id) })) });
}));

vendorOrdersRouter.patch("/:id/status", authenticate, allowRoles("vendor"), asyncHandler(async (req, res) => {
  const id = getRouteParam(req.params.id, "order ID");
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid order ID.");
  const status = z.enum(["accepted", "rejected"]).parse(req.body.status);

  const order = await db.collection("orders").findOne({
    _id: new ObjectId(id),
    vendorId: req.user!.id,
    status: "pending",
  });
  if (!order) {
    throw new HttpError(
      409,
      "Only your pending orders can be accepted or rejected, and only once.",
    );
  }

  const result = await db.collection("orders").updateOne(
    { _id: order._id, vendorId: req.user!.id, status: "pending" },
    {
      $set: { status, updatedAt: new Date() },
      ...(status === "rejected" ? { $unset: { activeOrderKey: "" } } : {}),
    },
  );
  if (!result.modifiedCount) {
    throw new HttpError(409, "This order was already updated.");
  }

  const customer = await db.collection("users").findOne(
    userIdFilter(String(order.customerId)),
    { projection: { email: 1, name: 1 } },
  );
  if (customer?.email) {
    try {
      await sendOrderStatusEmail(
        customer.email,
        customer.name || "Pizza lover",
        order.itemName,
        status,
      );
    } catch (error) {
      console.error("Order email notification failed:", error);
    }
  }

  res.json({ message: `Order ${status}.` });
}));
