const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Order = require("../models/Order");

const router = express.Router();
const VENDOR_LOCATION = {
  lat: 16.789021881335565,
  lng: 80.84928249150414
};

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/*
====================================
CREATE RAZORPAY ORDER
POST /payment/create-order
====================================
*/

router.post("/create-order", async (req, res) => {
  try {
    console.log("BODY RECEIVED:");
    console.log(req.body);

    const {
      amount,
      items,
      userEmail,
      paymentMethod,
      customerLocation,
    } = req.body;

    if (
      !customerLocation ||
      !Number.isFinite(Number(customerLocation.lat)) ||
      !Number.isFinite(Number(customerLocation.lng))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid customer location is required",
      });
    }

    console.log("Email:", userEmail);
    console.log("Customer Location:", customerLocation);
    console.log("Vendor Location:", VENDOR_LOCATION);

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    console.log("Razorpay Options:", options);

    const razorpayOrder = await razorpay.orders.create(options);

    const order = new Order({
      items,
      total: amount,
      userEmail,
      paymentMethod: paymentMethod || "ONLINE",

      // 🏪 Vendor / shop location
      vendorLocation: {
        lat: Number(VENDOR_LOCATION.lat),
        lng: Number(VENDOR_LOCATION.lng),
      },

      // 📍 Customer live GPS location
      customerLocation: {
        lat: Number(customerLocation.lat),
        lng: Number(customerLocation.lng),
      },

      razorpayOrderId: razorpayOrder.id,
      paymentAmount: amount,
      paymentCurrency: "INR",
      paymentStatus: "pending",
      status: "Placed",
    });

    await order.save();

    console.log("ORDER LOCATION SAVED:", {
      vendorLocation: order.vendorLocation,
      customerLocation: order.customerLocation,
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      dbOrderId: order._id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });

  } catch (err) {
    console.error("Create order error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
====================================
VERIFY PAYMENT
POST /payment/verify
====================================
*/

router.post("/verify", async (req, res) => {
  console.log("✅ VERIFY ROUTE HIT");
  console.log(req.body);
  try {

    const {

      razorpay_order_id,

      razorpay_payment_id,

      razorpay_signature,

      dbOrderId,

    } = req.body;

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(body.toString())
        .digest("hex");

    if (
      expectedSignature !==
      razorpay_signature
    ) {

      return res.status(400).json({
        success: false,
        message: "Invalid Signature",
      });
    }

    const order =
      await Order.findById(dbOrderId);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.paymentStatus = "paid";

    order.razorpayPaymentId =
      razorpay_payment_id;

    order.razorpaySignature =
      razorpay_signature;

    order.paymentDate = new Date();

    order.notifyAdmin = true;

    await order.save();

    return res.json({

      success: true,

      message: "Payment Verified",

      order,

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
====================================
PAYMENT FAILED
====================================
*/

router.post("/payment-failed", async (req, res) => {

  try {

    const {

      dbOrderId,

    } = req.body;

    const order =
      await Order.findById(dbOrderId);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.paymentStatus = "failed";

    await order.save();

    res.json({
      success: true,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
====================================
GET PAYMENT STATUS
====================================
*/

router.get("/status/:id", async (req, res) => {

  try {

    const order =
      await Order.findById(req.params.id);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({

      success: true,

      paymentStatus:
        order.paymentStatus,

      order,

    });

  } catch (err) {

    res.status(500).json({

      success: false,

      message: err.message,

    });
  }
});

module.exports = router;