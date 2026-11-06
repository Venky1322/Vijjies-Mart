const { execFileSync } = require("node:child_process");
const mongoose = require("mongoose");

const MONGO_CONTAINER = "vijjies-mart-test-mongo";
const MONGO_IMAGE = "mongo:7.0.0";
const REPLICA_SET = "vj-test-rs";
const MONGO_MEMBER = "localhost:27017";
const MONGO_PORT = 27017;
const MARKER_COLLECTION = "__vj_integration_safety";
const PRIMARY_DATABASE = "vijjies_mart_integration_test";
const DATABASE_MARKERS = {
  [PRIMARY_DATABASE]: "approved-main-integration-db",
  vijjies_mart_index_conflict_test: "approved-index-conflict-db",
};

const isIntegrationEnabled = () =>
  process.env.RUN_MONGO_INTEGRATION_TESTS === "1";

const refuseUntilTrustedDockerLocalityVerifierExists = async () => {
  throw new Error(
    "MongoDB integration setup is disabled until an independently trusted Docker locality verifier is implemented and reviewed"
  );
};

const parseTestMongoUrl = () => {
  if (!isIntegrationEnabled()) {
    throw new Error("MongoDB integration tests are not explicitly enabled");
  }

  const value = process.env.TEST_MONGO_URL;
  if (!value) {
    throw new Error("TEST_MONGO_URL is required for MongoDB integration tests");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_MONGO_URL is invalid; connection details were not displayed");
  }

  const databaseName = url.pathname.slice(1);
  const parameters = [...url.searchParams.entries()];
  if (
    url.protocol !== "mongodb:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== String(MONGO_PORT) ||
    url.username ||
    url.password ||
    url.hash ||
    databaseName !== PRIMARY_DATABASE ||
    parameters.length !== 1 ||
    parameters[0][0] !== "replicaSet" ||
    parameters[0][1] !== REPLICA_SET
  ) {
    throw new Error(
      "TEST_MONGO_URL must target the approved loopback MongoDB test replica set; connection details were not displayed"
    );
  }

  return { url: value, databaseName };
};

