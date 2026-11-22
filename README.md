# PizzaHub Server

The backend API for **PizzaHub --- Pizza Ordering & Delivery Platform**.
It provides authentication, authorization, MongoDB data access, menu and
order workflows, image uploads, administration, and Vendor Premium
subscription processing.

## Live website and repositories

-   **Live website:** `ADD_LIVE_WEBSITE_URL`
-   **Client repository:** `ADD_CLIENT_GITHUB_URL`
-   **Server repository:** `ADD_SERVER_GITHUB_URL`

Replace these placeholders after deployment and confirm the repository
URLs.

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

3.  Create `.env` from `.env.example`:

    **Windows PowerShell**

    ``` powershell
    Copy-Item .env.example .env
    ```

    **macOS / Linux**

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
                                          frontend origin

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

When the server is running, check:

`GET http://localhost:5000/api/health`

## Stripe subscription webhook

Stripe is used for Vendor Premium subscriptions; customer pizza orders
do not use Stripe payments.

Configure the webhook endpoint:

`https://YOUR_SERVER_DOMAIN/api/subscriptions/webhook`

Subscribe to:

-   `checkout.session.completed`
-   `customer.subscription.updated`
-   `customer.subscription.deleted`

Set the signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook handler
verifies the Stripe signature before updating subscription status.

## Deployment

Deploy this repository as a separate Render Web Service:

1.  Create a Web Service connected to the server GitHub repository.
2.  Configure build and start commands to match `package.json` and the
    included Render configuration.
3.  Add required production environment variables.
4.  Use MongoDB Atlas and allow the deployed service to connect.
5.  Set `NODE_ENV=production`.
6.  Set `CLIENT_URL` and `BETTER_AUTH_URL` to the exact deployed
    frontend origin.
7.  Set `API_PUBLIC_URL` to the exact deployed backend origin.
8.  Update Google OAuth redirect settings and Stripe webhook URL for
    production.
9.  Verify `/api/health`, CORS, authentication, protected routes,
    uploads, and Stripe webhooks.

Enable `MONGODB_USE_TRANSACTIONS=true` only when the MongoDB deployment
supports transactions (replica set or sharded cluster).

## Security

-   Never commit `.env`, credentials, private keys, or API secrets.
-   Use strong, unique production secrets.
-   Do not expose Admin credentials in GitHub.
-   Keep Stripe webhook signature verification enabled.
-   Enforce roles and ownership on the server; do not trust
    client-supplied roles.
