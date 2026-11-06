# Isolated MongoDB integration tests

These tests are opt-in and must only target the dedicated disposable replica set
described here. Do not use `MONGO_URL`; the guarded test helper reads only
`TEST_MONGO_URL` and never loads dotenv files.

## Review before first use

- `compose.mongo.yml` pins `mongo:7.0.0` as a provisional version. Review the
  image patch/security status and confirm compatibility with the intended
  MongoDB server policy before starting it.
- The Compose service has no persistent volume and publishes the MongoDB port
  only on `127.0.0.1`. This does not prove that the selected Docker daemon is
  local. The safety helper currently refuses unconditionally at the start of
  `connectTestMongo()`, before URL parsing, Mongoose state inspection,
  connections, or database setup. Do not enable integration execution until a
  platform-appropriate verifier establishes Docker locality from an
  independently trusted source and its implementation has been separately
  reviewed and approved. A caller-supplied daemon ID, environment variable,
  approval flag, IPC endpoint, or daemon self-report is not sufficient proof.
  If locality cannot be established independently, keep the suite blocked.
- Replica-set initialization is intentionally separate from Compose startup.
  An operator must confirm the Docker container identity and initialize the
  single-member set using `localhost:27017` before tests can connect.
- Before enabling tests, an operator must independently verify the replica-set
  and database identity, then provision the marker documents below. The helper
  only reads markers; it does not create, repair, or remove them.
- `TEST_MONGO_URL` must be exactly the loopback URI for the primary test
  database. Credentials, alternate hosts, ports, database names, or replica-set
  names are rejected. The helper then verifies the server-reported set name and
  member address.
- A database name or marker alone is not proof of isolation. Tests also require
  the inspected local Compose container, loopback-only port binding, expected
  server replica-set identity, and a separately provisioned marker.
- The index-conflict test requires a second, separately marked database with no
  `orders` collection. It refuses to reuse a database where that collection
  already exists. It never drops a database, collection, or index.
- Before setup, the helper permits only the marker and the expected empty
  `orders`/`products` collections in the primary test database, and only the
  marker collection in the index-conflict database. It refuses unexpected
  collections or pre-existing documents.
- Cleanup deletes only document IDs generated and recorded by the current test
  process. Review the target and marker before enabling the opt-in flag.
- The legacy conflict test restores the intended index after deleting its
  fixtures. Repeating the suite requires a fresh disposable container because
  the conflict database is intentionally left with the `orders` collection and
  the container has no persistent volume.

## Future operator setup

These commands are documentation only; they were not run as part of the code
change. They must not be used to enable or run integration tests until the
independently trusted Docker-locality verifier is implemented, reviewed, and
approved. The helper currently refuses integration setup unconditionally.

1. Start only the dedicated service:

   ```powershell
   docker compose -f backend\test\compose.mongo.yml up -d
   ```

2. Independently inspect the named container and confirm the published port is
   bound to `127.0.0.1`. Initialize the single-node replica set separately:

   ```powershell
   docker exec vijjies-mart-test-mongo mongosh --quiet --eval 'rs.initiate({_id:"vj-test-rs",members:[{_id:0,host:"localhost:27017"}]})'
   ```

3. After independently confirming the server reports `vj-test-rs` and
   `localhost:27017`, provision—not from the integration tests—one marker in
   each database. Each marker has this exact shape, with its corresponding
   database name and marker ID:

   ```javascript
   {
     _id: "approved-main-integration-db",
     environment: "test",
     database: "vijjies_mart_integration_test",
     replicaSet: "vj-test-rs",
     container: "vijjies-mart-test-mongo",
     purpose: "vijjies-mart-integration-tests"
   }
   ```

   The conflict database uses `_id:
   "approved-index-conflict-db"` and `database:
   "vijjies_mart_index_conflict_test"`. Provisioning these markers is an
   explicit operator action, separate from test execution.

4. Only after the independent locality verifier and all target checks are
   reviewed and approved, set:

   ```powershell
   $env:RUN_MONGO_INTEGRATION_TESTS = "1"
   $env:TEST_MONGO_URL = "mongodb://127.0.0.1:27017/vijjies_mart_integration_test?replicaSet=vj-test-rs"
   ```

5. Explicitly select the integration file:

   ```powershell
   Set-Location backend
   node --test test\integration\orderLifecycle.integration.test.js
   ```

Normal `node --test` execution skips the integration suite unless the opt-in
flag is exactly `1`. Even when explicitly selected and enabled, the current
helper refuses before connecting to MongoDB.

## Coverage

The guarded suite checks the unique partial checkout index, duplicate customer
checkout keys, rollback after an injected write failure, concurrent
last-stock reservations, repeated stock release, and duplicate legacy keys in
the separately marked conflict database. It also verifies release of an
expired reservation and rejection of a captured-payment commit. Provider/network
behavior is mocked or not invoked.
