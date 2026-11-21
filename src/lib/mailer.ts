import nodemailer from "nodemailer";
const ready=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);
const transporter=ready?nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}):null;
export async function sendOrderStatusEmail(to:string,name:string,itemName:string,status:"accepted"|"rejected"){
 if(!transporter){console.info("SMTP not configured; order email notification skipped.");return;}
 const accepted=status==="accepted";const subject=accepted?"Your PizzaHub order was accepted":"An update about your PizzaHub order";
 await transporter.sendMail({from:process.env.SMTP_FROM||"PizzaHub <no-reply@pizzahub.example>",to,subject,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#251613"><h1 style="color:#b98200">PizzaHub</h1><h2>Hello ${escapeHtml(name)},</h2><p>Your order for <strong>${escapeHtml(itemName)}</strong> was <strong>${status}</strong> by the restaurant.</p><p>${accepted?"The kitchen is getting your order ready. Check your dashboard for delivery details.":"You can browse the menu and place another order at any time."}</p><p>Thanks for choosing local pizza.</p></div>`});
}
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
