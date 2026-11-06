const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { verifyToken, isAdmin, isDelivery } = require("./authRoutes");
const {
  OrderValidationError,
  normalizeOrderItems,
  sameCheckoutRequest,
  validateCustomerLocation,
} = require("../services/orderPricing");
const {
  createReservedOrder,
  transitionOrder,
} = require("../services/orderLifecycle");
const { canAccessOrder, canEmailOrderInvoice } = require("../services/orderAccess");

const CHECKOUT_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const VENDOR_LOCATION = { lat: 17.385, lng: 78.4867 };

const getCheckoutRequestId = (req) => {
  const requestId = req.get("Idempotency-Key");
  if (!CHECKOUT_ID_PATTERN.test(requestId || "")) {
    throw new OrderValidationError("A valid Idempotency-Key header is required");
  }
  return requestId;
};

const getRequestItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError("At least one product is required");
  }

  return items.map((item) => {
    const productId = String(item?.productId ?? item?.id ?? "");
    if (!mongoose.Types.ObjectId.isValid(productId) || !/^[a-f\d]{24}$/i.test(productId)) {
      throw new OrderValidationError("Invalid product ID");
    }

    return {
      productId,
      weight: Number(item.weight),
      quantity: Number(item.quantity),
    };
  });
};

const respondWithExistingOrder = (res, order, paymentMethod, items, location) => {
  if (!sameCheckoutRequest(order, items, location, paymentMethod)) {
    return res.status(409).json({
      success: false,
      message: "Idempotency-Key was already used for a different checkout",
    });
  }

  if (
    order.paymentStatus !== "pending" ||
    order.stockReservationStatus === "released"
  ) {
    return res.status(409).json({
      success: false,
      message: "This checkout has already been completed or expired",
    });
  }

  return res.status(200).json({ success: true, order });
};

