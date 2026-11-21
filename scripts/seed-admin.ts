import { auth } from "../src/lib/auth.js";
import { db,mongoClient } from "../src/db.js";
import { env } from "../src/config/env.js";
import { userIdFilter } from "../src/utils/user-filter.js";
if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<8)throw new Error("Set a strong ADMIN_PASSWORD (at least 8 characters) in .env.");
try{
 await mongoClient.connect();
 const existing=await db.collection("users").findOne({email:env.ADMIN_EMAIL});
 if(existing){await db.collection("users").updateOne({_id:existing._id},{$set:{role:"admin",isBlocked:false}});console.log(`Admin role assigned to ${env.ADMIN_EMAIL}`);}
 else{
  const created=await auth.api.signUpEmail({body:{name:env.ADMIN_NAME,email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD}});
  const userId=(created.user as unknown as {_id?:string;id?:string}).id||(created.user as unknown as {_id?:string})._id;
  await db.collection("users").updateOne(userIdFilter(String(userId)),{$set:{role:"admin",isBlocked:false,subscriptionPlan:"free"}});
  console.log(`Admin account created: ${env.ADMIN_EMAIL}`);
 }
}catch(error){console.error(error);process.exitCode=1;}finally{await mongoClient.close();}