const inspectExpectedContainer = (expectedContainerId = null) => {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT) {
    throw new Error(
      "Explicit Docker endpoint overrides are not allowed for MongoDB integration tests"
    );
  }

  let dockerEndpoint;
  try {
    const output = execFileSync("docker", ["context", "inspect"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const [context] = JSON.parse(output);
    dockerEndpoint = context?.Endpoints?.docker?.Host;
  } catch {
    throw new Error("Unable to verify that Docker uses a local daemon");
  }

  if (
    typeof dockerEndpoint !== "string" ||
    !(dockerEndpoint.startsWith("npipe://") || dockerEndpoint.startsWith("unix://"))
  ) {
    throw new Error("MongoDB integration tests require a local Docker daemon");
  }

  const expectedDaemonId = process.env.TEST_DOCKER_DAEMON_ID;
  if (!expectedDaemonId) {
    throw new Error(
      "TEST_DOCKER_DAEMON_ID must identify the independently verified local Docker daemon"
    );
  }

  let daemonId;
  try {
    daemonId = execFileSync("docker", ["info", "--format", "{{.ID}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("Unable to independently verify the Docker daemon identity");
  }

  if (!daemonId || daemonId !== expectedDaemonId) {
    throw new Error(
      "The connected Docker daemon identity did not match the independently verified local daemon"
    );
  }

  let container;
  try {
    const output = execFileSync("docker", ["inspect", MONGO_CONTAINER], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    [container] = JSON.parse(output);
  } catch {
    throw new Error(
      "Unable to independently verify the expected local MongoDB test container"
    );
  }

  const binding = container?.HostConfig?.PortBindings?.["27017/tcp"]?.[0];
  const valid =
    typeof container?.Id === "string" &&
    (!expectedContainerId || container.Id === expectedContainerId) &&
    container?.Name === `/${MONGO_CONTAINER}` &&
    container?.Config?.Image === MONGO_IMAGE &&
    container?.Config?.Hostname === MONGO_CONTAINER &&
    container?.Config?.Labels?.["com.docker.compose.service"] === "mongo" &&
    container?.Config?.Labels?.["org.vijjies-mart.test-environment"] === "true" &&
    container?.State?.Running === true &&
    binding?.HostIp === "127.0.0.1" &&
    binding?.HostPort === String(MONGO_PORT);

  if (!valid) {
    throw new Error(
      "The MongoDB container identity or loopback-only port binding did not match the approved test configuration"
    );
  }

  return container.Id;
};

const verifyReplicaSet = async (database) => {
  let hello;
  try {
    hello = await database.admin().command({ hello: 1 });
  } catch {
    throw new Error("Unable to verify the MongoDB replica-set identity");
  }

  if (
    hello.setName !== REPLICA_SET ||
    hello.isWritablePrimary !== true ||
    hello.me !== MONGO_MEMBER ||
    !Array.isArray(hello.hosts) ||
    !hello.hosts.includes(MONGO_MEMBER)
  ) {
    throw new Error("Connected MongoDB member did not match the approved test replica set");
  }
};

const verifyDatabaseMarker = async (database, databaseName) => {
  const markerId = DATABASE_MARKERS[databaseName];
  if (!markerId) {
    throw new Error("Database is not an approved MongoDB integration-test target");
  }

  let marker;
  try {
    marker = await database.collection(MARKER_COLLECTION).findOne({ _id: markerId });
  } catch {
    throw new Error("Unable to read the independently provisioned test marker");
  }

  if (
    marker?.environment !== "test" ||
    marker?.database !== databaseName ||
    marker?.replicaSet !== REPLICA_SET ||
    marker?.container !== MONGO_CONTAINER ||
    marker?.purpose !== "vijjies-mart-integration-tests"
  ) {
    throw new Error(
      "The required independently provisioned test marker is absent or mismatched; refusing database operations"
    );
  }
};

const verifyDatabaseIsTestOnly = async (database, databaseName) => {
  const allowedCollections =
    databaseName === PRIMARY_DATABASE
      ? new Set([MARKER_COLLECTION, "orders", "products"])
      : new Set([MARKER_COLLECTION]);
  const collections = await database.listCollections({}, { nameOnly: true }).toArray();

  if (collections.some(({ name }) => !allowedCollections.has(name))) {
    throw new Error(
      "MongoDB test database contains an unexpected collection; refusing test setup"
    );
  }

  if (
    (await database.collection(MARKER_COLLECTION).countDocuments()) !== 1 ||
    (databaseName === PRIMARY_DATABASE &&
      ((await database.collection("orders").countDocuments()) !== 0 ||
        (await database.collection("products").countDocuments()) !== 0)) ||
    (databaseName !== PRIMARY_DATABASE &&
      collections.some(({ name }) => name === "orders"))
  ) {
    throw new Error(
      "MongoDB test database is not empty except for its safety marker; refusing test setup"
    );
  }
};

const connectTestMongo = async () => {
  await refuseUntilTrustedDockerLocalityVerifierExists();

  const target = parseTestMongoUrl();

  if (mongoose.connection.readyState !== 0) {
    throw new Error("Mongoose already has an active connection; refusing test setup");
  }

  const containerId = inspectExpectedContainer();

  try {
    await mongoose.connect(target.url, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    });
  } catch {
    throw new Error("Unable to connect to the approved local test MongoDB");
  }

  const database = mongoose.connection.db;
  if (!database || database.databaseName !== target.databaseName) {
    await mongoose.disconnect();
    throw new Error("Connected MongoDB database did not match the approved test target");
  }

  try {
    inspectExpectedContainer(containerId);
    await verifyReplicaSet(database);
    await verifyDatabaseMarker(database, target.databaseName);
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }

  let containerVerified = true;
  return {
    database,
    async getVerifiedDatabase(databaseName) {
      if (!containerVerified || !Object.hasOwn(DATABASE_MARKERS, databaseName)) {
        throw new Error("Database is not an approved MongoDB integration-test target");
      }

      inspectExpectedContainer(containerId);
      const targetDatabase = mongoose.connection.useDb(databaseName).db;
      if (!targetDatabase || targetDatabase.databaseName !== databaseName) {
        throw new Error("MongoDB database selection did not match the approved target");
      }

      await verifyReplicaSet(targetDatabase);
      await verifyDatabaseMarker(targetDatabase, databaseName);
      return targetDatabase;
    },
    async assertTestDatabaseReady(databaseName) {
      const targetDatabase = await this.getVerifiedDatabase(databaseName);
      await verifyDatabaseIsTestOnly(targetDatabase, databaseName);
      return targetDatabase;
    },
    async disconnect() {
      containerVerified = false;
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    },
  };
};

module.exports = {
  connectTestMongo,
  isIntegrationEnabled,
};
