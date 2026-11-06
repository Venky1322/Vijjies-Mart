const express = require("express");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyToken } = require("./authRoutes");
const {
  OrderValidationError,
  normalizeOrderItems,
  sameCheckoutRequest,
  validateCustomerLocation,
} = require("../services/orderPricing");
const {
  commitCapturedOrder,
  createReservedOrder,
  releaseOrderReservation,
  transitionOrder,
} = require("../services/orderLifecycle");
const {
  getPaymentDisposition,
  hasUnresolvedPayment,
  isCapturedPaymentForOrder,
  verifyRazorpaySignature,
} = require("../services/paymentIntegrity");
const {
  buildOrderReconciliationQuery,
  resolveRefundStatus,
} = require("../services/orderReconciliation");

const router = express.Router();
const CHECKOUT_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const RESERVATION_DURATION_MS = 30 * 60 * 1000;
const RECONCILIATION_BATCH_SIZE = 50;
const VENDOR_LOCATION = {
  lat: 16.789021881335565,
  lng: 80.84928249150414,
};
let reconciliationCursor = null;
let reconciliationInProgress = false;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const requireCustomer = (req, res) => {
  if (req.user?.role === "user" && req.user.email) return true;
  res.status(403).json({ success: false, message: "Customer account required" });
  return false;
};

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
    if (!/^[a-f\d]{24}$/i.test(productId)) {
      throw new OrderValidationError("Invalid product ID");
    }
    return {
      productId,
      weight: Number(item.weight),
      quantity: Number(item.quantity),
    };
  });
};

const sendExistingOnlineOrder = (res, order, items, location) => {
  if (!sameCheckoutRequest(order, items, location, "ONLINE")) {
    return res.status(409).json({
      success: false,
      message: "Idempotency-Key was already used for a different checkout",
    });
  }
  if (
    order.paymentStatus !== "pending" ||
    order.stockReservationStatus !== "reserved"
  ) {
    return res.status(409).json({
      success: false,
      message: "This checkout has already been completed or expired",
    });
  }

  return res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    orderId: order.razorpayOrderId,
    dbOrderId: order._id,
    amount: order.paymentAmount,
    currency: order.paymentCurrency,
    total: order.total,
  });
};

const loadPricedItems = async (items) => {
  const requestedItems = getRequestItems(items);
  const products = await Product.find({
    _id: { $in: requestedItems.map((item) => item.productId) },
  });
  return {
    requestedItems,
    pricing: normalizeOrderItems(items, products),
  };
};

const createCheckoutOrderData = ({
  items,
  total,
  email,
  checkoutRequestId,
  paymentMethod,
  customerLocation,
  razorpayOrderId = "",
  paymentAmount = 0,
  reservationStatus,
  reservationExpiresAt = null,
}) => ({
  items,
  total,
  userEmail: email,
  checkoutRequestId,
  paymentMethod,
  paymentStatus: "pending",
  paymentCurrency: "INR",
  paymentAmount,
  razorpayOrderId,
  stockReservationStatus: reservationStatus,
  reservationExpiresAt,
  notifyAdmin: false,
  status: "Placed",
  vendorLocation: VENDOR_LOCATION,
  customerLocation,
});

const fetchOrderPayments = async (orderId) => {
  const result = await razorpay.orders.fetchPayments(orderId);
  return Array.isArray(result?.items) ? result.items : [];
};

