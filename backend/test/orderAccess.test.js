const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canAccessOrder,
  canEmailOrderInvoice,
} = require("../services/orderAccess");

const order = {
  userEmail: "customer@example.test",
  deliveryPartnerId: "delivery-id",
};

test("order access preserves admin, owner, and assigned delivery workflows", () => {
  assert.equal(canAccessOrder({ role: "admin" }, order), true);
  assert.equal(
    canAccessOrder({ role: "user", email: " CUSTOMER@example.test " }, order),
    true
  );
  assert.equal(
    canAccessOrder({ role: "delivery", id: "delivery-id" }, order),
    true
  );
  assert.equal(
    canAccessOrder({ role: "user", email: "another@example.test" }, order),
    false
  );
  assert.equal(
    canAccessOrder({ role: "delivery", id: "another-id" }, order),
    false
  );
  assert.equal(
    canAccessOrder({ role: "delivery" }, { userEmail: order.userEmail }),
    false
  );
});

test("invoice access is limited to the order owner and admins", () => {
  assert.equal(
    canEmailOrderInvoice({ role: "user", email: "customer@example.test" }, order),
    true
  );
  assert.equal(canEmailOrderInvoice({ role: "admin" }, order), true);
  assert.equal(
    canEmailOrderInvoice({ role: "user", email: "another@example.test" }, order),
    false
  );
  assert.equal(
    canEmailOrderInvoice({ role: "delivery", id: "delivery-id" }, order),
    false
  );
});
