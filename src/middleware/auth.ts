import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";
import { db } from "../db.js";
import { HttpError } from "../utils/http-error.js";
import { userIdFilter } from "../utils/user-filter.js";

declare global { namespace Express { interface Request { user?: { id:string; email:string; name:string; role:"customer"|"vendor"|"admin"; isBlocked:boolean; businessName?:string; subscriptionPlan?:string; subscriptionExpiresAt?:Date }; jwtPayload?: JWTPayload } } }
const jwks = createRemoteJWKSet(new URL("/api/auth/jwks", env.API_PUBLIC_URL));
export async function authenticate(req:Request,_res:Response,next:NextFunction){
 try{
  const header=req.headers.authorization;
  if(!header?.startsWith("Bearer "))throw new HttpError(401,"Authentication token is required.");
  const token=header.slice(7);
  const {payload}=await jwtVerify(token,jwks,{issuer:env.BETTER_AUTH_URL,audience:env.BETTER_AUTH_URL});
  if(typeof payload.sub!=="string")throw new HttpError(401,"Invalid authentication token.");
  const user=await db.collection("users").findOne(userIdFilter(payload.sub));
  if(!user)throw new HttpError(401,"Account not found.");
  if(user.isBlocked===true)throw new HttpError(403,"This account is blocked. Contact support.");
  const role=(user.role||"customer") as "customer"|"vendor"|"admin";
  req.user={id:payload.sub,email:String(user.email),name:String(user.name||"User"),role,isBlocked:Boolean(user.isBlocked),businessName:user.businessName,subscriptionPlan:user.subscriptionPlan||"free",subscriptionExpiresAt:user.subscriptionExpiresAt};
  req.jwtPayload=payload;next();
 }catch(error){next(error instanceof HttpError?error:new HttpError(401,"Invalid or expired authentication token."));}
}
export function allowRoles(...roles:Array<"customer"|"vendor"|"admin">){return(req:Request,_res:Response,next:NextFunction)=>{if(!req.user)return next(new HttpError(401,"Authentication required."));if(!roles.includes(req.user.role))return next(new HttpError(403,"You do not have permission to access this resource."));next();};}