const refundLateCapturedPayment = async (order, payment) => {
  if (order.refundStatus === "processed") {
    return { refunded: true };
  }
  if (order.refundStatus === "pending") {
    return { refunded: false, pending: true };
  }
  if (order.refundStatus === "failed") {
    return { refunded: false, failed: true };
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: "failed",
      stockReservationStatus: "released",
      refundStatus: "none",
    },
    {
      $set: {
        refundStatus: "pending",
        razorpayPaymentId: payment.id,
        paymentAmount: payment.amount,
        paymentCurrency: payment.currency,
      },
    },
    { new: true }
  );

  if (!claimed) {
    const latest = await Order.findById(order._id);
    return {
      refunded: latest?.refundStatus === "processed",
      pending: latest?.refundStatus === "pending",
      failed: latest?.refundStatus === "failed",
    };
  }

  try {
    const refund = await razorpay.payments.refund(payment.id, {
      amount: payment.amount,
      notes: { internal_order_id: String(order._id) },
    });
    if (
      typeof refund?.id !== "string" ||
      !refund.id ||
      typeof refund.status !== "string"
    ) {
      throw new Error("Payment provider returned an incomplete refund result");
    }

    const resolution = resolveRefundStatus(
      [refund],
      payment.id,
      payment.amount
    );
    const refundStatus =
      resolution.status === "processed" || resolution.status === "failed"
        ? resolution.status
        : "pending";
    const updateFields = {
      refundStatus,
      refundId: refund.id,
    };
    if (refundStatus === "processed") {
      updateFields.paymentStatus = "refunded";
      updateFields.paymentDate = new Date();
    }

    const updated = await Order.updateOne(
      { _id: order._id, refundStatus: "pending" },
      { $set: updateFields }
    );
    if (updated.matchedCount !== 1) {
      throw new Error("Unable to persist the completed refund");
    }
    return {
      refunded: refundStatus === "processed",
      pending: refundStatus === "pending",
      failed: refundStatus === "failed",
    };
  } catch (error) {
    console.error("Late payment refund outcome is unknown; manual follow-up is required", {
      orderId: String(order._id),
      paymentId: payment.id,
      message: error.message,
    });
    return { refunded: false, pending: true };
  }
};

const reconcilePendingRefund = async (order) => {
  try {
    const result = await razorpay.payments.fetchMultipleRefund(
      order.razorpayPaymentId
    );
    const resolution = resolveRefundStatus(
      Array.isArray(result?.items) ? result.items : [],
      order.razorpayPaymentId,
      order.paymentAmount
    );
    if (resolution.status === "pending") return;

    const updateFields = {
      refundStatus: resolution.status,
    };
    if (resolution.refundId) {
      updateFields.refundId = resolution.refundId;
    }
    if (resolution.status === "processed") {
      updateFields.paymentStatus = "refunded";
      updateFields.paymentDate = new Date();
    }

    const updated = await Order.updateOne(
      { _id: order._id, refundStatus: { $in: ["pending", "failed"] } },
      { $set: updateFields }
    );
    if (updated.matchedCount !== 1) {
      throw new Error("Refund state changed before reconciliation completed");
    }
  } catch (error) {
    console.error("Unable to reconcile late payment refund; manual follow-up is required", {
      orderId: String(order._id),
      paymentId: order.razorpayPaymentId,
      message: error.message,
    });
  }
};

const respondWithCapturedOrder = async (res, order, payment) => {
  if (!isCapturedPaymentForOrder(payment, order)) {
    return res.status(400).json({
      success: false,
      message: "Captured payment does not match the order amount, currency, or Razorpay order",
    });
  }

  const disposition = getPaymentDisposition(order);

  if (disposition === "already-paid") {
    if (order.razorpayPaymentId === payment.id) {
      return res.json({ success: true, message: "Payment already verified", order });
    }
    return res.status(409).json({
      success: false,
      message: "Order has already been paid with a different payment",
    });
  }

  if (disposition === "refund" || disposition === "expired") {
    const expiredOrder =
      disposition === "expired"
        ? await releaseOrderReservation({ Order, Product, order })
        : order;
    const refundOrder =
      expiredOrder || (await Order.findById(order._id));

    if (refundOrder?.paymentStatus === "paid") {
      return respondWithCapturedOrder(res, refundOrder, payment);
    }
    if (
      !refundOrder ||
      (refundOrder.stockReservationStatus !== "released" &&
        refundOrder.paymentStatus !== "failed")
    ) {
      return res.status(409).json({
        success: false,
        message: "Order reservation state changed; check payment status",
      });
    }

    const result = await refundLateCapturedPayment(refundOrder, payment);
    return res.status(result.refunded ? 409 : 502).json({
      success: false,
      refunded: result.refunded,
      refundPending: result.pending,
      refundFailed: result.failed,
      checkoutClosed: true,
      message: result.refunded
        ? "Reservation expired; captured payment was refunded"
        : result.failed
          ? "Reservation expired after payment capture; refund failure requires manual follow-up"
          : "Reservation expired after payment capture; refund is pending confirmation",
    });
  }

  if (disposition !== "commit") {
    return res.status(409).json({
      success: false,
      message: "Order is no longer available for payment confirmation",
    });
  }

  const committed = await commitCapturedOrder({ Order, Product, order, payment });
  if (committed) {
    return res.json({
      success: true,
      message: "Payment verified",
      order: committed,
    });
  }

  const latest = await Order.findById(order._id);
  if (
    latest?.paymentStatus === "paid" &&
    latest.razorpayPaymentId === payment.id
  ) {
    return res.json({
      success: true,
      message: "Payment already verified",
      order: latest,
    });
  }
  const latestDisposition = latest
    ? getPaymentDisposition(latest)
    : "closed";
  if (
    latest &&
    (latestDisposition === "expired" || latestDisposition === "refund")
  ) {
    return respondWithCapturedOrder(res, latest, payment);
  }
  return res.status(409).json({
    success: false,
    message: "Order is no longer available for payment confirmation",
  });
};

