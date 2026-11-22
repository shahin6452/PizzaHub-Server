import { Router } from "express";
import type Stripe from "stripe";
import { authenticate,allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { stripe } from "../lib/stripe.js";
import { env } from "../config/env.js"
import { db } from "../db.js";
import { userIdFilter } from "../utils/user-filter.js";
export const subscriptionsRouter=Router();
async function applyVendorPlan(vendorId:string, plan:"free"|"premium", expiresAt:Date|null){
 await db.collection("users").updateOne(userIdFilter(vendorId),{$set:{subscriptionPlan:plan,subscriptionExpiresAt:expiresAt,updatedAt:new Date()}});
 if(plan==="premium"){
  // Restore items that were automatically paused only because the vendor downgraded to Free.
  await db.collection("menuItems").updateMany({vendorId,status:"approved",disabledByPlanLimit:true},{$set:{isAvailable:true,updatedAt:new Date()},$unset:{disabledByPlanLimit:""}});
  return;
 }
 const active=await db.collection("menuItems").find({vendorId,status:"approved",isAvailable:true}).sort({createdAt:1}).toArray();
 const excess=active.slice(3).map(item=>item._id);
 if(excess.length)await db.collection("menuItems").updateMany({_id:{$in:excess}},{$set:{isAvailable:false,disabledByPlanLimit:true,updatedAt:new Date()}});
}

subscriptionsRouter.post("/checkout",authenticate,allowRoles("vendor"),asyncHandler(async(req,res)=>{if(!stripe)throw new HttpError(503,"Stripe is not configured yet.");if(!env.STRIPE_PREMIUM_PRICE_ID)throw new HttpError(503,"Premium subscription price is not configured.");const user=await db.collection("users").findOne(userIdFilter(req.user!.id));if(user?.subscriptionPlan==="premium"&&user?.subscriptionExpiresAt&&new Date(user.subscriptionExpiresAt)>new Date())throw new HttpError(409,"Your Premium subscription is already active.");const session=await stripe.checkout.sessions.create({mode:"subscription",line_items:[{price:env.STRIPE_PREMIUM_PRICE_ID,quantity:1}],customer_email:req.user!.email,client_reference_id:req.user!.id,metadata:{vendorId:req.user!.id,plan:"premium"},subscription_data:{metadata:{vendorId:req.user!.id,plan:"premium"}},success_url:`${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${env.CLIENT_URL}/payment/cancel`});res.json({url:session.url});}));
export async function stripeWebhookHandler(rawBody:Buffer,signature:string|undefined){if(!stripe||!env.STRIPE_WEBHOOK_SECRET)throw new HttpError(503,"Stripe webhook is not configured.");if(!signature)throw new HttpError(400,"Missing Stripe signature.");let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(rawBody,signature,env.STRIPE_WEBHOOK_SECRET);}catch{throw new HttpError(400,"Invalid Stripe webhook signature.");}
 if(event.type==="checkout.session.completed"){
  const session=event.data.object as Stripe.Checkout.Session;const vendorId=session.metadata?.vendorId||session.client_reference_id;
  if(vendorId&&session.mode==="subscription"&&session.payment_status==="paid"){
   let expiresAt:Date|undefined;const subscriptionId=typeof session.subscription==="string"?session.subscription:session.subscription?.id;
   if(subscriptionId){const sub=await stripe.subscriptions.retrieve(subscriptionId);const periodEnd=(sub as unknown as {current_period_end?:number}).current_period_end;if(periodEnd)expiresAt=new Date(periodEnd*1000);}
   await applyVendorPlan(vendorId,"premium",expiresAt||new Date(Date.now()+30*86400000));await db.collection("users").updateOne(userIdFilter(vendorId),{$set:{stripeCustomerId:typeof session.customer==="string"?session.customer:session.customer?.id}});
   await db.collection("transactions").updateOne({stripeSessionId:session.id},{$set:{vendorId,plan:"premium",amount:(session.amount_total||0)/100,currency:(session.currency||"bdt").toUpperCase(),stripeSessionId:session.id,stripeSubscriptionId:subscriptionId||"",status:"paid"},$setOnInsert:{createdAt:new Date()}},{upsert:true});
  }
 }
 if(event.type==="customer.subscription.deleted"){
  const sub=event.data.object as Stripe.Subscription;const vendorId=sub.metadata?.vendorId;
  if(vendorId)await applyVendorPlan(vendorId,"free",null);
  await db.collection("transactions").updateMany({stripeSubscriptionId:sub.id},{$set:{status:"cancelled"}});
 }
 if(event.type==="customer.subscription.updated"){
  const sub=event.data.object as Stripe.Subscription;const vendorId=sub.metadata?.vendorId;const periodEnd=(sub as unknown as {current_period_end?:number}).current_period_end;
  if(vendorId){const active=["active","trialing"].includes(sub.status);await applyVendorPlan(vendorId,active?"premium":"free",active&&periodEnd?new Date(periodEnd*1000):null);await db.collection("transactions").updateMany({stripeSubscriptionId:sub.id},{$set:{status:active?"paid":"past_due"}});}
 }
 return {received:true};
}

subscriptionsRouter.post("/portal",authenticate,allowRoles("vendor"),asyncHandler(async(req,res)=>{if(!stripe)throw new HttpError(503,"Stripe is not configured yet.");const user=await db.collection("users").findOne(userIdFilter(req.user!.id));if(!user?.stripeCustomerId)throw new HttpError(404,"No Stripe customer is linked to this vendor account.");const portal=await stripe.billingPortal.sessions.create({customer:String(user.stripeCustomerId),return_url:`${env.CLIENT_URL}/subscription`});res.json({url:portal.url});}));
