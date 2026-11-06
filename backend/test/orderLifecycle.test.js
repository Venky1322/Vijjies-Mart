const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  createReservedOrder,
  transitionOrder,
} = require("../services/orderLifecycle");

const productId = "64a1b2c3d4e5f67890123456";
const makeSession = () => ({
  ended: false,
  committed: false,
  aborted: false,
  async withTransaction(callback) {
    try {
      const result = await callback();
      this.committed = true;
      return result;
    } catch (error) {
      this.aborted = true;
      throw error;
    }
  },
  async endSession() {
    this.ended = true;
  },
});

test("creates the order and reserves stock using one session, then ends the session", async (t) => {
  const session = makeSession();
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  const orderData = {
    items: [{ productId, weight: 0.25, quantity: 2 }],
  };
  let orderCreateSession;
  let stockUpdateSession;
  const Order = {
    create: async ([data], options) => {
      orderCreateSession = options.session;
      return [{ ...data, _id: "order-id" }];
    },
  };
  const Product = {
    findOneAndUpdate: async (_filter, _update, options) => {
      stockUpdateSession = options.session;
      return { _id: productId };
    },
  };

  const order = await createReservedOrder({ Order, Product, orderData });

  assert.equal(order._id, "order-id");
  assert.equal(orderCreateSession, session);
  assert.equal(stockUpdateSession, session);
  assert.equal(session.committed, true);
  assert.equal(session.ended, true);
});

test("aborts failed stock reservation and still ends the session", async (t) => {
  const session = makeSession();
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  let orderCreateSession;
  let existenceCheckSession;
  const Order = {
    create: async (_orders, options) => {
      orderCreateSession = options.session;
      return [{ _id: "order-id" }];
    },
  };
  const Product = {
    findOneAndUpdate: async () => null,
    exists: () => ({
      session: async (passedSession) => {
        existenceCheckSession = passedSession;
        return { _id: productId };
      },
    }),
  };

  await assert.rejects(
    createReservedOrder({
      Order,
      Product,
      orderData: {
        items: [{ productId, weight: 1, quantity: 1 }],
      },
    }),
    /Insufficient stock/
  );
  assert.equal(orderCreateSession, session);
  assert.equal(existenceCheckSession, session);
  assert.equal(session.aborted, true);
  assert.equal(session.ended, true);
});

test("restores stock only for the first successful release transition", async (t) => {
  const firstSession = makeSession();
  const secondSession = makeSession();
  const sessions = [firstSession, secondSession];
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => sessions.shift();
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  let transitionCount = 0;
  let stockRestoreCount = 0;
  const transitionSessions = [];
  let restoreSession;
  const Order = {
    findOneAndUpdate: async (_filter, _update, options) => {
      transitionSessions.push(options.session);
      transitionCount += 1;
      return transitionCount === 1
        ? {
            items: [{ productId, weight: 0.5, quantity: 2 }],
          }
        : null;
    },
  };
  const Product = {
    updateOne: async (_filter, _update, options) => {
      restoreSession = options.session;
    },
  };
  const args = {
    Order,
    Product,
    orderId: "order-id",
    filter: {
      paymentStatus: "pending",
      stockReservationStatus: "reserved",
    },
    update: {
      $set: {
        paymentStatus: "failed",
        stockReservationStatus: "released",
      },
    },
    restoreStock: true,
  };
  const originalUpdateOne = Product.updateOne;
  Product.updateOne = async (...callArgs) => {
    stockRestoreCount += 1;
    return originalUpdateOne(...callArgs);
  };

  const first = await transitionOrder(args);
  const second = await transitionOrder(args);

  assert.ok(first);
  assert.equal(second, undefined);
  assert.equal(stockRestoreCount, 1);
  assert.equal(restoreSession, firstSession);
  assert.deepEqual(transitionSessions, [firstSession, secondSession]);
  assert.equal(firstSession.committed, true);
  assert.equal(secondSession.committed, true);
  assert.equal(firstSession.ended, true);
  assert.equal(secondSession.ended, true);
  assert.equal(sessions.length, 0);
});
