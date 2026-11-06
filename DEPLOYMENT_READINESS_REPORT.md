# Deployment Readiness Audit Report — Vijjies-Mart

Date: 2026-10-27

Scope: static review of the current repository state plus safe, available verification commands only. No production deployment, no payment simulation, no destructive operations, and no secret inspection.

## Executive Summary

The project is not yet production-ready.

The frontend bundle compiles successfully, but that is only a local build confirmation. The repository still has material deployment risk in production configuration, dependency security posture, environment handling, and server-side deployment assumptions.

## 1) Confirmed findings and evidence

### 1.1 AdminDashboard change review

Reviewed the latest change in [veg-delivery-app/src/pages/AdminDashboard.jsx](veg-delivery-app/src/pages/AdminDashboard.jsx).

Confirmed behavior:
- The fetch guards for orders/products/partners now check `res.ok` before parsing JSON.
- Empty or failed fetches are converted to empty arrays instead of stale or partial state.
- The voice parser now refuses empty transcripts and shows clearer speech-recognition messages.

Assessment:
- This change is mostly safe for local UX and avoids crashing on bad responses.
- However, it also hides API failures by setting the state to an empty array on fetch error. In production, a transient backend outage or a temporary auth failure could silently clear valid data from the admin dashboard and make the app look empty rather than explicitly failing.
- This is a real risk in the updated logic, especially for orders and partners data. It does not break the happy path, but it does reduce observability and can erase valid data unnecessarily when the API is unhealthy.

Severity: Medium

Files: [veg-delivery-app/src/pages/AdminDashboard.jsx](veg-delivery-app/src/pages/AdminDashboard.jsx)

### 1.2 Frontend production API configuration (corrected in Phase 2)

The initial review found API calls falling back to localhost in production. Phase 2 consolidated frontend backend requests through `src/config/api.js`: it uses `VITE_API_URL`, defaults to localhost only in Vite development mode, and reports a clear error if production configuration is missing. See section 8 for the full implementation and validation.

### 1.3 Backend startup and production entry point are not fully configured

The backend package manifest shows:
- [backend/package.json](backend/package.json) has no `start` script.
- `main` is `index.js`, but the actual application entry point is [backend/server.js](backend/server.js).

The server starts by reading environment variables and then calls MongoDB connection and `app.listen(PORT)`, with `PORT` defaulting to 5000 if unset.

This is workable locally but weak for production deployment because there is no explicit production command documented in the package manifest, and there is no assurance that `PORT` or the Mongo URL is configured in hosting environment variables.

Severity: Medium

### 1.4 MongoDB Atlas connection and env assumptions are deployment-critical

The backend loads environment variables via `dotenv` and connects with:
- [backend/server.js](backend/server.js)

Required variables are documented in [backend/.env.example](backend/.env.example):
- `PORT`
- `MONGO_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CLOUD_NAME`
- `API_KEY`
- `API_SECRET`
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

The actual `.env` files exist locally but are ignored by Git and not tracked. This is correct for secret management, but it means the app cannot run in a fresh deployment without those variables being provided in the hosting environment.

The repository does not currently include a deployment manifest or CI/CD check to require them at build or runtime.

Severity: High

Note: the actual `.env` file contents were not inspected in order to avoid exposing secrets.

### 1.5 CORS is open to all origins

At the time of the initial review, [backend/server.js](backend/server.js) used `app.use(cors())`, allowing requests from all origins. This was corrected in Phase 2; see section 8 for the environment-based production allowlist and verification results.

### 1.6 Authentication and admin/delivery authorization are present but tightly coupled to environment variables

Reviewed [backend/routes/authRoutes.js](backend/routes/authRoutes.js).

Confirmed behavior:
- `verifyToken` checks `Authorization: Bearer <token>`.
- `isAdmin` enforces `req.user.role !== "admin"`.
- `isDelivery` enforces `req.user.role !== "delivery"`.
- `GET /auth/delivery-partners` is protected by `verifyToken` + `isAdmin`.
- Admin login supports environment-driven admin email/password comparison using `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD`.

This is functional, but it means admin access is entirely controlled by environment secrets; if those are not set or are leaked, admin access becomes exposed or unusable. Also, there is no additional rate limiting or audit trail in the current code.

Severity: Medium

### 1.7 Product, stock, and order validation are partially implemented but not complete for production safety

Reviewed:
- [backend/routes/productRoutes.js](backend/routes/productRoutes.js)
- [backend/models/Product.js](backend/models/Product.js)
- [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js)
- [backend/models/Order.js](backend/models/Order.js)

Confirmed behavior:
- Product creation validates `name`, `pricePerKg`, and `stock >= 0`.
- Product update validates non-negative stock.
- Order creation rejects missing required fields and invalid customer location.
- Stock is reduced against each item weight.
- `quantity` and `weight` are set to the same numeric value in order creation.

However:
- There is no obvious server-side minimum-order guard in the order API itself; the business rule exists on the frontend in [veg-delivery-app/src/pages/Cart.jsx](veg-delivery-app/src/pages/Cart.jsx), not in the backend.
- There is no server-side check for fractional weight rounding or currency precision beyond numeric validation.
- Order creation does not re-check the total amount against the cart line items before saving.
- The code reduces stock immediately when the order is created, without a payment confirmation step for online payment flows.

This means backend validation is not robust enough as the single source of truth for business rules.

Severity: Medium

### 1.8 Fractional quantities (0.25 kg / 0.5 kg) are supported by frontend cart logic, but backend validation is not explicitly enforcing it

