# VIJJIES-MART Backend Checkout Verification Report

**Inspection date:** 6 November 2026  
**Scope:** Read-only source/configuration inspection and isolated pricing unit tests. No backend was started, no API request was made, and no database, order, or payment operation was attempted.  
**Status:** Backend-connected checkout verification is **BLOCKED** pending an authorized staging API and independently confirmed isolated test database.

## 1. Environment readiness

- Frontend and backend `.env` files exist. Their contents were not read or printed.
- No process-level `VITE_API_URL`, `MONGO_URL`, `TEST_MONGO_URL`, or `RUN_MONGO_INTEGRATION_TESTS` value was configured during inspection.
- The frontend `.env` contains a `VITE_API_URL` setting whose host resolves to `localhost`, the development target—not an identifiable staging host. The example configuration uses `http://localhost:5000`.
- The prior checkpoint reported that the local backend at `localhost:5000` was unavailable. No request was made during this inspection because the configured target was not confirmed to be staging.
- No `.env.test` file was found.
- The repository documents opt-in Mongo integration tests using `TEST_MONGO_URL` and a dedicated disposable replica set. The test safety helper currently refuses connections unconditionally. The integration suite is therefore not safe or available to run as configured.
- **Conclusion:** No authorized staging backend or independently verified isolated database was available. No live catalog product, current stock, staging authentication, or backend response could be verified.

## 2. API configuration findings

- The frontend API helper is `veg-delivery-app/src/config/api.js`.
- The configured base is `VITE_API_URL`. Development falls back to `http://localhost:5000`; production has no localhost fallback and reports a missing configuration.
- Backend routes are mounted at:
  - `GET /products` — public product catalog, returned as `{ products }`.
  - `POST /orders` — authenticated COD order creation.
  - `POST /payment/create-order` — authenticated online checkout creation.
- Backend server configuration uses `MONGO_URL` and `PORT` (default `5000`). Production CORS configuration also requires `FRONTEND_URL`.
- No API credentials, database connection values, or other secret values were inspected.

## 3. Pricing verification results

Source inspection shows the frontend and backend use matching integer-paise pricing rules:

1. Product catalog supplies `pricePerKg`.
2. Product selection supports `0.25`, `0.5`, and `1` kg packs.
3. Frontend rounds each selected pack price to paise; cart subtotal multiplies pack price by its integer quantity.
4. Backend looks up products using submitted product IDs and recalculates line prices from database `pricePerKg`, `weight`, and `quantity`.
5. Minimum subtotal is ₹100 before discount.
6. Discount is 10% when subtotal is at least ₹300.
7. GST is 5% of the post-discount amount.
8. Delivery charge is displayed as FREE; no delivery charge is added to the backend pricing result.
9. Final payable amount is post-discount subtotal plus GST.

The pricing fixtures in the existing tests provide these examples (they are not live catalog products):

| Fixture calculation | Subtotal | Discount | GST | Delivery | Final |
|---|---:|---:|---:|---:|---:|
| 4 × 250g at ₹100/kg | ₹100.00 | ₹0.00 | ₹5.00 | Free | ₹105.00 |
| 4 × 750g at ₹100/kg | ₹300.00 | ₹30.00 | ₹13.50 | Free | ₹283.50 |

Both frontend and backend tests also cover pack rounding and the discount/GST threshold. No current production/staging `pricePerKg` or inventory was available for an actual product trace.

## 4. Cart and checkout consistency

- Product-card cart items carry the product ID as `id`, selected `weight`, rounded pack `price`, `pricePerKg`, and `quantity`.
- Voice cart items may carry both `id` and `productId`; they represent aggregated weight with quantity `1`.
- Frontend checkout sends the cart items without converting each line into a different business representation. The backend accepts either `productId` or `id`, then normalizes item names and prices from the product database.
- Backend stock validation aggregates requested weight across all submitted lines for each product. Repeated product IDs with different weight variants are supported.
- Client-supplied names, prices, per-kilogram prices, and totals are not the authority for order pricing. Backend pricing is recalculated from product records.
- `Payment.jsx` independently displays the same subtotal, discount, GST, free-delivery label, and final amount calculated by the shared frontend money helper. Backend pricing tests confirm the corresponding server rules.

## 5. Request/response validation

### COD

`POST /orders` sends:

