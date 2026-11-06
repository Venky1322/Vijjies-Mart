import test from "node:test";
import assert from "node:assert/strict";

import { parseVoiceOrder } from "./voiceOrderParser.js";

const products = [
  { _id: "tomato-id", name: "Tomato", pricePerKg: 40, stock: 10 },
];

test("parses English product and kilogram quantities", () => {
  const [item] = parseVoiceOrder("Tomato two kilos", products);
  assert.equal(item.product._id, "tomato-id");
  assert.equal(item.quantity, 2);
});

test("parses Telugu product and kilogram quantities", () => {
  const [item] = parseVoiceOrder("టమాటా రెండు కిలోలు కావాలి", products);
  assert.equal(item.product._id, "tomato-id");
  assert.equal(item.quantity, 2);
});