Confirmed in [veg-delivery-app/src/context/CartContext.jsx](veg-delivery-app/src/context/CartContext.jsx):
- `increaseQty` adds `0.25` increments for weight-based items.
- `decreaseQty` subtracts `0.25` increments.
- Product weight totals are stored as fractional numbers.

The frontend supports 0.25 kg and 0.5 kg patterns. The backend order route reads `item.weight ?? item.quantity` and stores it as a number, so fractional values can be handled, but there is no explicit `min`/`step` or decimal precision enforcement on the backend for delivery weights.

Severity: Low to Medium

### 1.9 ₹100 minimum order rule is frontend-enforced only

Confirmed in [veg-delivery-app/src/pages/Cart.jsx](veg-delivery-app/src/pages/Cart.jsx):
- `const meetsMinimum = totalPrice >= 100;`
- `amountToMinimum = Math.max(0, 100 - totalPrice);`

The checkout and navigation logic prevents checkout below ₹100 on the client, but the backend does not enforce the minimum order amount.

Severity: Medium

### 1.10 Server-side price calculation and currency validation are weak

Reviewed [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js) and [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js).

Confirmed behavior:
- Orders save `total` from the request body.
- Payment route creates a Razorpay order using the incoming `amount` and stores the result.
- The code computes GST on the frontend, not on the server.

This means the backend trusts the price sent by the client. There is no server-side recomputation of amount from product prices and quantities before accepting or verifying payment, leaving room for manipulated totals.

Severity: High

### 1.11 Razorpay signature verification is implemented, but duplicate and double-submit protections are incomplete

Reviewed [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js).

Confirmed behavior:
- The route computes the expected HMAC signature using `crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)` and compares it to `razorpay_signature`.
- If valid, it updates the payment status to `paid` and stores the payment id and signature.
- It returns a 404 if the DB order is missing.

Weaknesses:
- There is no explicit duplicate-payment prevention before updating a previously paid order.
- A repeated `verify` request with the same or an already-used order could re-apply success logic.
- There is no server-side check that the payment amount supplied by Razorpay matches the requested amount, or that the order has not already been paid/verified.
- The code does not verify that `dbOrderId` is valid before `findById`, though the route does check `findById` and returns 404.

Severity: High

### 1.12 Cash on Delivery flow exists, but it is not backed by a full server-side authorization policy

Confirmed in [veg-delivery-app/src/pages/Payment.jsx](veg-delivery-app/src/pages/Payment.jsx) and [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js).

Confirmed behavior:
- COD orders are placed with `paymentMethod: "COD"` and `paymentStatus: "pending"`.
- The order is saved with customer location and delivery context.

This is operationally valid, but the backend does not enforce a separate COD-only business validation, and COD orders are created from client-supplied totals without rechecking product pricing or minimum-order constraints.

Severity: Low to Medium

### 1.13 Cloudinary upload path is present, but production deployment depends on environment secrets and filesystem-safe uploads

Reviewed [backend/config/cloudinary.js](backend/config/cloudinary.js) and [backend/routes/productRoutes.js](backend/routes/productRoutes.js).

Confirmed behavior:
- Product creation uploads image data to Cloudinary.
- The config reads `CLOUD_NAME`, `API_KEY`, and `API_SECRET` from environment.
- Missing env vars log a warning, but the app continues and may fail at upload time.

This is okay for local development if env vars are correctly set, but production hosting must guarantee the Cloudinary config is present and valid.

Severity: Medium

### 1.14 Git ignores local env files correctly, but project still relies on secrets being injected in runtime

Verified with Git ignore rules:
- [/.gitignore](.gitignore)
- [veg-delivery-app/.gitignore](veg-delivery-app/.gitignore)

Git output confirms:
- `backend/.env` is ignored.
- `veg-delivery-app/.env` is ignored.
- `backend/.env.example` and `veg-delivery-app/.env.example` are tracked template files.

This is good security hygiene. However, it means the application must be deployed with environment variables provided by the hosting platform or equivalent secret manager; there is no local `.env` in the repository to support a production deployment without environment injection.

Severity: Low

### 1.15 SPA routing and production hosting configuration are not verified

The app is using `BrowserRouter` in [veg-delivery-app/src/App.jsx](veg-delivery-app/src/App.jsx).

There is no deployment rewrite config such as:
- `vercel.json`
- `netlify.toml`
- `_redirects`

This is a common production requirement for client-side SPA routing. Without a rewrite rule, static hosts may return 404 on direct deep-link access.

Severity: Medium

### 1.16 Dependency audit status (superseded by fresh audit below)

The vulnerability counts in the original Phase 1 audit were historical and no longer match the current lockfiles. See section 7 for fresh results, package paths, advisory ranges, and the prioritized remediation proposal.

## 2) Safe verification results actually executed

### Build verification

Command executed:
- `cd "d:\vijjies(vj)\veg-delivery-app"; npm run build`

Result:
- Successful build completed with Vite.
- This confirms the React app compiles successfully in the current state.
- It does not prove production runtime correctness, API configuration correctness, or deployment readiness.

### Git secret hygiene verification

Command executed:
- `git status --short --ignored`
- `git check-ignore -v backend/.env veg-delivery-app/.env backend/.env.example veg-delivery-app/.env.example`

Result:
- `.env` files are correctly ignored.
- `.env.example` files are tracked templates.
- Actual secrets are not tracked in Git.

### Dependency audit verification