- `items`: the cart lines, including product `id`/`productId`, `weight`, and `quantity`.
- `paymentMethod: "COD"`.
- `customerLocation: { lat, lng }`.
- Authorization and `Idempotency-Key` headers.

The backend requires an authenticated customer, validates the idempotency key and coordinates, validates/reprices the cart from database products, enforces stock and the ₹100 minimum, and creates the order transactionally. A successful response includes the order and a server-generated `{ subtotal, discount, gst, total }` pricing object.

### Online checkout

`POST /payment/create-order` sends the cart `items` and `customerLocation: { lat, lng }` with authorization and `Idempotency-Key` headers. The backend validates and reprices the cart, then sends its computed total in paise and INR to Razorpay. The response includes the provider order ID, internal order ID, amount in paise, currency, and display total. No endpoint was called; no provider order was created.

### Delivery address

The location picker can select a formatted address, but checkout serializes only `{ lat, lng }`. The `Order` model stores only customer latitude and longitude; it has no human-readable address field. Thus coordinates match the existing API contract, but address text is not transmitted or persisted. Adding address persistence would require an explicitly approved API/data-contract change.

### Idempotency observation

The frontend checkout fingerprint sorts cart entries by product ID only. The backend canonicalizes entries by product ID, weight, and quantity. If lines for the same product but different weights are reordered (for example, removed and re-added), the frontend may create a different idempotency key for an otherwise equivalent cart. This is a potential retry/duplicate-checkout gap, not a pricing mismatch. No code change was made.

## 6. Tests executed and results

| Check | Result |
|---|---|
| `node --test veg-delivery-app/src/utils/money.test.js` | Passed: 2 tests. |
| `node --test backend/test/orderPricing.test.js` | Passed: 7 tests. Covers database-authoritative pricing, mixed weights, validation, stock, minimum, coordinates, and idempotency comparison. |
| Backend-connected catalog/checkout test | Not run: no confirmed staging target; local configured host was localhost. |
| Mongo integration suite | Not run: no isolated test database; repository safety helper intentionally refuses connections. |
| `git diff --check` | Reports 149 trailing-whitespace lines in the pre-existing worktree diffs for `veg-delivery-app/src/pages/Cart.jsx` and `veg-delivery-app/src/pages/Payment.jsx`; these files were not edited in this phase. |
| Build and full lint | Not rerun in this phase. Previous checkpoint recorded a passing frontend build and lint failures (20 errors, 9 warnings after the small Home cleanup). |

No backend service was started. No orders, payment attempts, refunds, or database writes were made.

## 7. Issues found

1. **Staging environment unavailable for verification.** The configured API host is localhost, not a confirmed staging host, and no isolated test database was established.
2. **Human-readable delivery address is not persisted.** Current checkout/model contract stores coordinates only. This is an existing contract limitation; changing it requires approval.
3. **Frontend idempotency fingerprint omits weight/quantity tie-breakers when sorting same-product cart lines.** Reordering variants can produce a new key for an equivalent cart. A fix should be separately reviewed and approved.
4. **No live product price or inventory could be checked.** Unit fixtures demonstrate rule consistency but do not represent actual catalog data.

No business logic or application code was changed.

## 8. Files changed

- Added this report: `VIJJIES_MART_BACKEND_CHECKOUT_VERIFICATION_REPORT.md`.
- No application, backend, configuration, or test code was changed.
- Existing uncommitted changes were preserved. Nothing was staged, committed, pushed, or deployed.

## 9. Remaining risks

- Database product prices and stock may differ from the unit fixtures; no catalog read was available.
- Authentication, order serialization against a running backend, Mongo transaction behavior, and live database persistence remain unverified.
- Online checkout was deliberately not invoked. Razorpay order creation, payment, and refunds were not tested.
- COD order creation was deliberately not invoked.
- Human-readable delivery address persistence remains outside the current API/model contract.
- Existing frontend lint failures and the production bundle-size warning remain as recorded in the previous checkpoint.

## 10. Recommended next task

Provision and independently confirm an authorized staging API and disposable isolated test database, with test-only products and a test customer. Do not share secrets in chat; configure them locally. First perform a read-only `GET /products` and verify one returned product's `pricePerKg` and stock against the cart calculations. Before any order-creation test, obtain explicit approval for a test-only COD order procedure and confirm isolated data cleanup. Do not invoke Razorpay endpoints or initiate real payments/refunds. Review the idempotency-key canonicalization and address-persistence limitations separately before proposing code changes.
