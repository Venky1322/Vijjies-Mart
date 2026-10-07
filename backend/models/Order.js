const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // 🛒 Items in order
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        name: {
          type: String,
          required: true,
          trim: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 0.001,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        // Weight for invoice
        weight: {
          type: Number,
          default: 1,
        },
      },
    ],

    // 💰 Total price
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // 👤 User
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // 💳 Payment Method
    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "ONLINE"],
      default: "COD",
    },

    // ============================
    // ✅ RAZORPAY PAYMENT DETAILS
    // ============================

    // Razorpay Order ID
    razorpayOrderId: {
      type: String,
      default: "",
    },

    // Razorpay Payment ID
    razorpayPaymentId: {
      type: String,
      default: "",
    },

    // Razorpay Signature
    razorpaySignature: {
      type: String,
      default: "",
    },

    // Amount received from Razorpay
    paymentAmount: {
      type: Number,
      default: 0,
    },

    // Currency
    paymentCurrency: {
      type: String,
      default: "INR",
    },

    // Payment Time
    paymentDate: {
      type: Date,
      default: null,
    },

    // ============================
    // PAYMENT STATUS
    // ============================

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // ============================
    // ORDER STATUS
    // ============================

    status: {
      type: String,
      enum: [
        "Placed",
        "Assigned",
        "Reached Vendor",
        "Out for Delivery",
        "Delivered",
      ],
      default: "Placed",
    },

    // ============================
    // ADMIN
    // ============================

    notifyAdmin: {
      type: Boolean,
      default: false,
    },

    popupShown: {
      type: Boolean,
      default: false,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    createdFrom: {
      type: String,
      default: "web",
    },

    // ============================
    // DELIVERY PARTNER
    // ============================

    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ============================
    // VENDOR LOCATION
    // ============================

    vendorLocation: {
      lat: {
        type: Number,
        default: 0,
      },

      lng: {
        type: Number,
        default: 0,
      },
    },

    // ============================
    // CUSTOMER LOCATION
    // ============================

    customerLocation: {
      lat: {
        type: Number,
        default: 0,
      },

      lng: {
        type: Number,
        default: 0,
      },
    },

    // ============================
    // DELIVERY EARNING
    // ============================

    earning: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);