Fresh `npm audit --json` commands were run from both application directories on 2026-10-28. The frontend was also checked with `npm audit --omit=dev --json`.

- Backend: 0 vulnerabilities (0 informational, low, moderate, high, or critical), including production-only audit.
- Frontend: 4 high-severity package records, 0 low/moderate/critical, including production-only audit. The records arise from two `@grpc/grpc-js` advisories and their Firestore/Firebase dependency effects.
- The frontend production-only audit reports the same four records; these packages are in the runtime dependency tree, not just development tooling.

## 3) Checks that could not be verified without exposing secrets or performing live production actions

The following were not verified in this audit because doing so would either expose secret values, require actual external credentials, or perform live production operations:
- actual MongoDB Atlas connectivity with the real `MONGO_URL`
- real Razorpay payment creation and signature validation using live keys
- Cloudinary upload success using real credentials
- live JWT/token behavior against a real deployed backend
- live admin or delivery authorization against a real external environment
- deployment to a live host or static hosting platform
- actual payment success/failure flows

## 4) Required environment variables

The repository documents the required variables in:
- [backend/.env.example](backend/.env.example)
- [veg-delivery-app/.env.example](veg-delivery-app/.env.example)

Required backend environment variables include:
- `PORT`
- `MONGO_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CLOUD_NAME`
- `API_KEY`
- `API_SECRET`
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Required frontend environment variable include:
- `VITE_API_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

## 5) Priority-ordered fixes required before production deployment

1. Remove hardcoded localhost fallbacks and require env-configured API URL in all frontend components (implemented in Phase 2; see section 8).
2. Restrict CORS to known production origins and add explicit host rules (implemented in Phase 2; see section 8).
3. Resolve the outstanding Firebase/Firestore transitive gRPC advisories after a compatible upstream fix or an independently validated remediation is available. The fresh backend audit is clean.
4. Add a proper production start command and health-check endpoint for the backend.
5. Enforce server-side business rules for order minimum, total validation, and payment verification before persisting orders (implemented in Phase 3; see section 9).
6. Add duplicate-payment protection and server-side amount matching for Razorpay verification (implemented in Phase 3; see section 9).
7. Configure SPA rewrites for BrowserRouter-based hosting and verify deep-link routing on the target platform.
8. Validate full end-to-end production config with a real environment (Mongo, Cloudinary, Razorpay, JWT, admin credentials).

## 6) Final status

Status: Not deployment-ready; Phase 3 order and payment safeguards are implemented, but deployment-specific checks remain.

Reason: frontend API configuration and CORS have been hardened, and server-side order/payment controls have been implemented. Actual hosting URLs, environment variables, transaction behavior against the deployment database, provider credentials, and end-to-end flows have not been verified. Dependency and deployment-configuration risks also remain unresolved.

## 7) Phase 1B dependency security investigation — fresh evidence and proposed fixes

Investigation date: 2026-10-28. No package manifests, lockfiles, or application source were changed during this investigation.

### 7.1 Fresh audit totals

| Project | Audit scope | Info | Low | Moderate | High | Critical | Total |
|---|---|---:|---:|---:|---:|---:|---:|
| Backend | All dependencies | 0 | 0 | 0 | 0 | 0 | 0 |
| Backend | Production (`--omit=dev`) | 0 | 0 | 0 | 0 | 0 | 0 |
| Frontend | All dependencies | 0 | 0 | 0 | 4 | 0 | 4 |
| Frontend | Production (`--omit=dev`) | 0 | 0 | 0 | 4 | 0 | 4 |

Audit source: `npm audit --json`, run separately in `backend/` and `veg-delivery-app/`; frontend production-only result from `npm audit --omit=dev --json`. The four frontend records are package-level effects of two GHSA advisories, not four separate underlying advisories.

### 7.2 Backend findings and requested package trace

The current backend audit reports no advisories. All six requested packages are therefore not currently within an npm-reported affected range in this lockfile; there is no current fixed-version requirement. Each is a production dependency-path package, not a development-only dependency:

| Package | Installed version and dependency path (`npm explain`) | App use / assessment | Current advisory / fix |
|---|---|---|---|
| `axios` | 1.21.0 ← `razorpay@2.9.6` ← root | No direct axios import found; it is an SDK dependency. Razorpay is used in `backend/routes/paymentRoutes.js`. | No current advisory; no update required based on fresh audit. |
| `body-parser` | 2.4.0 ← `express@5.2.1` ← root | No direct import; Express owns this dependency and the server uses `express.json()`. | No current advisory; no update required. |
| `follow-redirects` | 1.16.2 ← `axios@1.21.0` ← Razorpay ← root | Transitive transport dependency; no direct application import. | No current advisory; no update required. |
| `protobufjs` | 7.6.6 ← `@google/genai@2.2.0` ← root | No direct import; the application uses Google GenAI in `backend/routes/recipeRoutes.js`. | No current advisory; no update required. |
| `proxy-addr` | 2.0.8 ← `express@5.2.1` ← root | Express transitive request/proxy utility; no direct import found. | No current advisory; no update required. |
| `qs` | 6.17.0 ← `body-parser@2.4.0` ← Express ← root; also `qs@^6.14.0` ← Express ← root | Express/parser transitive query-string dependency; no direct import found. | No current advisory; no update required. |

No update to Razorpay or Express is proposed: the fresh audit has no backend finding to remediate, and no parent upgrade is justified by these current results.

### 7.3 Frontend findings: Firebase, Firestore, and gRPC

The installed production dependency paths are:

- `firebase@12.19.0` (direct dependency)
- `@firebase/firestore@4.17.2` ← `firebase@12.19.0`; also ← `@firebase/firestore-compat@0.4.14`
- `@firebase/firestore-compat@0.4.14` ← `firebase@12.19.0`
- `@grpc/grpc-js@1.9.16` ← `@firebase/firestore@4.17.2` (`~1.9.0`)

The audit-reported affected package ranges and advisories are:

| Affected package | Installed | Severity | Audit affected range | Advisory | Production / app use | Fixed version or safe fix status |
|---|---:|---|---|---|---|---|
| `@grpc/grpc-js` | 1.9.16 | High and Low (two advisories) | `<=1.13.5`; advisories specify `<1.13.6` | GHSA-m9gg-hp2v-232j (High: unauthorized certificates may be treated as authorized in certain configurations); GHSA-f596-whhp-79r4 (Low: some handler errors may be sent to clients) | Production transitive dependency through Firestore. No application import or gRPC server use found; reachable impact in this browser app is not established. | Patched range starts at `1.13.6`, but the Firebase Firestore dependency declares `~1.9.0`; no compatible parent release was verified. |
| `@firebase/firestore` | 4.17.2 | High (inherited) | `1.3.1-0 - 1.3.1-canary.df1b588 || 1.3.2-0 - 1.3.3-canary.bc4a844 || 1.13.1-0 - 1.13.1-canary.ce3addba || 1.14.0-0 - 1.15.1 || 3.7.3-20221108184443 - 3.7.3-canary.fde5adf63 || >=3.8.0-20221206221533` | Inherits the two `@grpc/grpc-js` advisories above | Production transitive dependency. No Firestore imports or usage found in application source. | npm gives no compatible patch. Its suggested `firebase@9.14.0` is a major downgrade and is not accepted as a safe remediation. |
| `@firebase/firestore-compat` | 0.4.14 | High (inherited) | `<=0.0.900-exp.520ca39d0 || 0.2.3-20221108184443 - 0.2.3-canary.fde5adf63 || >=0.3.0-20221206221533` | Inherits the Firestore/gRPC advisories above | Production transitive dependency of Firebase; no compat API use found in application source. | No compatible fix verified; npm’s suggested Firebase downgrade is not suitable. |
| `firebase` | 12.19.0 | High (inherited) | `0.900.22 || 6.0.2-0 - 6.0.2-canary.42eae23 || 6.0.3-0 - 6.0.4-canary.bc4a844 || 7.9.1-0 - 7.9.1-canary.0396117e || 7.13.2-0 - 7.13.2-canary.ce3addba || 7.14.0-0 - 7.15.1 || 8.10.0-20217172214 - 8.10.0-canary.f40c0db53 || 9.0.0-20217250818 - 9.0.0-canary.d0d3acb10 || 9.0.1-2021727231341 - 9.0.1-canary.e039e1472 || 9.0.2-2021891633 - 9.0.2-canary.ff9baf70c || 9.0.3-202181503543 - 9.1.0-canary.f7d8324a1 || 9.1.1-2021830195733 - 9.1.1-canary.e70de6201 || 9.1.2-20219523556 - 9.1.2-canary.fc1d36497 || 9.13.1-20221108184443 - 9.14.0-canary.fde5adf63 || >=9.15.0-20221206221533` | Inherits Firestore findings | Direct production dependency. `src/firebase.js` uses Firebase App, Analytics, and Auth exports including phone sign-in; no imports of Firestore or Firestore Compat were found, and no callers of this module were found in `src/`. Do not remove Firebase or its auth exports as a count-reduction measure. | No compatible patched release verified. npm audit suggests `firebase@9.14.0` with `isSemVerMajor: true`, which is a risky downgrade rather than an acceptable fix. |

The advisory descriptions concern gRPC server behavior/configuration. This frontend does not contain application-level gRPC server code, and Firestore is not imported by the application. This reduces apparent application reachability but does not erase the installed production dependency or its audit status; assess whether bundled/server-side use exists before treating the finding as accepted risk.

Firebase release check: npm registry metadata reports Firebase 12.19.0 as the latest 12.x release and Firebase 13.1.0 as latest. Firebase 13.1.0 resolves Firestore 4.19.0, which still declares `@grpc/grpc-js: ~1.9.0`. A Firebase major upgrade alone therefore does not address the patched minimum and carries compatibility risk without benefit for these findings. Direct transitive overrides are not proposed: they would violate Firestore’s declared dependency range and have not been tested for compatibility.

### 7.4 Other requested frontend packages

These packages are present but do not appear in the fresh audit’s vulnerability list. Versions and paths are from `npm explain`; no direct application imports were found. “No audit advisory” is not a claim that the package is unused by its parent.

| Package | Installed version and path | Dependency class | App use / current status |
|---|---|---|---|
| `brace-expansion` | 1.1.21 ← `minimatch@3.1.5` ← ESLint config ← `eslint@9.39.5` | Development-only | No app import; no current advisory. |
| `dompurify` | 3.4.17 ← `jspdf@4.2.1` | Optional production dependency | No app import found; parent may consume it. Not flagged by fresh audit. |
| `js-yaml` | 4.3.2 ← `@eslint/eslintrc@3.3.6` ← ESLint | Development-only | No app import; no current advisory. |
| `source-map-js` | 1.2.2 ← `@tailwindcss/node`, PostCSS, and Vite | Development/build tooling | No app import; no current advisory. |

The frontend audit includes these development dependencies but flags none of them. No updates are proposed for this group based on this evidence.

### 7.5 Prioritized remediation proposal — approval required

1. **Do not change backend dependencies.** Current full and production audits are clean; the six requested backend packages are outside any currently reported vulnerable range.
2. **Keep the frontend Firebase/Firestore finding open pending a compatible upstream release or a validated alternative.** Request/monitor an upstream Firebase/Firestore dependency update that permits `@grpc/grpc-js >=1.13.6`, then re-run full and production audits and validate Auth/Analytics behavior. Do not downgrade Firebase or add an override just to suppress npm audit.
3. **Assess reachability before acceptance.** Confirm the production bundle/runtime does not include or invoke Firestore/gRPC server functionality. The source inspection found no Firestore imports, but npm audit alone cannot prove deployed bundle contents.
4. **Do not remove Firebase/Auth, Firestore support, or other application functionality as a vulnerability-count shortcut.** The current repository source includes Firebase Auth exports; any future dependency restructuring needs a separate compatibility review and explicit approval.

No dependency modifications have been made. This investigation stops here for approval before any package or lockfile changes.

## 8) Phase 2 production API configuration and CORS

Implementation date: 2026-10-28. No package manifests or lockfiles were changed.

### 8.1 Files changed

- `backend/config/cors.js` — shared origin parsing, allowlist policy, and CORS middleware.
- `backend/server.js` — production CORS setup and removal of the Mongo connection string from startup logs.
- `backend/.env.example` — documents `FRONTEND_URL`.
- `veg-delivery-app/.env.example` — documents the local `VITE_API_URL` default and production override expectation.
- `veg-delivery-app/src/config/api.js` — shared API URL helper.
- Frontend API call sites updated to use the helper: `src/pages/AdminDashboard.jsx`, `src/pages/AdminLogin.jsx`, `src/pages/Delivery.jsx`, `src/pages/Home.jsx`, `src/pages/Login.jsx`, `src/pages/MyOrders.jsx`, `src/pages/Payment.jsx`, `src/pages/RecipeDetails.jsx`, `src/pages/RecipesPage.jsx`, `src/pages/Register.jsx`, `src/delivery/DeliveryDashboard.jsx`, `src/delivery/DeliveryLogin.jsx`, and `src/delivery/DeliveryRegister.jsx`.

The existing unrelated worktree changes in `AdminDashboard.jsx`, dependency manifests/lockfiles, and audit outputs were preserved.

### 8.2 Configuration behavior

Before:
- Frontend components independently selected `VITE_API_URL` or silently fell back to `http://localhost:5000`; some requests hardcoded that URL, while Home directly interpolated the environment value.
- Backend used unrestricted `app.use(cors())`.
- Backend startup logged the configured Mongo connection string.

