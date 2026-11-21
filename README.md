# PizzaHub Server

Express REST API, Better Auth host, MongoDB business data, JWT verification, Stripe webhooks and ImgBB uploads.

## Stack

- Node.js + Express 5 + TypeScript
- MongoDB Atlas / MongoDB Node driver
- Better Auth + `@better-auth/mongo-adapter` + JWT plugin
- JOSE for Express-side JWT/JWKS verification
- Stripe Checkout and verified webhooks
- ImgBB uploads, Nodemailer email notifications, Zod validation

## Local setup (PowerShell)

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens at `http://localhost:5000` by default.

## Required environment variables

- `CLIENT_URL` — frontend origin
- `API_PUBLIC_URL` — externally reachable Express API origin
- `BETTER_AUTH_URL` — public frontend origin; set equal to `CLIENT_URL`
- `BETTER_AUTH_SECRET` — random secret with at least 32 characters
- `MONGODB_URI`, `MONGODB_DB_NAME`
- `MONGODB_USE_TRANSACTIONS` — `true` for replica-set / sharded deployments (including MongoDB Atlas); `false` for standalone local MongoDB
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — required to enable Google login
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`
- `IMGBB_API_KEY`
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` for the admin seed script
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` are optional and enable order-status email notifications

The Google OAuth authorized redirect URI is `BETTER_AUTH_URL/api/auth/callback/google`.

## Create Admin

```powershell
npm run seed:admin
```

Admin creation is not exposed through public sign-up. The script creates the account via Better Auth and grants the Admin role directly in the `users` collection.

## Build and checks

```powershell
npm run typecheck
npm run build
npm start
```

The build outputs `dist/src/index.js`, which is the production start entry.

## Stripe webhook

Set the Stripe webhook endpoint to `/api/subscriptions/webhook` and subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The endpoint validates the raw-body Stripe signature. Premium is activated only from verified Stripe events. Customer pizza orders do not use Stripe.

## Related repository

Client repository: `ADD_CLIENT_REPOSITORY_URL`

Live website: `ADD_LIVE_WEBSITE_URL`

Never commit `.env` or secrets.
