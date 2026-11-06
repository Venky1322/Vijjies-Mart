const crypto = require("crypto");

const verifyRazorpaySignature = (
  razorpayOrderId,
  razorpayPaymentId,
  signature,
  secret
) => {
  if (
    typeof razorpayOrderId !== "string" ||
    typeof razorpayPaymentId !== "string" ||
    typeof signature !== "string" ||
    !/^[a-f\d]{64}$/i.test(signature) ||
    typeof secret !== "string" ||
    !secret
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest();

  let received;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
};

const isCapturedPaymentForOrder = (payment, order) =>
  payment?.status === "captured" &&
  typeof payment.id === "string" &&
  payment.id.length > 0 &&
  payment.order_id === order.razorpayOrderId &&
  payment.currency === "INR" &&
  Number(payment.amount) === Number(order.paymentAmount);

const hasUnresolvedPayment = (payments = []) =>
  payments.some(
    (payment) =>
      payment.status === "authorized" ||
      payment.status === "captured" ||
      payment.status === "created"
  );

const getPaymentDisposition = (order, now = new Date()) => {
  if (order.paymentStatus === "paid") return "already-paid";
  if (
    order.paymentStatus === "failed" ||
    order.stockReservationStatus === "released"
  ) {
    return "refund";
  }
  if (
    order.stockReservationStatus === "reserved" &&
    order.reservationExpiresAt &&
    new Date(order.reservationExpiresAt).getTime() <= now.getTime()
  ) {
    return "expired";
  }
  if (
    order.paymentStatus === "pending" &&
    order.stockReservationStatus === "reserved"
  ) {
    return "commit";
  }
  return "closed";
};

module.exports = {
  getPaymentDisposition,
  hasUnresolvedPayment,
  isCapturedPaymentForOrder,
  verifyRazorpaySignature,
};
