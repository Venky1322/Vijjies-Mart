const express = require("express");
const mongoose = require("mongoose");
const {
  createCorsMiddleware,
  parseFrontendOrigins,
} = require("./config/cors");

require("dotenv").config();
const Order = require("./models/Order");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = parseFrontendOrigins(process.env.FRONTEND_URL);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error(
    "FRONTEND_URL must contain at least one allowed frontend origin in production."
  );
}

// =======================================
// Middleware
// =======================================

app.use(createCorsMiddleware(allowedOrigins, isProduction));
app.use(express.json());

// =======================================
// Routes
// =======================================

app.use("/products", require("./routes/productRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/payment", paymentRoutes);
app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/delivery", require("./routes/deliveryRoutes"));

// =======================================
// Test Route
// =======================================

app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// =======================================
// Mongoose Configuration
// =======================================

mongoose.set("strictQuery", false);

// =======================================
// Environment Variables
// =======================================

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 5000;

console.log("=================================");
console.log("Mongo URL configured:", Boolean(MONGO_URL));
console.log("Port:", PORT);
console.log("=================================");

// =======================================
// MongoDB Connection
// =======================================

mongoose
  .connect(MONGO_URL)
  .then(() => {
    return Order.init();
  })
  .then(() => {
    console.log("✅ MongoDB connected; order indexes initialized");

    const reconcileInterval = setInterval(() => {
      paymentRoutes.reconcileExpiredReservations().catch((err) => {
        console.error("Expired payment reservation reconciliation failed:", err.message);
      });
    }, 60 * 1000);
    reconcileInterval.unref();
    paymentRoutes.reconcileExpiredReservations().catch((err) => {
      console.error("Expired payment reservation reconciliation failed:", err.message);
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error");
    console.error(err.message);
  });

// =======================================
// 404 Route
// =======================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =======================================
// Global Error Handler
// =======================================

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});