// Place a COD order; online orders are created by /payment/create-order.
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user?.role !== "user" || !req.user.email) {
      return res.status(403).json({ success: false, message: "Customer account required" });
    }

    const checkoutRequestId = getCheckoutRequestId(req);
    const paymentMethod = String(req.body.paymentMethod || "COD").toUpperCase();
    if (paymentMethod !== "COD") {
      throw new OrderValidationError("Use the online payment endpoint for online orders");
    }

    const location = validateCustomerLocation(req.body.customerLocation);
    const requestedItems = getRequestItems(req.body.items);
    const userEmail = req.user.email.toLowerCase().trim();

    const existingOrder = await Order.findOne({ userEmail, checkoutRequestId });
    if (existingOrder) {
      return respondWithExistingOrder(
        res,
        existingOrder,
        paymentMethod,
        requestedItems,
        location
      );
    }

    const products = await Product.find({
      _id: { $in: requestedItems.map((item) => item.productId) },
    });
    const pricedOrder = normalizeOrderItems(req.body.items, products);
    const orderData = {
      items: pricedOrder.items,
      total: pricedOrder.total,
      userEmail,
      checkoutRequestId,
      paymentMethod,
      paymentStatus: "pending",
      paymentCurrency: "INR",
      paymentAmount: 0,
      stockReservationStatus: "committed",
      reservationExpiresAt: null,
      notifyAdmin: false,
      status: "Placed",
      vendorLocation: VENDOR_LOCATION,
      customerLocation: location,
    };

    try {
      const order = await createReservedOrder({ Order, Product, orderData });
      return res.status(201).json({
        success: true,
        order,
        pricing: {
          subtotal: pricedOrder.subtotalPaise / 100,
          discount: pricedOrder.discountPaise / 100,
          gst: pricedOrder.gstPaise / 100,
          total: pricedOrder.total,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicateOrder = await Order.findOne({ userEmail, checkoutRequestId });
        if (duplicateOrder) {
          return respondWithExistingOrder(
            res,
            duplicateOrder,
            paymentMethod,
            requestedItems,
            location
          );
        }
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    if (err.message === "Product not found") {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message.includes("Insufficient stock")) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error("Order save error:", err);
    return res.status(500).json({ success: false, message: "Unable to place order" });
  }
});


// ✅ GET ALL ORDERS
router.get("/", verifyToken, isAdmin, async (req, res) => {

  try {

    const orders =
      await Order.find()

        .populate("items.productId")

        .sort({ createdAt: -1 })

        .lean();

    res.json({
      success: true,
      orders,
    });

  } catch (err) {

    console.error(
      "Fetch error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ GET PARTNER ORDERS
router.get("/partner/:id", verifyToken, isDelivery, async (req, res) => {

  try {
    if (String(req.user.id) !== String(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: "Cannot access another delivery partner's orders",
      });
    }

    const orders =
      await Order.find({
        deliveryPartnerId:
          req.params.id,
      })

        .populate("items.productId")

        .sort({ createdAt: -1 })

        .lean();

    res.json({
      success: true,
      orders,
    });

  } catch (err) {

    console.error(
      "Partner fetch error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ GET CUSTOMER ORDERS BY EMAIL
router.get("/user/:email", verifyToken, async (req, res) => {
  try {
    const email = req.params.email ? req.params.email.toLowerCase().trim() : "";
    if (
      req.user.role !== "admin" &&
      (req.user.role !== "user" ||
        req.user.email?.toLowerCase().trim() !== email)
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot access another customer's orders",
      });
    }

    const orders = await Order.find({ userEmail: email })
      .populate("items.productId")
      .populate("deliveryPartnerId", "email mobile liveLocation")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("Customer orders fetch error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ GET SINGLE ORDER DETAILS BY ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID",
      });
    }

    const order = await Order.findById(req.params.id)
      .populate("items.productId")
      .populate("deliveryPartnerId", "email mobile liveLocation")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({
        success: false,
        message: "Cannot access this order",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Single order fetch error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ ASSIGN DELIVERY
router.put("/:id/assign", verifyToken, isAdmin, async (req, res) => {

  try {

    const {
      partnerId,
      earning,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {

      return res.status(400).json({
        message: "Invalid Order ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: "Invalid delivery partner ID" });
    }

    const partner = await User.findOne({ _id: partnerId, role: "delivery" });
    if (!partner) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.status !== "Placed" ||
      order.stockReservationStatus === "released" ||
      (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid")
    ) {
      return res.status(409).json({
        message: "Order is not ready for delivery assignment",
      });
    }

    order.deliveryPartnerId = partnerId;
    order.status = "Assigned";
    order.earning = Number(earning) || 0;
    await order.save();

    res.json({
      success: true,
      order,
    });

  } catch (err) {

    console.error(
      "Assign error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ UPDATE STATUS
router.put("/:id/status", verifyToken, isDelivery, async (req, res) => {

  try {

    const { status } = req.body;

    const nextStatus = {
      Placed: "Assigned",
      Assigned: "Reached Vendor",
      "Reached Vendor": "Out for Delivery",
      "Out for Delivery": "Delivered",
      Delivered: "Delivered",
    };

    if (
      !Object.prototype.hasOwnProperty.call(nextStatus, status)
    ) {

      return res.status(400).json({
        message:
          "Invalid status value",
      });
    }

    const order =
      await Order.findById(
        req.params.id
      );

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (String(order.deliveryPartnerId) !== String(req.user.id)) {
      return res.status(403).json({
        message: "Order is assigned to another delivery partner",
      });
    }

    if (
      order.stockReservationStatus === "released" ||
      (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid")
    ) {
      return res.status(409).json({
        message: "Order is not eligible for delivery status updates",
      });
    }

    if (status !== order.status && status !== nextStatus[order.status]) {
      return res.status(409).json({
        message: "Invalid order status transition",
      });
    }

    order.status = status;

    if (status === "Delivered") {

      const distance = 3;

      const base = 30;

      const perKm = 8;

      const earning =
        base + distance * perKm;

      order.earning = earning;
    }

    await order.save();

    res.json({
      success: true,
      order,
    });

  } catch (err) {

    console.error(
      "Status update error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ DISABLE POPUP
router.put(
  "/:id/disable-notify",
  verifyToken,
  isAdmin,
  async (req, res) => {

    try {

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Order ID",
        });
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
          notifyAdmin: false,
        }
      );
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.json({
        success: true,
      });

    } catch (err) {

      res.status(500).json({
        error: err.message,
      });
    }
  }
);


// ✅ DOWNLOAD ORDER
router.get("/:id/download", verifyToken, async (req, res) => {

  try {

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {

      return res.status(400).json({
        message: "Invalid Order ID",
      });
    }

    const order =
      await Order.findById(
        req.params.id
      )

        .populate("items.productId")

        .lean();

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (!canAccessOrder(req.user, order)) {
      return res.status(403).json({
        success: false,
        message: "Cannot access this order",
      });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Order-${order._id}.json`
    );

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.send(
      JSON.stringify(order, null, 2)
    );

  } catch (err) {

    console.error(
      "Download error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ SEND INVOICE EMAIL
router.post(
  "/send-invoice",
  verifyToken,
  async (req, res) => {

    try {

      const { pdf, orderId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Order ID",
        });
      }

      const order = await Order.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (!canEmailOrderInvoice(req.user, order)) {
        return res.status(403).json({
          success: false,
          message: "Cannot email another customer's invoice",
        });
      }

      if (typeof pdf !== "string" || !pdf) {
        return res.status(400).json({
          success: false,
          message: "Invoice PDF is required",
        });
      }

      // ✅ MAIL TRANSPORT
      const transporter =
        nodemailer.createTransport({

          service: "gmail",

          auth: {

            user:
              "YOUR_GMAIL@gmail.com",

            pass:
              "YOUR_APP_PASSWORD",
          },
        });

      // ✅ REMOVE PREFIX
      const base64Data =
        pdf.replace(
          /^data:application\/pdf;filename=generated.pdf;base64,/,
          ""
        );

      // ✅ SEND EMAIL
      await transporter.sendMail({

        from:
          "YOUR_GMAIL@gmail.com",

        to: order.userEmail,

        subject:
          `Invoice for Order ${orderId}`,

        text:
          "Thank you for your order 🚀",

        attachments: [
          {
            filename:
              `Invoice-${orderId}.pdf`,

            content: base64Data,

            encoding: "base64",
          },
        ],
      });

      res.json({
        success: true,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

module.exports = router;