# PizzaHub Server

The backend API for **PizzaHub --- Pizza Ordering & Delivery Platform**.
It provides authentication, authorization, MongoDB data access, menu and
order workflows, image uploads, administration, and Vendor Premium
subscription processing.

## Live website and repositories

-   **Live website:** https://pizzahub6452.vercel.app
-   **Backend API:** https://pizzahub-server-tibd.onrender.com
-   **Client repository:** https://github.com/shahin6452/PizzaHub-Client
-   **Server repository:** https://github.com/shahin6452/PizzaHub-Server

Replace the server repository placeholder with the final GitHub
repository URL.

## Features

-   Express REST API built with TypeScript.
-   MongoDB database integration.
-   Better Auth JWT plugin and JWKS-based token verification.
-   JWT signature, issuer, audience, and expiry checks.
-   Server-side role authorization for Customer, Vendor, and Admin
    routes.
-   Blocked-user enforcement and vendor ownership checks.
-   Public menu listing and menu details.
-   Search by name/description, category and location filters, and price
    sorting.
-   Vendor menu creation, update, deletion, and availability management.
-   Free-plan active menu limit and Premium vendor support.
-   Customer order creation, duplicate active-order protection, and
    pending-order cancellation.
-   Vendor order acceptance and rejection.
-   Admin user management, menu moderation, and transaction endpoints.
-   ImgBB-backed image upload support.
-   Stripe Checkout, Customer Portal support, and signature-verified
    subscription webhooks.
-   Zod validation and centralized error handling.
-   Optional SMTP order-status notifications.

## Technology stack

-   Node.js 22+, Express 5, TypeScript
-   MongoDB Native Driver
-   Better Auth, JOSE, Zod
-   Stripe Node SDK, Multer
-   Nodemailer (optional SMTP notifications)

See `package.json` and `package-lock.json` for the exact installed
package names and versions.

## Requirements

-   Node.js 22 or later and npm
-   MongoDB Atlas or compatible MongoDB deployment
-   Better Auth secret
-   ImgBB API key
-   Stripe account and recurring Premium Price ID for subscriptions
-   Google OAuth credentials if Google login is enabled
-   SMTP credentials only if email notifications are required

## Installation and local development

1.  Clone this repository:

    ``` bash
    git clone ADD_SERVER_GITHUB_URL
    cd YOUR_SERVER_FOLDER
    ```

2.  Install packages:

    ``` bash
    npm install
    ```

3.  Create `.env` from `.env.example`.

    **Windows PowerShell:**

    ``` powershell
    Copy-Item .env.example .env
    ```

    **macOS / Linux:**

    ``` bash
    cp .env.example .env
    ```

4.  Configure the variables in `.env`:

      -----------------------------------------------------------------------
      Variable                            Purpose
      ----------------------------------- -----------------------------------
      `PORT`                              API server port

      `NODE_ENV`                          Runtime environment

      `MONGODB_URI`                       MongoDB connection string

      `MONGODB_USE_TRANSACTIONS`          Enable transactions only on a
                                          replica set or sharded cluster

      `BETTER_AUTH_SECRET`                Better Auth secret

      `BETTER_AUTH_URL`                   Better Auth public base URL; use
                                          the frontend origin

      `API_PUBLIC_URL`                    Public backend API origin

      `CLIENT_URL`                        Allowed frontend origin

      `GOOGLE_CLIENT_ID`                  Google OAuth client ID

      `GOOGLE_CLIENT_SECRET`              Google OAuth client secret

      `STRIPE_SECRET_KEY`                 Stripe secret key

      `STRIPE_WEBHOOK_SECRET`             Stripe webhook signing secret

      `STRIPE_PREMIUM_PRICE_ID`           Recurring Premium Price ID

      `IMGBB_API_KEY`                     ImgBB image upload key

      `ADMIN_NAME`                        Initial Admin name for seed script

      `ADMIN_EMAIL`                       Initial Admin email for seed script

      `ADMIN_PASSWORD`                    Initial Admin password for seed
                                          script
      -----------------------------------------------------------------------

    SMTP variables may also be present in `.env.example`; they are
    optional. Use `.env.example` as the authoritative list of all
    variable names.

    **URL relationship:** `BETTER_AUTH_URL` should match the frontend
    origin (`CLIENT_URL`). `API_PUBLIC_URL` should be the public backend
    origin.

5.  Start the development server:

    ``` bash
    npm run dev
    ```

    The local API normally listens at `http://localhost:5000`, unless
    `PORT` is changed.

## Create the initial Admin

Admin registration is not available through public signup. Configure
these values in `.env`:

``` env
ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Use-A-Strong-Private-Password
```

Then run:

``` bash
npm run seed:admin
```

Keep the Admin password private. Never commit it or publish it in this
README.

## API health check

When the server is running locally, check:

`GET http://localhost:5000/api/health`

For the deployed backend, check:

`https://pizzahub-server-tibd.onrender.com/api/health`

## Stripe subscription webhook

Stripe is used for Vendor Premium subscriptions; customer pizza orders
do not use Stripe payments.

Configure the webhook endpoint:

`https://YOUR_SERVER_DOMAIN/api/subscriptions/webhook`

Subscribe to these events:

-   `checkout.session.completed`
-   `customer.subscription.updated`
-   `customer.subscription.deleted`

Set the webhook signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook
handler verifies the Stripe signature before updating subscription
status.

**Current deployment note:** The configured Stripe webhook shown during
deployment is a Sandbox/Test-mode endpoint. It is for testing only and
does not process real customer payments. To accept live payments,
complete Stripe's legitimate account onboarding and verification, then
create a separate Live-mode webhook and configure the Live API key, Live
webhook signing secret, and Live Premium Price ID in the production
environment. A local Stripe CLI listener is not required for the
deployed webhook endpoint.

## Deployment

The backend is deployed as a separate Render Web Service:

1.  Connect this repository to a Render Web Service.
2.  Configure build and start commands to match `package.json` and the
    included Render configuration.
3.  Add the required production environment variables in Render.
4.  Use MongoDB Atlas and allow the deployed service to connect.
5.  Set `NODE_ENV=production`.
6.  Set `CLIENT_URL` and `BETTER_AUTH_URL` to the exact deployed
    frontend origin: `https://pizzahub6452.vercel.app`.
7.  Set `API_PUBLIC_URL` to the deployed backend origin:
    `https://pizzahub-server-tibd.onrender.com`.
8.  Add the deployed frontend origin to the server's CORS allowlist, if
    configured separately.
9.  Update Google OAuth authorized JavaScript origins and redirect URI
    for the deployed frontend. The production callback URI is
    `https://pizzahub6452.vercel.app/api/auth/callback/google`.
10. Configure the Stripe webhook endpoint and matching signing secret
    for the selected Stripe mode (Sandbox/Test or Live).
11. Verify `/api/health`, CORS, authentication, protected routes,
    uploads, and Stripe webhook deliveries.

Enable `MONGODB_USE_TRANSACTIONS=true` only when the MongoDB deployment
supports transactions (replica set or sharded cluster).

## Security

-   Never commit `.env`, credentials, private keys, or API secrets.
-   Use strong, unique production secrets.
-   Do not expose Admin credentials in GitHub.
-   Keep Stripe webhook signature verification enabled.
-   Keep Test-mode and Live-mode Stripe keys and webhook secrets
    separate.
-   Enforce roles and ownership on the server; do not trust
    client-supplied roles.
