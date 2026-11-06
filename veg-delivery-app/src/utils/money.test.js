import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCartPricing,
  priceForWeight,
} from "./money.js";

test("rounds each selected pack to paise before multiplying quantity", () => {
  const packPrice = priceForWeight(99.99, 0.25);
  assert.equal(packPrice, 25);
  assert.equal(packPrice * 4, 100);
});

test("matches the existing backend discount and GST thresholds", () => {
  assert.deepEqual(calculateCartPricing(100), {
    subtotal: 100,
    discount: 0,
    gst: 5,
    total: 105,
  });
  assert.deepEqual(calculateCartPricing(300), {
    subtotal: 300,
    discount: 30,
    gst: 13.5,
    total: 283.5,
  });
});