After:
- All frontend requests to this backend call `apiUrl(path)`. A configured `VITE_API_URL` is used consistently, with trailing slashes normalized.
- When `VITE_API_URL` is absent, only Vite development mode uses `http://localhost:5000`. In production, the helper logs and throws an actionable error instructing the operator to set `VITE_API_URL` to the deployed backend URL. No server-side secrets are read or exposed by the helper.
- `FRONTEND_URL` is a comma-separated list of explicit HTTP(S) origins (origins only; no paths). Production startup fails clearly if it is missing or empty. Unexpected browser origins receive HTTP 403. Requests without an `Origin` header continue without CORS response headers for server-to-server use.
- Outside production, localhost, `127.0.0.1`, and `::1` HTTP origins are permitted for development; configured origins remain permitted as well.
- CORS allows the existing API methods (`GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`) and headers (`Content-Type`, `Authorization`) used by the app. Razorpay checkout is loaded from its existing hosted SDK URL; no payment logic or checkout behavior was changed.
- The origin check is a browser cross-origin policy, not authentication or authorization. API authentication/authorization remains the responsibility of existing backend routes.
- Startup now logs only whether `MONGO_URL` is configured, not its value.

Expected deployment configuration:
- Backend: set `PORT`, `MONGO_URL`, and `FRONTEND_URL`; retain the existing required admin, JWT, Cloudinary, Gemini, and Razorpay variables documented in `backend/.env.example`.
- Frontend: set `VITE_API_URL` to the actual deployed backend base URL; retain `VITE_GOOGLE_MAPS_API_KEY`.
- No production frontend or backend hostname has been assumed or added. The example values are placeholders/local development values and must be replaced with actual hosting configuration.

