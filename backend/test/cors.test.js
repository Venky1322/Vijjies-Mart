const test = require("node:test");
const assert = require("node:assert/strict");
const { createCorsMiddleware } = require("../config/cors");

test("CORS preflight allows the headers used by checkout requests", () => {
  const responseHeaders = {};
  const req = {
    method: "OPTIONS",
    headers: {
      origin: "https://shop.example",
      "access-control-request-method": "POST",
      "access-control-request-headers":
        "content-type,authorization,idempotency-key",
    },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  };
  const res = {
    statusCode: 200,
    setHeader(name, value) {
      responseHeaders[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return responseHeaders[name.toLowerCase()];
    },
    end() {},
  };
  const middleware = createCorsMiddleware(["https://shop.example"], true);

  middleware(req, res, () => {
    assert.fail("Preflight should be handled by the CORS middleware");
  });

  assert.equal(res.statusCode, 204);
  assert.match(
    responseHeaders["access-control-allow-headers"],
    /Idempotency-Key/i
  );
});