router.post("/create-order", verifyToken, async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;

    const checkoutRequestId = getCheckoutRequestId(req);
    const customerLocation = validateCustomerLocation(req.body.customerLocation);
    const userEmail = req.user.email.toLowerCase().trim();
    const requestedItems = getRequestItems(req.body.items);

    const existingOrder = await Order.findOne({ userEmail, checkoutRequestId });
    if (existingOrder) {
      return sendExistingOnlineOrder(res, existingOrder, requestedItems, customerLocation);
    }

    const { pricing } = await loadPricedItems(req.body.items);
    const razorpayOrder = await razorpay.orders.create({
      amount: pricing.totalPaise,
      currency: "INR",
      receipt: checkoutRequestId.slice(0, 40),
    });

    if (
      Number(razorpayOrder.amount) !== pricing.totalPaise ||
      razorpayOrder.currency !== "INR" ||
      !razorpayOrder.id
    ) {
      return res.status(502).json({
        success: false,
        message: "Payment provider returned an unexpected order amount or currency",
      });
    }

    const orderData = createCheckoutOrderData({
      items: pricing.items,
      total: pricing.total,
      email: userEmail,
      checkoutRequestId,
      paymentMethod: "ONLINE",
      customerLocation,
      razorpayOrderId: razorpayOrder.id,
      paymentAmount: pricing.totalPaise,
      reservationStatus: "reserved",
      reservationExpiresAt: new Date(Date.now() + RESERVATION_DURATION_MS),
    });

    try {
      const order = await createReservedOrder({ Order, Product, orderData });
      return res.status(201).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        dbOrderId: order._id,
        amount: pricing.totalPaise,
        currency: "INR",
        total: pricing.total,
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicateOrder = await Order.findOne({ userEmail, checkoutRequestId });
        if (duplicateOrder) {
          return sendExistingOnlineOrder(
            res,
            duplicateOrder,
            requestedItems,
            customerLocation
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Product not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes("Insufficient stock")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error("Create payment order failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to start online checkout",
    });
  }
});

router.post("/verify", verifyToken, async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      dbOrderId,
    } = req.body;

    if (
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof dbOrderId !== "string" ||
      !mongoose.isValidObjectId(dbOrderId) ||
      !verifyRazorpaySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        process.env.RAZORPAY_KEY_SECRET
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification details",
      });
    }

    const order = await Order.findOne({
      _id: dbOrderId,
      userEmail: req.user.email.toLowerCase().trim(),
      paymentMethod: "ONLINE",
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order does not match the internal order",
      });
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (
      payment.id !== razorpayPaymentId ||
      payment.order_id !== razorpayOrderId
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this Razorpay order",
      });
    }
    if (payment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: "Payment has not been captured",
      });
    }

    return respondWithCapturedOrder(res, order, payment);
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
});