### 8.3 Validation performed

| Check | Command / method | Result |
|---|---|---|
| Frontend production build | `cd veg-delivery-app; npm run build` | Passed with Vite 7.3.7. Existing chunk-size warning remains (one minified chunk exceeds 500 kB); build completed successfully. |
| Backend syntax | `cd backend; node --check server.js; node --check config/cors.js` | Passed. |
| API helper behavior | Isolated Node assertion harness (temporary test file removed afterward) | Passed: local development fallback, configured production URL normalization, and clear missing-production-config error. |
| CORS behavior | Isolated Express/HTTP assertion harness (temporary test file removed afterward) | Passed: multiple configured origins, allowed origin response, unexpected-origin 403, OPTIONS preflight methods/headers, localhost development policy, and no-Origin server-to-server request. Invalid origin paths are rejected. |
| Hardcoded backend URL scan | Ripgrep over `veg-delivery-app/src` | No hardcoded backend API URLs remain. `http://localhost:5000` appears only once in the shared helper behind `import.meta.env.DEV`. External Razorpay, Google Maps, and image/CDN URLs remain intentionally. |
| Whitespace / diff check | `git -c core.whitespace=cr-at-eol diff --check` | Passed. |
| Dependency files | `git diff --name-only -- backend/package.json backend/package-lock.json veg-delivery-app/package.json veg-delivery-app/package-lock.json` | The files were already modified before Phase 2; Phase 2 made no changes to them. |

