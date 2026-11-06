const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../routes/orderRoutes");
const { verifyToken, isAdmin } = require("../routes/authRoutes");

test("disable-notify route is mounted under the orders router with admin auth", () => {
  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/:id/disable-notify"
  );

  assert.ok(routeLayer);
  assert.equal(routeLayer.route.methods.put, true);
  assert.equal(routeLayer.route.stack[0].handle, verifyToken);
  assert.equal(routeLayer.route.stack[1].handle, isAdmin);
});
