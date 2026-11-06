const test = require("node:test");
const assert = require("node:assert/strict");
const Order = require("../models/Order");
const {
  normalizeOrderItems,
  sameCheckoutRequest,
  validateCustomerLocation,
} = require("../services/orderPricing");

const productId = "64a1b2c3d4e5f67890123456";
const product = {
  _id: productId,
  name: "Tomato",
  pricePerKg: 100,
  stock: 10,
};

test("prices an order from trusted product data and existing discount/GST rules", () => {
  const result = normalizeOrderItems(
    [
      {
        id: productId,
        name: "Forged name",
        weight: 0.25,
        quantity: 4,
        price: 0.01,
        pricePerKg: 0.01,
        total: 0.01,
      },
    ],
    [product]
  );

  assert.equal(result.subtotalPaise, 10000);
  assert.equal(result.discountPaise, 0);
  assert.equal(result.gstPaise, 500);
  assert.equal(result.total, 105);
  assert.equal(result.items[0].name, "Tomato");
  assert.equal(result.items[0].price, 25);
  assert.equal(result.stockRequirements.get(productId), 1);
});

test("preserves quarter-kilogram weights and computes the established discount", () => {
  const result = normalizeOrderItems(
    [
      { productId, weight: 0.25, quantity: 3 },
      { productId, weight: 0.5, quantity: 3 },
    ],
    [product]
  );

  assert.equal(result.stockRequirements.get(productId), 2.25);
  assert.equal(result.subtotalPaise, 22500);
  assert.equal(result.discountPaise, 0);

  const discounted = normalizeOrderItems(
    [{ productId, weight: 0.75, quantity: 4 }],
    [product]
  );
  assert.equal(discounted.subtotalPaise, 30000);
  assert.equal(discounted.discountPaise, 3000);
  assert.equal(discounted.gstPaise, 1350);
  assert.equal(discounted.total, 283.5);
});

test("rejects malformed or unknown product IDs", () => {
  assert.throws(
    () => normalizeOrderItems([{ productId: "not-an-id", weight: 1, quantity: 1 }], [product]),
    /Invalid product ID/
  );
  assert.throws(
    () => normalizeOrderItems([{ productId: "64a1b2c3d4e5f67890123457", weight: 1, quantity: 1 }], [product]),
    { message: "Product not found", statusCode: 404 }
  );
});

test("rejects unsupported fractions, non-positive quantities, and insufficient stock", () => {
  assert.throws(
    () => normalizeOrderItems([{ productId, weight: 0.3, quantity: 1 }], [product]),
    /0\.25 kg increments/
  );
  assert.throws(
    () => normalizeOrderItems([{ productId, weight: 0.25, quantity: 0 }], [product]),
    /positive whole number/
  );
  assert.throws(
    () => normalizeOrderItems([{ productId, weight: 1, quantity: 11 }], [product]),
    /Insufficient stock/
  );
  assert.throws(
    () =>
      normalizeOrderItems(
        [{ productId, weight: 1, quantity: 1 }],
        [{ ...product, pricePerKg: Number.MAX_SAFE_INTEGER }]
      ),
    /Order total exceeds the supported amount/
  );
});

test("enforces the ₹100 minimum and validates delivery coordinates", () => {
  assert.throws(
    () => normalizeOrderItems([{ productId, weight: 0.25, quantity: 3 }], [product]),
    /Minimum order amount is ₹100/
  );
  assert.deepEqual(validateCustomerLocation({ lat: 12.5, lng: 77.6 }), {
    lat: 12.5,
    lng: 77.6,
  });
  assert.throws(
    () => validateCustomerLocation({ lat: 100, lng: 77.6 }),
    /Valid customer location is required/
  );
  assert.throws(
    () => validateCustomerLocation({ lat: "", lng: 77.6 }),
    /Valid customer location is required/
  );
});

test("matches idempotent checkout requests independent of item ordering", () => {
  const order = {
    paymentMethod: "COD",
    items: [
      { productId, weight: 0.5, quantity: 1 },
      { productId, weight: 0.25, quantity: 2 },
    ],
    customerLocation: { lat: 12.5, lng: 77.6 },
  };
  assert.equal(
    sameCheckoutRequest(
      order,
      [
        { productId, weight: 0.25, quantity: 2 },
        { productId, weight: 0.5, quantity: 1 },
      ],
      { lat: 12.5, lng: 77.6 },
      "COD"
    ),
    true
  );
  assert.equal(
    sameCheckoutRequest(
      order,
      [{ productId, weight: 0.25, quantity: 2 }],
      { lat: 12.5, lng: 77.6 },
      "COD"
    ),
    false
  );
  assert.equal(
    sameCheckoutRequest(
      order,
      order.items,
      { lat: 12.5, lng: 77.6 },
      "ONLINE"
    ),
    false
  );
});

test("declares a unique customer checkout idempotency index", () => {
  const checkoutIndex = Order.schema.indexes().find(
    ([fields]) => fields.userEmail === 1 && fields.checkoutRequestId === 1
  );
  assert.ok(checkoutIndex);
  assert.equal(checkoutIndex[1].unique, true);
  assert.deepEqual(checkoutIndex[1].partialFilterExpression, {
    checkoutRequestId: { $type: "string" },
  });
});
