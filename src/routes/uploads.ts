import { Router } from "express";
import multer from "multer";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

export const uploadsRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new HttpError(400, "Only image files are allowed."));
    cb(null, true);
  },
});

async function uploadToImgBB(file: Express.Multer.File): Promise<string> {
  if (!env.IMGBB_API_KEY) throw new HttpError(503, "ImgBB is not configured yet.");
  const form = new FormData();
  form.append("key", env.IMGBB_API_KEY);
  form.append("image", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
  const response = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
  const result = await response.json() as { success: boolean; data?: { url: string }; error?: { message: string } };
  if (!response.ok || !result.success || !result.data?.url) {
    throw new HttpError(502, result.error?.message || "Image upload failed.");
  }
  return result.data.url;
}

uploadsRouter.post("/menu-image", authenticate, allowRoles("vendor"), upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Please select an image file.");
  const url = await uploadToImgBB(req.file);
  res.status(201).json({ url });
}));

// Profile images are optional; menu-item images remain required by the assignment.
uploadsRouter.post("/profile-image", authenticate, allowRoles("customer", "vendor", "admin"), upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Please select an image file.");
  const url = await uploadToImgBB(req.file);
  res.status(201).json({ url });
}));
