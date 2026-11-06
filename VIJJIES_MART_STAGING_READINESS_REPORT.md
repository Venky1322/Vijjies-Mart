# VIJJIES-MART Staging Readiness Report

**Assessment date:** 6 November 2026  
**Scope:** Read-only inspection of repository configuration, environment templates, API/database/payment wiring, authentication, and deployment documentation. No environment-file contents were read, no services were started, and no API, database, or payment requests were made.  
**Readiness:** **NOT READY** to safely run backend-connected staging verification. The configured frontend API target is the local development default, and production-database / live-payment selection is not prevented by code.

## 1. Existing configuration

### Frontend

- `veg-delivery-app/src/config/api.js` selects `VITE_API_URL`, falling back to `http://localhost:5000` only in Vite development mode. A production build without `VITE_API_URL` logs and throws rather than silently using localhost.
- `veg-delivery-app/.env.example` contains a local API default and a placeholder Google Maps key.
- The local frontend `.env` exists, but its contents were not inspected. A separate process-level `VITE_API_URL` was not set during the previous environment inspection. The configured example/local API target is localhost, not a confirmed staging API.
- `VITE_API_URL` is part of frontend build configuration and should be set to the HTTPS staging API base before creating the staging frontend build. The Maps key is shipped to the browser and must be restricted by allowed websites and enabled APIs.

### Backend

- `backend/server.js` loads dotenv and reads `MONGO_URL`, `PORT` (default `5000`), `NODE_ENV`, and `FRONTEND_URL`.
- The backend `.env` exists locally, but its contents were not inspected. No backend service was started.
- `backend/.env.example` lists placeholders for the backend variables. There is no root `.env.example`.
- The backend calls `mongoose.connect(MONGO_URL)` directly, then initializes the order index before listening. The URI's database/cluster is therefore selected by the configured `MONGO_URL`.
- No code verifies that the selected Mongo host or database is a staging resource. `NODE_ENV` is used for CORS behavior, not to protect database selection.

### Payments

- The Razorpay client is configured using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; online checkout creates the provider order with backend-calculated INR paise.
- No `rzp_test_`/`rzp_live_` key-mode check, explicit payment-mode setting, or staging-only payment guard was found. The active credentials determine the provider mode.
- The public key ID is returned to the frontend for the hosted checkout. The secret key is used server-side and must never be placed in frontend configuration.
- Payment routes still require authentication and retain server-side payment verification. No payment endpoint was called.

### CORS and authentication

- `backend/config/cors.js` accepts comma-separated, explicit HTTP(S) frontend origins without a path. Production startup fails if `FRONTEND_URL` has no allowed origin. The CORS allowlist includes `Idempotency-Key` and the existing API headers.
- Non-production mode additionally permits localhost origins. Staging should set `NODE_ENV=production` and list only the staging frontend origin in `FRONTEND_URL`.
- Order and payment routes use `verifyToken`; customer checkout also checks the customer role. Admin and delivery routes use role checks. JWT validation uses `JWT_SECRET`.
- These controls are present in source but staging authentication and authorization have not been exercised against a running service.

### Deployment and database-test configuration

- No platform-specific Dockerfile, Render, Vercel, Netlify, Fly, Railway, Procfile, or similar deployment manifest was found in the inspected project directories. The README describes generic production hosting; it does not identify a staging hostname or provide a staging deployment configuration.
- `backend/test/compose.mongo.yml` describes a disposable, loopback-published replica-set container, but its Mongo image is marked provisional.
- The Mongo integration helper reads only `TEST_MONGO_URL`, validates a specific local database and replica-set identity, and includes Docker/container/marker checks. It currently refuses unconditionally until a separately reviewed, trusted Docker-locality verifier exists. The documented integration suite must remain disabled.

## 2. Missing configuration

- An approved HTTPS staging frontend origin and staging API base URL.
- Staging backend environment values provisioned in the hosting platform's secret/configuration store.
- A separately provisioned staging MongoDB cluster/database and restricted staging-only database credentials.
- A staging-only JWT secret and test accounts.
- Razorpay test-mode key pair, if online checkout needs to be tested later.
- A restricted staging Google Maps browser key if maps/location UI is to be exercised.
- Explicit decision on optional staging integrations (Cloudinary and Gemini) and their separate test credentials.
- An approved, safe Mongo integration-test environment and trusted locality verifier. The checked-in integration harness is presently fail-closed.

## 3. Required environment variables by name

Values must be configured locally or in the relevant hosting platform. Do not send secrets in chat or commit them.

### Backend runtime

- `NODE_ENV` — set to `production` for staging's production-like CORS policy.
- `PORT` — hosting platform's assigned listening port.
- `MONGO_URL` — staging-only MongoDB URI; never reuse production credentials or a production database.
- `FRONTEND_URL` — exact HTTPS staging frontend origin(s), comma-separated if there is more than one.
- `JWT_SECRET` — unique staging secret.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — staging-only admin credentials, not production credentials.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Razorpay test-mode pair only if payment sandbox testing is separately authorized.

### Backend integrations (only if needed in staging)

- `CLOUD_NAME`, `API_KEY`, `API_SECRET` — separate Cloudinary staging account/credentials if image upload is required.
- `GEMINI_API_KEY` — separately controlled key if recipe generation is needed.

### Frontend build

- `VITE_API_URL` — HTTPS staging API base URL, with no production hostname.
- `VITE_GOOGLE_MAPS_API_KEY` — browser key restricted to staging web origins and required Maps/Places APIs.

### Guarded Mongo integration suite

- The helper recognizes `RUN_MONGO_INTEGRATION_TESTS`, `TEST_MONGO_URL`, and `TEST_DOCKER_DAEMON_ID`; repository documentation also requires a dedicated local replica set and pre-provisioned database markers.
- **Do not set these to try to bypass the current guard.** The helper currently refuses before connecting. Do not use `MONGO_URL` for these tests.