An attempted supplemental command, `npm exec -- node --check server.js`, was incorrectly formed and unexpectedly started the backend. It connected using the locally configured Mongo URL; the process was stopped immediately after detection. No API requests, payment operations, or database writes were performed. This was not used as deployment verification.

### 8.4 Not verified

- The real production frontend URL is not yet known, so production CORS has not been tested against the eventual hosted frontend.
- The actual production `VITE_API_URL`, production environment variables, hosting behavior, and deployed browser flows have not been verified.
- No production payment flow or customer data was used.

## 9) Phase 3 backend order and payment security

Implementation date: 2026-10-28. No dependency manifest or lockfile was changed for Phase 3. MongoDB transaction support for the deployment topology was confirmed by the user; no database connection or live payment was used for validation.

### 9.1 Findings addressed

| Area | Before | Implemented behavior |
|---|---|---|
| Order pricing and validation | Client-supplied names, prices, and totals could influence persisted orders; the backend did not enforce the cart minimum. | `orderPricing.js` resolves products from MongoDB, uses database names and per-kilogram prices, validates 24-character product IDs, positive integer package counts, quarter-kilogram weight increments, aggregate stock, GPS coordinate ranges, and the ₹100 pre-discount minimum. It calculates line prices and totals in integer paise, preserving the existing 10% discount at subtotal ≥₹300 and 5% GST after discount; no delivery charge or new business rule was added. Client totals and prices are ignored. |
| Stock consistency | Stock updates were vulnerable to races and could partially apply before an order save failed. Online checkout did not reserve inventory. | COD creation and online reservation run inside MongoDB transactions. Product stock is decremented with conditional atomic updates (`stock >= requested weight`), in sorted product-ID order, so concurrent orders cannot oversell and failed transactions roll back the order and stock changes. COD stock is committed at placement. Online stock is reserved for 30 minutes and is restored once when the reservation is released. |
| Checkout idempotency | Repeated requests could create duplicate internal orders. | The client reuses a cart-fingerprint-scoped `Idempotency-Key`; the database has a partial unique index on customer and key. Same-key retries return the existing matching order; changed cart, location, or payment method is rejected. |
| Razorpay verification | Signature presence alone did not bind the provider payment to the internal order or verify its captured amount/currency. | Verification checks the HMAC-SHA256 signature over `razorpay_order_id|razorpay_payment_id` using `RAZORPAY_KEY_SECRET`, fetches the provider payment, checks its ID, Razorpay order ID, captured status, INR currency, and amount in paise against the server-calculated amount, then conditionally commits the order. Reverification of the same captured payment is idempotent; another payment cannot republish an already-paid order. |
| Expired/failed online checkouts | Inventory could remain unavailable or be restored without checking whether a payment was still in flight. | The user-facing failure/dismissal endpoint and the periodic reconciliation process query provider payments first. Failed/no-payment attempts release stock; unresolved `created`/`authorized` payments keep the reservation. A captured payment detected at or after the 30-minute expiry cannot be committed for delivery: stock is released transactionally and a full refund is attempted. Refund failures are logged and surfaced for manual follow-up. |
| COD | Client-calculated totals and stock availability were not independently enforced; retries could create accidental duplicate orders. | COD uses the same server pricing, minimum, product, quantity, and stock checks; it is authenticated, uses an idempotency key, records payment as pending (cash is not collected at order placement), and cannot be assigned through the admin endpoint unless the order is eligible. |
| Order access and role assignment | Order reads exposed order data without authenticating the caller, and public registration accepted an arbitrary account role. | All-orders reads require admin; customer order reads require the matching customer or admin; single-order reads/downloads require the owner, admin, or assigned delivery partner. Public registration permits only `user` or the existing `delivery` registration flow, not `admin` or arbitrary roles. Admin assignment and delivery status changes require the appropriate authenticated role, and delivery status transitions are constrained to the existing sequence. |

The COD vendor coordinates were restored to the pre-Phase-3 value to avoid changing existing COD delivery behavior. The online flow retains its prior vendor coordinates.

### 9.2 Files changed for Phase 3

- Backend: `backend/models/Order.js`, `backend/routes/authRoutes.js`, `backend/routes/orderRoutes.js`, `backend/routes/paymentRoutes.js`, `backend/server.js`.
- New backend services: `backend/services/orderPricing.js`, `backend/services/orderLifecycle.js`, `backend/services/paymentIntegrity.js`.
- New isolated tests: `backend/test/orderPricing.test.js`, `backend/test/paymentIntegrity.test.js`.
- Frontend request/auth integration: `veg-delivery-app/src/pages/Payment.jsx`, `veg-delivery-app/src/pages/AdminDashboard.jsx`, `veg-delivery-app/src/delivery/DeliveryDashboard.jsx`, `veg-delivery-app/src/pages/MyOrders.jsx`, `veg-delivery-app/src/pages/Delivery.jsx`.
- This report.

### 9.3 Validation performed

