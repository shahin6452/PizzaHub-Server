import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authenticate,allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { userIdFilter } from "../utils/user-filter.js";
export const usersRouter=Router();
usersRouter.post("/choose-role",authenticate,allowRoles("customer"),asyncHandler(async(req,res)=>{
 const {role,businessName}=z.object({role:z.enum(["customer","vendor"]),businessName:z.string().max(100).optional()}).parse(req.body);
 const user=await db.collection("users").findOne(userIdFilter(req.user!.id));
 if(!user)throw new HttpError(404,"Account not found.");
 const createdAt=new Date(user.createdAt||0).getTime();
 if(Date.now()-createdAt>15*60*1000)throw new HttpError(403,"Account role can only be selected during initial registration. Contact support for changes.");
 await db.collection("users").updateOne({_id:user._id},{$set:{role,businessName:role==="vendor"?(businessName?.trim()||user.businessName||""):null,updatedAt:new Date()}});
 res.json({message:"Account type saved.",role});
}));
