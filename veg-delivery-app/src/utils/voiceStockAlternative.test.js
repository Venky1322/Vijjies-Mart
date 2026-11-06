import test from "node:test";
import assert from "node:assert/strict";

import { withStockAlternative } from "./voiceStockAlternative.js";

const pendingItems = [
  {
    product: { _id: "tomato", name: "Tomato" },
    quantity: 2,
    requestedQuantity: 2,
    availableQuantity: 1.5,
    requiresStockApproval: true,
    stockApproved: false,
  },
];

test("accepts an explicitly selected available quarter-kilo quantity", () => {
  const [item] = withStockAlternative(pendingItems, "tomato", "0.75");
  assert.equal(item.quantity, 0.75);
  assert.equal(item.requestedQuantity, 2);
  assert.equal(item.stockApproved, true);
  assert.equal(item.requiresStockApproval, false);
  assert.equal(pendingItems[0].quantity, 2);
});

test("rejects quantities over available stock or outside supported increments", () => {
  assert.equal(withStockAlternative(pendingItems, "tomato", "2"), null);
  assert.equal(withStockAlternative(pendingItems, "tomato", "0.3"), null);
  assert.equal(withStockAlternative(pendingItems, "tomato", "0"), null);
});