router.post("/payment-failed", verifyToken, async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const { dbOrderId, razorpay_order_id: razorpayOrderId } = req.body;
    if (!mongoose.isValidObjectId(dbOrderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findOne({
      _id: dbOrderId,
      userEmail: req.user.email.toLowerCase().trim(),
      paymentMethod: "ONLINE",
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.paymentStatus === "paid") {
      return res.status(409).json({ success: false, message: "Order is already paid" });
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order does not match the internal order",
      });
    }

    const payments = await fetchOrderPayments(razorpayOrderId);
    const capturedPayment = payments.find((payment) => payment.status === "captured");
    if (capturedPayment) {
      if (!isCapturedPaymentForOrder(capturedPayment, order)) {
        return res.status(409).json({
          success: false,
          message: "Payment requires manual review",
        });
      }
      return respondWithCapturedOrder(res, order, capturedPayment);
    }
    if (hasUnresolvedPayment(payments)) {
      return res.status(202).json({
        success: false,
        pending: true,
        message: "Payment is still processing; inventory remains reserved",
      });
    }

    const released = await releaseOrderReservation({ Order, Product, order });
    if (!released) {
      const latest = await Order.findById(order._id);
      if (latest?.paymentStatus === "paid") {
        return res.status(409).json({ success: false, message: "Order is already paid" });
      }
      return res.json({ success: true, message: "Checkout already closed" });
    }
    return res.json({ success: true, message: "Payment failed; inventory released" });
  } catch (error) {
    console.error("Unable to close failed checkout:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to confirm payment state; inventory remains reserved",
    });
  }
});

const reconcileExpiredReservations = async () => {
  if (reconciliationInProgress) return;
  reconciliationInProgress = true;

  try {
    const now = new Date();
    const orders = await Order.find(
      buildOrderReconciliationQuery(now, reconciliationCursor)
    )
      .sort({ createdAt: 1, _id: 1 })
      .limit(RECONCILIATION_BATCH_SIZE)
      .lean();

    if (orders.length === 0) {
      reconciliationCursor = null;
      return;
    }

    const lastOrder = orders[orders.length - 1];
    reconciliationCursor = {
      createdAt: lastOrder.createdAt,
      _id: lastOrder._id,
    };

    for (const order of orders) {
      try {
        if (order.stockReservationStatus === "released") {
          if (order.refundStatus === "processed") continue;
          if (order.refundStatus === "pending" && !order.razorpayPaymentId) {
            console.error("Pending refund has no payment ID; manual follow-up is required", {
              orderId: String(order._id),
            });
            continue;
          }
          if (
            order.refundStatus !== "none" &&
            order.razorpayPaymentId
          ) {
            await reconcilePendingRefund(order);
            continue;
          }

          const payments = await fetchOrderPayments(order.razorpayOrderId);
          const capturedPayment = payments.find(
            (payment) => payment.status === "captured"
          );
          if (
            capturedPayment &&
            isCapturedPaymentForOrder(capturedPayment, order)
          ) {
            await refundLateCapturedPayment(order, capturedPayment);
          } else if (capturedPayment) {
            console.error("Captured payment does not match released order; manual review required", {
              orderId: String(order._id),
              paymentId: capturedPayment.id,
            });
          }
          continue;
        }

        const payments = await fetchOrderPayments(order.razorpayOrderId);
        const capturedPayment = payments.find(
          (payment) => payment.status === "captured"
        );
        if (capturedPayment) {
          if (!isCapturedPaymentForOrder(capturedPayment, order)) {
            console.error("Captured payment does not match expired order; manual review required", {
              orderId: String(order._id),
              paymentId: capturedPayment.id,
            });
            continue;
          }
          const released = await releaseOrderReservation({ Order, Product, order });
          if (released) {
            await refundLateCapturedPayment(released, capturedPayment);
          }
          continue;
        }
        if (hasUnresolvedPayment(payments)) continue;
        await releaseOrderReservation({ Order, Product, order });
      } catch (error) {
        console.error("Reservation reconciliation failed; manual follow-up may be required", {
          orderId: String(order._id),
          message: error.message,
        });
      }
    }
  } finally {
    reconciliationInProgress = false;
  }
};

router.get("/status/:id", verifyToken, async (req, res) => {
  try {
    if (!requireCustomer(req, res)) return;
    const order = await Order.findOne({
      _id: req.params.id,
      userEmail: req.user.email.toLowerCase().trim(),
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    return res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment status",
    });
  }
});

module.exports = router;
module.exports.reconcileExpiredReservations = reconcileExpiredReservations;