| Check | Command / method | Result |
|---|---|---|
| Backend isolated tests | `cd backend; node --test` | Passed: 11 tests covering trusted pricing, manipulated client prices and totals, product IDs, fractional weights, stock and minimum checks, idempotency comparison and unique-index definition, HMAC signatures, provider order/amount/currency/status matching, unresolved payment states, and payment/expiry dispositions. |
| Backend syntax | `node --check` for `server.js`, changed routes/services, and test files | Passed for all checked JavaScript files. The check did not start the server or connect to MongoDB. |
| Frontend production build | `cd veg-delivery-app; npm run build` | Passed with Vite 7.3.7. Existing bundle-size warning remains for the >500 kB main chunk. |
| Focused frontend lint | ESLint on the five touched frontend request pages/components | Did not pass: 9 errors and 5 warnings, all reported as unused existing imports/state or existing React hook dependency warnings. No lint fixes unrelated to Phase 3 were made. |
| Hardcoded API fallback scan | Ripgrep for `localhost:5000` and API-looking URLs under `veg-delivery-app/src` | Only the intended development-only localhost value in `src/config/api.js` and the unrelated Google Maps directions URL were found. |
| Diff whitespace | `git diff --check` | Passed. Git emitted line-ending normalization warnings for pre-existing modified package files; no Phase 3 dependency-file edits were made. |

No backend server startup was attempted: the server connects to the configured MongoDB URL at startup, and this phase did not require a live or unverified database. The test suite uses Node's built-in runner and in-memory inputs; it does not make Razorpay requests or connect to MongoDB.

### 9.4 Lifecycle, compatibility, and remaining risks

- COD lifecycle: authenticated request → authoritative pricing and validation → transaction creates the order and decrements stock → `paymentStatus: pending`, `stockReservationStatus: committed` → admin may assign an eligible order → delivery partner advances only the assigned order through the existing statuses.
- Online lifecycle: authenticated request with idempotency key → server prices cart → Razorpay order is created for the server amount in paise → Mongo transaction creates internal pending order and reserves stock for 30 minutes → provider payment is fetched and verified → before expiry, captured/amount-matching payment commits the reservation and marks the order paid; failed payments release stock only after provider state is no longer unresolved; after expiry, captured payment causes stock release and a full refund attempt instead of becoming deliverable.
- MongoDB transaction support is an operational prerequisite. The topology was confirmed by the user, but transaction execution, concurrent stock races, and rollback behavior were not exercised against a test database in this environment.
- The new partial unique checkout index must be present in MongoDB before relying on database-enforced idempotency. No index migration or production database operation was run; confirm index creation during a controlled rollout.
- Existing online orders created before this change may lack `stockReservationStatus`, `reservationExpiresAt`, server-calculated paise amounts, or the new idempotency key. Such pending legacy checkouts are not eligible for the new commit path and should be reconciled before rollout; no production migration was run.
- A `created` or `authorized` provider payment, a provider/API outage, or a provider amount/order mismatch can keep inventory reserved until resolved. This is intentionally safer than releasing stock while payment could still capture; manual operational reconciliation may be required.
- An automatic full-refund attempt is made after an expired reservation is released. Refunds are only marked processed after a matching full INR refund is returned by Razorpay or found by the refund-list API. Ambiguous outcomes remain pending and are reconciled without blindly resubmitting a refund; confirmed failures require manual follow-up.
- No Razorpay webhook is implemented. Reconciliation scans batches of up to 50 orders at startup and once per minute after MongoDB connection, advancing a cursor so older unresolved records do not permanently starve later ones. Online orders released from stock are checked for late captures and refund outcomes for 24 hours after release.
- The checkout model persists GPS coordinates, not a postal/street delivery address. No address field was invented or added; address capture/persistence remains an application limitation.
- Unit tests cover the pure validation, payment decision, and idempotency helpers. A MongoDB-backed integration test of duplicate route submissions, transaction contention, concurrent stock changes, and full COD/Razorpay routes remains unverified because no isolated test database or Razorpay sandbox credentials were configured. No live payment, production customer data, deployment, commit, or push was used.

## 10) Phase 4A database and transaction verification

Investigation and approved minimal remediations: 2026-10-28. No database connection, server startup, provider payment/refund, dependency change, commit, or deployment was performed.

### 10.1 Safe environment determination

- `backend/.env.test` and root `.env.test` are absent; `TEST_MONGO_URL` is not set in the process environment. A `backend/.env` file exists, but its contents were not read. No database URI values were printed.
- An isolated database could not be positively identified. Consequently, no MongoDB operation—including `listIndexes`, index creation, transaction smoke test, or cleanup—was attempted. Production data and credentials remain untouched.
- The user's prior confirmation that the deployment topology supports transactions is recorded, but the live topology and actual transaction capability were not independently verified in this phase.

### 10.2 Index definition and startup readiness

- `Order` declares the compound index `{ userEmail: 1, checkoutRequestId: 1 }` as unique, with partial filter `{ checkoutRequestId: { $type: "string" } }` in `backend/models/Order.js`. MongoDB's default index name is `userEmail_1_checkoutRequestId_1`.
- Legacy documents without a string `checkoutRequestId` do not participate. Existing documents with duplicate `(userEmail, checkoutRequestId)` pairs where the key is a string can prevent the unique index from being created. Existing data was not queried, so the presence of such duplicates is unknown.
- Mongoose's installed runtime reports `autoIndex: true` and automatically starts model initialization/index creation. Previously, `server.js` did not await that index build before listening, and Mongoose's implicit model initialization catches index errors. The approved fix makes startup await `Order.init()` before starting the scheduler or accepting requests. Index initialization errors now prevent the server from reaching `app.listen`; the deployment must ensure database permissions and resolve any duplicate-key conflict before rollout.
- Checkout idempotency depends on this unique index: route-level lookup and duplicate-key handling alone cannot prevent concurrent duplicate order creation without the database constraint. Payment HMAC and provider-payment matching do not themselves depend on the index.

