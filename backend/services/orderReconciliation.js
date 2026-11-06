const RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const buildOrderReconciliationQuery = (now = new Date(), cursor = null) => {
  const conditions = [
    {
      $or: [
        {
          paymentStatus: "pending",
          stockReservationStatus: "reserved",
          reservationExpiresAt: { $lte: now },
        },
        {
          paymentStatus: "failed",
          stockReservationStatus: "released",
          stockReleasedAt: {
            $gte: new Date(now.getTime() - RECONCILIATION_WINDOW_MS),
          },
          refundStatus: { $in: ["none", "pending", "failed"] },
        },
        {
          paymentStatus: "failed",
          stockReservationStatus: "released",
          refundStatus: "pending",
        },
      ],
    },
  ];

  if (cursor) {
    conditions.push({
      $or: [
        { createdAt: { $gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $gt: cursor._id } },
      ],
    });
  }

  return {
    paymentMethod: "ONLINE",
    $and: conditions,
  };
};

const resolveRefundStatus = (refunds, paymentId, expectedAmount) => {
  const paymentRefunds = refunds.filter(
    (refund) => refund.payment_id === paymentId
  );
  if (paymentRefunds.length === 0) return { status: "pending" };

  const processedFullRefund = paymentRefunds.find(
    (refund) =>
      refund.status === "processed" &&
      refund.currency === "INR" &&
      Number(refund.amount) === Number(expectedAmount) &&
      typeof refund.id === "string" &&
      refund.id.length > 0
  );
  if (processedFullRefund) {
    return { status: "processed", refundId: processedFullRefund.id };
  }

  if (paymentRefunds.every((refund) => refund.status === "failed")) {
    return { status: "failed" };
  }

  return { status: "pending" };
};

module.exports = {
  RECONCILIATION_WINDOW_MS,
  buildOrderReconciliationQuery,
  resolveRefundStatus,
};
