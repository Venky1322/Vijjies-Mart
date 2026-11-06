const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  getPaymentDisposition,
  hasUnresolvedPayment,
  isCapturedPaymentForOrder,
  verifyRazorpaySignature,
} = require("../services/paymentIntegrity");

const secret = "test-only-secret";
const order = {
  razorpayOrderId: "order_test_123",
  paymentAmount: 10500,
};

const sign = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

test("validates the Razorpay HMAC input and rejects invalid signatures", () => {
  const signature = sign(order.razorpayOrderId, "pay_test_123");
  assert.equal(
    verifyRazorpaySignature(order.razorpayOrderId, "pay_test_123", signature, secret),
    true
  );
  assert.equal(
    verifyRazorpaySignature(order.razorpayOrderId, "pay_test_123", "0".repeat(64), secret),
    false
  );
  assert.equal(
    verifyRazorpaySignature(order.razorpayOrderId, "pay_test_123", signature, ""),
    false
  );
});

test("requires a captured payment matching order ID, amount, and INR currency", () => {
  const payment = {
    id: "pay_test_123",
    order_id: order.razorpayOrderId,
    amount: 10500,
    currency: "INR",
    status: "captured",
  };
  assert.equal(isCapturedPaymentForOrder(payment, order), true);
  assert.equal(
    isCapturedPaymentForOrder({ ...payment, amount: 10499 }, order),
    false
  );
  assert.equal(
    isCapturedPaymentForOrder({ ...payment, order_id: "another_order" }, order),
    false
  );
  assert.equal(
    isCapturedPaymentForOrder({ ...payment, currency: "USD" }, order),
    false
  );
  assert.equal(
    isCapturedPaymentForOrder({ ...payment, status: "authorized" }, order),
    false
  );
});

test("keeps reservations while provider payment state is unresolved", () => {
  assert.equal(hasUnresolvedPayment([]), false);
  assert.equal(hasUnresolvedPayment([{ status: "failed" }]), false);
  assert.equal(hasUnresolvedPayment([{ status: "authorized" }]), true);
  assert.equal(hasUnresolvedPayment([{ status: "captured" }]), true);
  assert.equal(hasUnresolvedPayment([{ status: "created" }]), true);
});

test("classifies payment, expiry, and already-paid transitions", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(
    getPaymentDisposition(
      {
        paymentStatus: "pending",
        stockReservationStatus: "reserved",
        reservationExpiresAt: new Date("2026-01-01T00:01:00Z"),
      },
      now
    ),
    "commit"
  );
  assert.equal(
    getPaymentDisposition(
      {
        paymentStatus: "pending",
        stockReservationStatus: "reserved",
        reservationExpiresAt: new Date("2025-12-31T23:59:00Z"),
      },
      now
    ),
    "expired"
  );
  assert.equal(
    getPaymentDisposition(
      { paymentStatus: "paid", stockReservationStatus: "committed" },
      now
    ),
    "already-paid"
  );
  assert.equal(
    getPaymentDisposition(
      { paymentStatus: "failed", stockReservationStatus: "released" },
      now
    ),
    "refund"
  );
});
