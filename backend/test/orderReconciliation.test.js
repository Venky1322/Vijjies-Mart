const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RECONCILIATION_WINDOW_MS,
  buildOrderReconciliationQuery,
  resolveRefundStatus,
} = require("../services/orderReconciliation");

test("reconciliation scans expired reservations, recent releases, and pending refunds", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const query = buildOrderReconciliationQuery(now);
  const states = query.$and[0].$or;

  assert.equal(query.paymentMethod, "ONLINE");
  assert.deepEqual(states[0], {
    paymentStatus: "pending",
    stockReservationStatus: "reserved",
    reservationExpiresAt: { $lte: now },
  });
  assert.deepEqual(states[1], {
    paymentStatus: "failed",
    stockReservationStatus: "released",
    stockReleasedAt: {
      $gte: new Date(now.getTime() - RECONCILIATION_WINDOW_MS),
    },
    refundStatus: { $in: ["none", "pending", "failed"] },
  });
  assert.deepEqual(states[2], {
    paymentStatus: "failed",
    stockReservationStatus: "released",
    refundStatus: "pending",
  });
});

test("reconciliation keeps pending refunds eligible beyond the 24-hour window", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const states = buildOrderReconciliationQuery(now).$and[0].$or;

  assert.ok(
    states.some(
      (state) =>
        state.paymentStatus === "failed" &&
        state.stockReservationStatus === "released" &&
        state.refundStatus === "pending" &&
        !state.stockReleasedAt
    )
  );
});

test("reconciliation cursor advances by creation time and ID", () => {
  const cursor = {
    createdAt: new Date("2026-10-27T12:00:00Z"),
    _id: "64a1b2c3d4e5f67890123456",
  };
  const query = buildOrderReconciliationQuery(new Date(), cursor);
  const cursorFilter = query.$and[1].$or;

  assert.deepEqual(cursorFilter, [
    { createdAt: { $gt: cursor.createdAt } },
    { createdAt: cursor.createdAt, _id: { $gt: cursor._id } },
  ]);
});

test("refund reconciliation recognizes only a matching, processed full INR refund", () => {
  const fullRefund = {
    id: "rfnd_test_1",
    payment_id: "pay_test_1",
    amount: 10500,
    currency: "INR",
    status: "processed",
  };
  assert.deepEqual(
    resolveRefundStatus([fullRefund], "pay_test_1", 10500),
    { status: "processed", refundId: "rfnd_test_1" }
  );
  assert.deepEqual(
    resolveRefundStatus(
      [{ ...fullRefund, amount: 10000 }],
      "pay_test_1",
      10500
    ),
    { status: "pending" }
  );
  assert.deepEqual(
    resolveRefundStatus(
      [{ ...fullRefund, payment_id: "another_payment" }],
      "pay_test_1",
      10500
    ),
    { status: "pending" }
  );
});

test("keeps unknown and pending refund outcomes unresolved", () => {
  assert.deepEqual(resolveRefundStatus([], "pay_test_1", 10500), {
    status: "pending",
  });
  assert.deepEqual(
    resolveRefundStatus(
      [
        {
          payment_id: "pay_test_1",
          amount: 10500,
          currency: "INR",
          status: "pending",
        },
      ],
      "pay_test_1",
      10500
    ),
    { status: "pending" }
  );
});

test("marks a refund failed only when all provider records report failure", () => {
  assert.deepEqual(
    resolveRefundStatus(
      [
        { payment_id: "pay_test_1", status: "failed" },
        { payment_id: "pay_test_1", status: "failed" },
      ],
      "pay_test_1",
      10500
    ),
    { status: "failed" }
  );
  assert.deepEqual(
    resolveRefundStatus(
      [
        { payment_id: "pay_test_1", status: "failed" },
        { payment_id: "pay_test_1", status: "pending" },
      ],
      "pay_test_1",
      10500
    ),
    { status: "pending" }
  );
});
