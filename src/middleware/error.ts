
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    message: "API route not found.",
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(error);

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    const firstError = errors[0];

    const message = firstError
      ? `${firstError.path ? `${firstError.path}: ` : ""}${firstError.message}`
      : "Invalid request data.";

    return res.status(400).json({
      message,
      errors,
    });
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "MulterError"
  ) {
    return res.status(400).json({
      message:
        "Image upload failed. Please check the file type and 5 MB size limit.",
    });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";

  return res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected server error occurred."
        : message,
  });
}
