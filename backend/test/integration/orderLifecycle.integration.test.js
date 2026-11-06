const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const {
  commitCapturedOrder,
  createReservedOrder,
  releaseOrderReservation,
} = require("../../services/orderLifecycle");
const { isCapturedPaymentForOrder } = require("../../services/paymentIntegrity");
const {
  connectTestMongo,
  isIntegrationEnabled,
} = require("../mongoIntegrationSafety");

const INDEX_CONFLICT_DATABASE = "vijjies_mart_index_conflict_test";

test(
  "isolated MongoDB order lifecycle integration",
  { skip: !isIntegrationEnabled() },
  async (t) => {
    const fixtureIds = {
      orders: [],
      products: [],
    };
    let safety;
    let databaseVerified = false;

    t.after(async () => {
      try {
        if (databaseVerified) {
          await safety.getVerifiedDatabase("vijjies_mart_integration_test");
          if (fixtureIds.orders.length > 0) {
            await Order.deleteMany({ _id: { $in: fixtureIds.orders } });
          }
          if (fixtureIds.products.length > 0) {
            await Product.deleteMany({ _id: { $in: fixtureIds.products } });
          }
        }
      } finally {
        await safety?.disconnect();
      }
    });

    safety = await connectTestMongo();
    databaseVerified = true;
    await safety.assertTestDatabaseReady("vijjies_mart_integration_test");
    await Order.createIndexes();

    const checkoutIndex = Order.schema.indexes().find(
      ([fields]) => fields.userEmail === 1 && fields.checkoutRequestId === 1
    );
    assert.ok(checkoutIndex, "Order schema must declare the checkout index");

    await t.test("builds the unique partial checkout index", async () => {
      const indexes = await Order.collection.indexes();
      const index = indexes.find(
        (candidate) => candidate.name === "userEmail_1_checkoutRequestId_1"
      );

      assert.ok(index);
      assert.equal(index.unique, true);
      assert.deepEqual(index.partialFilterExpression, {
        checkoutRequestId: { $type: "string" },
      });
    });

    await t.test("rejects duplicate customer checkout keys", async () => {
      const userEmail = `integration-${new mongoose.Types.ObjectId()}@example.test`;
      const checkoutRequestId = `checkout-${new mongoose.Types.ObjectId()}`;
      const firstId = new mongoose.Types.ObjectId();
      const duplicateId = new mongoose.Types.ObjectId();
      fixtureIds.orders.push(firstId, duplicateId);

      await Order.create({
        _id: firstId,
        userEmail,
        checkoutRequestId,
        total: 100,
      });

      await assert.rejects(
        Order.create({
          _id: duplicateId,
          userEmail,
          checkoutRequestId,
          total: 100,
        }),
        (error) => error.code === 11000
      );
    });

    await t.test("rolls back order and prior stock writes after an injected failure", async () => {
      const firstProductId = new mongoose.Types.ObjectId();
      const secondProductId = new mongoose.Types.ObjectId();
      const sortedIds = [firstProductId, secondProductId].sort((a, b) =>
        a.toString().localeCompare(b.toString())
      );
      const productIds = sortedIds.map((id) => new mongoose.Types.ObjectId(id));
      const products = productIds.map((id) => ({
        _id: id,
        name: "Integration product",
        pricePerKg: 100,
        stock: 1,
        image: "integration-test",
      }));
      fixtureIds.products.push(...productIds);
      await Product.create(products);

      const orderId = new mongoose.Types.ObjectId();
      fixtureIds.orders.push(orderId);
      const orderData = makeOrderData({
        orderId,
        userEmail: `rollback-${new mongoose.Types.ObjectId()}@example.test`,
        checkoutRequestId: `rollback-${new mongoose.Types.ObjectId()}`,
        items: productIds.map((productId) => ({
          productId,
          name: "Integration product",
          quantity: 1,
          price: 100,
          weight: 1,
        })),
      });

      const originalFindOneAndUpdate = Product.findOneAndUpdate;
      let stockUpdateCalls = 0;
      Product.findOneAndUpdate = function (...args) {
        stockUpdateCalls += 1;
        if (stockUpdateCalls === 2) {
          return Promise.reject(new Error("Injected integration failure"));
        }
        return originalFindOneAndUpdate.apply(this, args);
      };

      try {
        await assert.rejects(
          createReservedOrder({ Order, Product, orderData }),
          /Injected integration failure/
        );
      } finally {
        Product.findOneAndUpdate = originalFindOneAndUpdate;
      }

      const storedOrder = await Order.findById(orderId);
      const storedProducts = await Product.find({ _id: { $in: productIds } }).lean();
      assert.equal(storedOrder, null);
      assert.deepEqual(
        storedProducts.map((product) => product.stock),
        [1, 1]
      );
    });

    await t.test("allows only one reservation for the last stock", async () => {
      const productId = new mongoose.Types.ObjectId();
      fixtureIds.products.push(productId);
      await Product.create({
        _id: productId,
        name: "Last item",
        pricePerKg: 100,
        stock: 1,
        image: "integration-test",
      });

      const orderIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      fixtureIds.orders.push(...orderIds);
      const requests = orderIds.map((orderId) =>
        createReservedOrder({
          Order,
          Product,
          orderData: makeOrderData({
            orderId,
            userEmail: `stock-${orderId}@example.test`,
            checkoutRequestId: `stock-${orderId}`,
            items: [
              {
                productId,
                name: "Last item",
                quantity: 1,
                price: 100,
                weight: 1,
              },
            ],
          }),
        })
      );

      const results = await Promise.allSettled(requests);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      assert.equal((await Product.findById(productId).lean()).stock, 0);
      assert.equal(
        await Order.countDocuments({ _id: { $in: orderIds } }),
        1
      );
    });

    await t.test("releases an expired reservation and rejects captured payment commit", async () => {
      const productId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      fixtureIds.products.push(productId);
      fixtureIds.orders.push(orderId);

      await Product.create({
        _id: productId,
        name: "Expired item",
        pricePerKg: 100,
        stock: 0,
        image: "integration-test",
      });
      const order = await Order.create(
        makeOrderData({
          orderId,
          userEmail: `expiry-${orderId}@example.test`,
          checkoutRequestId: `expiry-${orderId}`,
          paymentMethod: "ONLINE",
          paymentStatus: "pending",
          razorpayOrderId: `provider-order-${orderId}`,
          paymentAmount: 10_000,
          stockReservationStatus: "reserved",
          reservationExpiresAt: new Date(Date.now() - 60_000),
          items: [
            {
              productId,
              name: "Expired item",
              quantity: 1,
              price: 100,
              weight: 1,
            },
          ],
        })
      );

      const mockedProvider = {
        async fetchCapturedPayment() {
          return {
            id: `payment-${orderId}`,
            order_id: `provider-order-${orderId}`,
            amount: 10_000,
            currency: "INR",
            status: "captured",
          };
        },
      };
      const payment = await mockedProvider.fetchCapturedPayment();
      assert.equal(isCapturedPaymentForOrder(payment, order), true);
      const [released, committed] = await Promise.all([
        releaseOrderReservation({ Order, Product, order }),
        commitCapturedOrder({ Order, Product, order, payment }),
      ]);

      assert.ok(released);
      assert.equal(committed, undefined);
      const storedOrder = await Order.findById(orderId).lean();
      assert.equal(storedOrder.paymentStatus, "failed");
      assert.equal(storedOrder.stockReservationStatus, "released");
      assert.equal((await Product.findById(productId).lean()).stock, 1);
    });

    await t.test("repeated stock release restores inventory only once", async () => {
      const productId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      fixtureIds.products.push(productId);
      fixtureIds.orders.push(orderId);

      await Product.create({
        _id: productId,
        name: "Releasable item",
        pricePerKg: 100,
        stock: 0,
        image: "integration-test",
      });
      const order = await Order.create(
        makeOrderData({
          orderId,
          userEmail: `release-${orderId}@example.test`,
          checkoutRequestId: `release-${orderId}`,
          paymentStatus: "pending",
          stockReservationStatus: "reserved",
          reservationExpiresAt: new Date(Date.now() - 60_000),
          items: [
            {
              productId,
              name: "Releasable item",
              quantity: 1,
              price: 100,
              weight: 1,
            },
          ],
        })
      );

      const firstRelease = await releaseOrderReservation({ Order, Product, order });
      const repeatedRelease = await releaseOrderReservation({ Order, Product, order });

      assert.ok(firstRelease);
      assert.equal(repeatedRelease, undefined);
      assert.equal((await Product.findById(productId).lean()).stock, 1);
    });

    await t.test("detects legacy duplicate keys in the separately marked conflict database", async () => {
      const conflictDatabase =
        await safety.assertTestDatabaseReady(INDEX_CONFLICT_DATABASE);
      const ordersCollectionExists =
        await conflictDatabase
          .listCollections({ name: "orders" }, { nameOnly: true })
          .hasNext();

      assert.equal(
        ordersCollectionExists,
        false,
        "Index-conflict database must have no orders collection; refusing to reuse it"
      );

      const conflictConnection = mongoose.connection.useDb(INDEX_CONFLICT_DATABASE);
      const ConflictOrder = conflictConnection.model(
        "LegacyConflictOrder",
        Order.schema,
        "orders"
      );
      const conflictCollection = conflictDatabase.collection("orders");
      const orderIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      const userEmail = `legacy-${new mongoose.Types.ObjectId()}@example.test`;
      const checkoutRequestId = `legacy-${new mongoose.Types.ObjectId()}`;

      try {
        await conflictCollection.insertMany(
          orderIds.map((_id) => ({
            _id,
            userEmail,
            checkoutRequestId,
            total: 100,
            items: [],
          }))
        );

        await assert.rejects(
          ConflictOrder.createIndexes(),
          (error) => error.code === 11000
        );
      } finally {
        const verifiedConflictDatabase =
          await safety.getVerifiedDatabase(INDEX_CONFLICT_DATABASE);
        const verifiedConflictCollection =
          verifiedConflictDatabase.collection("orders");
        await verifiedConflictCollection.deleteMany({ _id: { $in: orderIds } });
        const collectionStillExists = await verifiedConflictDatabase
          .listCollections({ name: "orders" }, { nameOnly: true })
          .hasNext();
        if (collectionStillExists) {
          const indexes = await verifiedConflictCollection.indexes();
          if (
            !indexes.some(
              (index) => index.name === "userEmail_1_checkoutRequestId_1"
            )
          ) {
            const [fields, options] = checkoutIndex;
            await verifiedConflictCollection.createIndex(fields, options);
          }
        }
      }
    });
  }
);

function makeOrderData({
  orderId,
  userEmail,
  checkoutRequestId,
  items = [],
  paymentMethod = "COD",
  paymentStatus = "pending",
  razorpayOrderId = "",
  paymentAmount = 0,
  stockReservationStatus = "committed",
  reservationExpiresAt = null,
}) {
  return {
    _id: orderId,
    userEmail,
    checkoutRequestId,
    items,
    total: 100,
    paymentMethod,
    paymentStatus,
    razorpayOrderId,
    paymentAmount,
    stockReservationStatus,
    reservationExpiresAt,
  };
}