### 10.3 Transaction source assessment

- `backend/services/orderLifecycle.js` starts sessions from Mongoose's default connection. `createReservedOrder` inserts the order, conditionally decrements each product, and checks product existence using the same session. `transitionOrder` conditionally changes the order and restores product stock in the same session.
- Both helpers use `session.withTransaction(...)`; the MongoDB driver/Mongoose transaction helper owns commit, abort, and transient-transaction retry behavior. Each helper calls `session.endSession()` in `finally`. There are no provider calls inside transaction callbacks. Mongoose transaction sessions require a supported replica-set or sharded topology; the code uses the default connection and does not itself configure or prove that topology.
- The stock decrement is guarded by `stock >= requestedWeight`; transition filters require the expected pending/reserved state. The order state and stock increments therefore commit or abort together when MongoDB honors the transaction. Repeated release attempts cannot restore stock twice because only the first matching state transition can perform the increment.
- These conclusions are source inspection plus mocked-session tests only. They are not evidence of a successful real transaction, transaction retry, or rollback on the deployed topology.

### 10.4 Lifecycle and race findings

- COD: trusted pricing and stock checks precede a transactional order insert/stock decrement. The order is committed for fulfillment with COD payment still pending; admin assignment is allowed for COD but not unpaid online orders. Delivery updates require the assigned delivery partner and valid status progression.
- Online: the Razorpay order is created outside the Mongo transaction; then the internal order and 30-minute stock reservation are written transactionally. This can leave an unused provider order if the DB reservation fails, but does not itself charge the customer or decrement stock.
- A successful payment commits only while the order remains pending/reserved and its reservation has not expired. Release also conditionally requires pending/reserved. If payment verification and expiry/cancellation race, the transactionally guarded order transition determines the winner; a released order cannot become deliverable through the normal assignment/status routes.
- The scheduled reconciliation starts only after MongoDB connects, performs an immediate pass, then runs once per minute. It handles up to 50 rows per pass. The approved cursor paging prevents a permanently unresolved first batch from starving later records within a running process; each process maintains its cursor in memory, so a restart begins scanning from the start.
- A cancellation/failure response can release inventory before the 30-minute reservation deadline if the provider currently reports no unresolved payment. The new 24-hour post-release monitoring window checks released online orders for a late captured payment and attempts the approved full refund.
- Refund attempts now use `refundStatus: pending` as a claim and are not blindly repeated after an ambiguous network or persistence failure. The worker queries Razorpay refund records and marks a refund processed only when it finds a matching full-amount INR refund for the expected payment. Unknown/incomplete records remain pending; confirmed failed refunds remain failed for manual follow-up. The worker does not claim that a refund succeeded solely because the refund request returned.
- Late-capture polling is bounded to 24 hours after stock release, per the user's choice. Captures discovered after that monitoring window, provider API outages, amount mismatches, and refunds that remain unknown require manual reconciliation. Multiple application replicas can run their own worker; database transition/refund claims prevent duplicate stock restoration and duplicate concurrent refund submissions, but provider-level behavior was not exercised.
- No webhook exists. Existing legacy released orders without the new `stockReleasedAt` timestamp are not included in the 24-hour recovery query and require separate rollout reconciliation.

### 10.5 Validation and remaining integration plan

| Category | Check | Result |
|---|---|---|
| Executed, non-networked | `cd backend; node --test` | Passed: 19 tests. Includes pricing/payment helpers, the declared index shape, mocked session propagation/cleanup/failure, repeated release protection, 24-hour/cursor query construction, and provider refund-state interpretation. |
| Executed, non-networked | `node --check` on changed backend routes, services, model, server, and tests | Passed. These commands do not start the server or connect to MongoDB. |
| Source inspection | Index declaration, transaction session propagation, conditional stock updates/state filters, scheduler startup, and delivery guards | Reviewed; see sections 10.2–10.4. |
| Requires isolated MongoDB | Index conflict/build/readiness, replica-set transaction smoke test, rollback after intermediate failure, concurrent last-stock contention, duplicate idempotency requests, parallel expiry/payment transitions, repeated release, and concurrent refund claims | Not run. No isolated test database was positively identified. |
| Requires deployment/provider verification | Actual MongoDB topology and permissions, index presence on deployment data, provider payment/refund lifecycle and webhook behavior | Not verified. No credentials were used and no provider API call was made. |

Executable plan after a dedicated isolated replica-set test database is configured and positively identified: use test-only product/order fixtures; first inspect fixture indexes and representative duplicate keys without revealing record data; await `Order.init()` and assert the unique index metadata; race two transactions for the last stock unit and assert exactly one order succeeds; submit the same customer/key concurrently and assert one order/reservation; inject a failure after order insertion and assert transaction rollback; race expiry processing against captured-payment verification and assert one terminal state and one stock restoration; repeat release/refund reconciliation and assert no duplicate stock increment or refund request. Tear down only the named test fixtures. Keep provider tests mocked; a separate Razorpay sandbox verification would require explicit later approval and sandbox credentials.
