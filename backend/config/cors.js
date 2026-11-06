const cors = require("cors");

const CORS_ALLOWED_HEADERS = ["Content-Type", "Authorization", "Idempotency-Key"];

const parseFrontendOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      let parsed;

      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(`Invalid FRONTEND_URL origin: ${origin}`);
      }

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error(
          `FRONTEND_URL entries must be explicit HTTP(S) origins without a path: ${origin}`
        );
      }

      return parsed.origin;
    });

const isOriginAllowed = (origin, allowedOrigins, isProduction) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (isProduction) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
};

const createCorsMiddleware = (allowedOrigins, isProduction) => {
  const corsMiddleware = cors({
    origin: (origin, callback) => callback(null, Boolean(origin)),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: CORS_ALLOWED_HEADERS,
    optionsSuccessStatus: 204,
  });

  return (req, res, next) => {
    const origin = req.get("Origin");

    if (origin && !isOriginAllowed(origin, allowedOrigins, isProduction)) {
      return res.status(403).json({
        success: false,
        message: "Origin is not allowed by CORS",
      });
    }

    return corsMiddleware(req, res, next);
  };
};

module.exports = {
  createCorsMiddleware,
  isOriginAllowed,
  parseFrontendOrigins,
};
