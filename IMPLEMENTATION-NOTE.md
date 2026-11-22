# Implementation Note

This document explains how the main assignment challenges are
implemented in PizzaHub. It can be used as a reference when updating the
separate Client and Server README files.

## 1. Advanced Menu Search, Filtering, and Sorting

PizzaHub implements menu discovery through the public `GET /api/menu`
endpoint.

### API query parameters

  -----------------------------------------------------------------------
  Parameter               Purpose                 Example
  ----------------------- ----------------------- -----------------------
  `search`                Searches menu item name `search=cheese`
                          and description         

  `category`              Filters by category;    `category=Vegetarian`
                          `All` means no category 
                          restriction             

  `location`              Filters by location     `location=Dhaka`
                          using a                 
                          case-insensitive        
                          partial match           

  `sort`                  Controls result         `sort=price-asc`
                          ordering: `newest`,     
                          `price-asc`, or         
                          `price-desc`            

  `page`                  Selects the result page `page=1`

  `limit`                 Sets the number of      `limit=12`
                          results per page        
                          (maximum 48; default    
                          12)                     
  -----------------------------------------------------------------------

Example request:

``` text
GET /api/menu?search=cheese&category=Vegetarian&location=Dhaka&sort=price-asc&page=1&limit=12
```

### Backend flow

1.  The Express route reads the query parameters.
2.  It starts with a MongoDB filter that includes only approved menu
    items that are not unavailable.
3.  If `category` is provided and is not `All`, the category is added to
    the filter.
4.  If `location` is provided, MongoDB applies a case-insensitive
    regular-expression match.
5.  If `search` is provided, MongoDB searches both `itemName` and
    `description`.
6.  The selected sort order is applied in MongoDB. Results are paginated
    using `page` and `limit`.
7.  The API returns the items together with `total`, `page`, and
    `pages`. Vendor information is attached to the menu items. Premium
    vendor placement is applied for the non-price sort orders.

### Client flow

The Browse Menu interface sends the selected search, category, location,
sort, and pagination values to the menu API. Users can combine search
and filters; the backend applies the conditions together rather than
treating them as separate searches.

## 2. JWT Verification and Protected API Routes

PizzaHub uses Better Auth to issue authentication tokens and JOSE to
verify JWTs in the Express backend.

### Authentication middleware flow

1.  The client obtains a short-lived JWT from the Better Auth client.
2.  For protected business API requests, the client sends the token in
    the HTTP `Authorization` header as a Bearer token.
3.  The Express `authenticate` middleware extracts the Bearer token.
4.  The middleware verifies the JWT signature using the Better Auth JWKS
    endpoint.
5.  It validates the expected issuer, audience, and token expiry.
6.  It loads the current user from MongoDB using the verified token
    subject.
7.  It rejects missing users and blocked accounts, then attaches the
    authenticated user to the request.
8.  The `allowRoles(...)` middleware checks whether the authenticated
    user's role is allowed to access that route.

Invalid, expired, missing, or otherwise unverifiable tokens are rejected
before protected route handlers run.

### Authorization and ownership

-   Protected routes use `authenticate` followed by `allowRoles(...)`.
-   Admin routes are restricted to Admin users.
-   Vendor operations use the authenticated vendor ID in database
    queries so vendors can manage only their own menu items.
-   Sensitive ownership and role checks are enforced on the server;
    hiding a button in the client is not treated as sufficient
    authorization.

### Client authentication requests

Better Auth requests use the Next.js `/api/auth/*` path so the
authentication cookie remains first-party on the client origin. Normal
business API requests are sent to the Express API with a short-lived
Bearer JWT.

## 3. Improving the Website Appearance

PizzaHub uses a consistent pizza-themed visual design and responsive
layouts across public pages and role-based dashboards.

The UI work includes:

-   Responsive layouts for desktop, tablet, and mobile screens.
-   Consistent colors, typography, spacing, buttons, and card
    presentation.
-   Reusable components for shared interface elements and dashboard
    structure.
-   Menu cards and grid layouts for browsing items.
-   Role-aware dashboard navigation, statistics cards, and data
    visualizations.
-   Loading, empty, success, and error states to make interactions
    clearer.
-   Motion animations on suitable homepage sections, while avoiding
    unnecessary visual effects.

The client uses Next.js, React, TypeScript, and Tailwind CSS, alongside
the UI and charting libraries listed in the client `package.json`.

## README placement

Use this note to document the work in the two repositories:

-   **Server README:** include the API query parameters, MongoDB
    filtering/sorting/pagination flow, JWT verification steps, role
    authorization, and vendor ownership checks.
-   **Client README:** explain how the Browse Menu page sends query
    parameters, how the client attaches the Bearer token to business API
    requests, and the responsive/reusable UI improvements.

Keep the explanations aligned with the actual source code if an
endpoint, parameter, or implementation changes.
