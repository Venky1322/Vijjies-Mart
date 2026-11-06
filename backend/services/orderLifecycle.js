const mongoose = require("mongoose");

const aggregateStockRequirements = (items) => {
  const requirements = new Map();
  for (const item of items) {
    const productId = String(item.productId);
    const weight = Number(item.weight) * Number(item.quantity);
    requirements.set(productId, (requirements.get(productId) || 0) + weight);
  }
  return requirements;
};

const createSession = () => mongoose.startSession();

const createReservedOrder = async ({ Order, Product, orderData }) => {
  const session = await createSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const [order] = await Order.create([orderData], { session });

      for (const [productId, weight] of [
        ...aggregateStockRequirements(orderData.items),
      ].sort(([left], [right]) => left.localeCompare(right))) {
        const reserved = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: weight } },
          { $inc: { stock: -weight } },
          { new: true, session }
        );

        if (!reserved) {
          const exists = await Product.exists({ _id: productId }).session(session);
          throw new Error(
            exists ? "Insufficient stock for an item in this order" : "Product not found"
          );
        }
      }

      createdOrder = order;
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
};

const transitionOrder = async ({
  Order,
  Product,
  orderId,
  userEmail,
  filter = {},
  update,
  restoreStock = false,
}) => {
  const session = await createSession();
  let transitionedOrder;

  try {
    await session.withTransaction(async () => {
      transitionedOrder = undefined;

      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          ...(userEmail ? { userEmail } : {}),
          ...filter,
        },
        update,
        { new: true, session }
      );

      if (!order) {
        return;
      }

      if (restoreStock) {
        for (const [productId, weight] of [
          ...aggregateStockRequirements(order.items),
        ].sort(([left], [right]) => left.localeCompare(right))) {
          await Product.updateOne(
            { _id: productId },
            { $inc: { stock: weight } },
            { session }
          );
        }
      }

      transitionedOrder = order;
    });

    return transitionedOrder;
  } finally {
    await session.endSession();
  }
};

const releaseOrderReservation = ({ Order, Product, order }) =>
  transitionOrder({
    Order,
    Product,
    orderId: order._id,
    filter: {
      paymentStatus: "pending",
      stockReservationStatus: "reserved",
    },
    update: {
      $set: {
        paymentStatus: "failed",
        stockReservationStatus: "released",
        reservationExpiresAt: null,
        stockReleasedAt: new Date(),
      },
    },
    restoreStock: true,
  });

const commitCapturedOrder = ({ Order, Product, order, payment }) =>
  transitionOrder({
    Order,
    Product,
    orderId: order._id,
    filter: {
      paymentStatus: "pending",
      stockReservationStatus: "reserved",
      reservationExpiresAt: { $gt: new Date() },
    },
    update: {
      $set: {
        paymentStatus: "paid",
        stockReservationStatus: "committed",
        reservationExpiresAt: null,
        razorpayPaymentId: payment.id,
        paymentAmount: payment.amount,
        paymentCurrency: payment.currency,
        paymentDate: new Date(),
        notifyAdmin: true,
      },
    },
  });

module.exports = {
  aggregateStockRequirements,
  commitCapturedOrder,
  createReservedOrder,
  releaseOrderReservation,
  transitionOrder,
};