## 4. Safe staging architecture

1. Deploy a separate staging frontend and backend on HTTPS subdomains owned by the project (for example, `staging.<owned-domain>` and `api-staging.<owned-domain>`). These are examples of a pattern, not configured URLs.
2. Set the frontend build's `VITE_API_URL` to the staging backend only. Set the backend `FRONTEND_URL` to the exact staging frontend origin.
3. Run staging with `NODE_ENV=production` so the production-style explicit CORS allowlist is applied.
4. Use a separate MongoDB project/cluster or otherwise demonstrably separate staging database, a distinct database name, and a least-privilege staging database user. Configure network access so the staging backend cannot reach production databases.
5. Store backend secrets only in the staging host's secret manager. Keep frontend build variables separate; only the Maps browser key belongs in frontend configuration.
6. Use synthetic product, inventory, customer, and admin data. Do not copy real customer records into staging.
7. Keep production credentials and production network access unavailable to staging deployments. Require a human configuration review before enabling checkout testing.
8. Use Razorpay test credentials only, verified in the provider dashboard before any explicitly approved sandbox checkout. Do not use live credentials in staging.

## 5. Database isolation assessment

- **Can the backend connect to a separate staging database?** Yes. Mongoose uses the URI supplied in `MONGO_URL`, so a separate staging URI/database can be configured.
- **Is isolation enforced by the current application?** No. There is no database-name/host guard, no environment-specific URI validation, and no code preventing `MONGO_URL` from pointing to production. Separation must be provided and verified by deployment configuration, database access control, and network policy.
- The local Mongo integration suite is not an alternative at present: its locality verifier is intentionally disabled, and the tests must not be enabled or pointed at a hosted/production database.

## 6. Razorpay test-mode assessment

- **Can test mode be selected?** By configuring a Razorpay test key pair in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, subject to provider-issued credentials.
- **Is accidental live mode prevented?** No. The backend does not check the key ID prefix or otherwise reject live credentials in a staging environment.
- Before a sandbox test, confirm in the Razorpay dashboard that the pair belongs to test mode, keep it only in staging backend secrets, and ensure the staging deployment has no access to live credentials. Do not initiate test or live payment flows until separately authorized.

## 7. Secret and test-data safety

- Root `.gitignore` excludes `.env` and `.env.*` while allowing `.env.example`; the frontend has equivalent ignore rules.
- Git's tracked-file listing showed the frontend and backend `.env.example` files, but not the actual `.env` files. The actual files are ignored. No broad repository credential scan was performed.
- The inspected `.env.example` files use placeholder values; no actual secret values were read. No root `.env.example` exists.
- No customer data was used in this assessment. Staging fixtures should be synthetic and should not be copied from production.
- This confirms the local environment files are ignored/untracked; it does not prove that no secret has ever been committed elsewhere in repository history.

## 8. Deployment prerequisites and risks

- Use a supported Node version from the package engine constraints (`^20.19.0` or `>=22.12.0`) for frontend and backend builds/runs.
- Supply `PORT`, staging-only `MONGO_URL`, and all required runtime secrets in the backend host. Ensure MongoDB transactions and the order idempotency index are supported and initialized before accepting checkout traffic.
- Supply `VITE_API_URL` at frontend build time and exact staging origin in `FRONTEND_URL`.
- Review hosting health checks, TLS, allowed egress, database IP/network access, logs, backups, and secret rotation before exposing staging.
- Existing risks: production database selection is not blocked by code; live Razorpay keys are not blocked by code; actual deployment/hosting configuration and production-like environment variables are absent from this repository; Mongo integration tests remain disabled.
- No configuration or business-logic change is recommended as part of this read-only assessment.

## 9. Recommended next task

Provision the isolated staging frontend/backend and database, configure the environment variables above in local/hosting secret stores, and independently verify the staging frontend origin, API host, database cluster/database identity, and Razorpay test-key mode. Only after these checks should a separately approved read-only catalog request or sandbox checkout test be considered. Do not enable the guarded Mongo integration suite until its locality-verifier requirements are separately resolved and reviewed.

## 10. Local configuration checklist

- [ ] Choose HTTPS staging frontend and API hostnames; do not use the production hostname.
- [ ] Configure frontend `VITE_API_URL` to the staging API and `VITE_GOOGLE_MAPS_API_KEY` to a staging-restricted browser key.
- [ ] Configure backend `NODE_ENV=production`, `PORT`, `FRONTEND_URL`, and a unique staging `JWT_SECRET`.
- [ ] Set backend `MONGO_URL` to a separately verified staging database using a staging-only least-privilege account; verify the cluster/database identity outside the application before launch.
- [ ] Configure staging-only `ADMIN_EMAIL` and `ADMIN_PASSWORD`; create synthetic customer/test accounts.
- [ ] If required, configure isolated Cloudinary/Gemini staging credentials using `CLOUD_NAME`, `API_KEY`, `API_SECRET`, and `GEMINI_API_KEY`.
- [ ] If and only if later approved for sandbox payment testing, configure a Razorpay test-mode `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` pair in backend secrets and verify test mode in the provider dashboard.
- [ ] Confirm no production DB credentials, live payment keys, or real customer data are available to staging.
- [ ] Confirm actual `.env` files remain ignored and untracked; never commit them.
- [ ] Leave `RUN_MONGO_INTEGRATION_TESTS` disabled until the documented locality guard is safely resolved.
- [ ] Provide the non-secret staging API base URL only when requesting a later read-only catalog verification; never provide keys, passwords, tokens, or Mongo URIs in chat.
