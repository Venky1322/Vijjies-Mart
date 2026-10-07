const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

// =======================================
// Middleware
// =======================================

app.use(cors());
app.use(express.json());

// =======================================
// Routes
// =======================================

app.use("/products", require("./routes/productRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/payment", require("./routes/paymentRoutes"));
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
console.log("Mongo URL:", MONGO_URL);
console.log("Port:", PORT);
console.log("=================================");

// =======================================
// MongoDB Connection
// =======================================

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Atlas Connected");

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