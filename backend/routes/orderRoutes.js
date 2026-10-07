const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const Order = require("../models/Order");
const Product = require("../models/Product");


// ✅ PLACE ORDER (FIXED WITH WEIGHT SUPPORT)
router.post("/", async (req, res) => {
  try {

    let {
      items,
      total,
      userEmail,
      paymentMethod,
      notifyAdmin,
      customerLocation,
    } = req.body;

    if (
      !items ||
      !items.length ||
      !total ||
      !userEmail
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
    if (
      !customerLocation ||
      typeof customerLocation.lat !== "number" ||
      typeof customerLocation.lng !== "number"
    ) {
      return res.status(400).json({
        message: "Customer location is required",
      });
    }

    paymentMethod = paymentMethod
      ? paymentMethod.toUpperCase()
      : "COD";

    if (
      !["COD", "ONLINE"].includes(
        paymentMethod
      )
    ) {
      paymentMethod = "COD";
    }

    // 🔥 REDUCE STOCK
    for (let item of items) {

      if (
        !mongoose.Types.ObjectId.isValid(
          item.productId
        )
      ) continue;

      const product =
        await Product.findById(
          item.productId
        );

      if (!product) {

        return res.status(404).json({
          message:
            `Product not found: ${item.name}`,
        });
      }

      const weight = parseFloat(
        item.weight ??
        item.quantity ??
        0
      );

      if (product.stock < weight) {

        return res.status(400).json({
          message:
            `Insufficient stock for ${product.name}`,
        });
      }

      product.stock -= weight;

      await product.save();

      item.weight = weight;

      item.quantity = weight;
    }

    // ✅ CREATE ORDER
    const newOrder = new Order({

      items,

      total,

      userEmail,

      paymentMethod,

      notifyAdmin:
        notifyAdmin || false,

      status: "Placed",

      paymentStatus: "pending",

      vendorLocation: {
        lat: 17.385,
        lng: 78.4867,
      },

      customerLocation: {
        lat: customerLocation.lat,
        lng: customerLocation.lng,
      },
    });

    const savedOrder =
      await newOrder.save();

    res.status(201).json({

      success: true,

      order: savedOrder,
    });

  } catch (err) {

    console.error(
      "Order save error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ GET ALL ORDERS
router.get("/", async (req, res) => {

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
router.get("/partner/:id", async (req, res) => {

  try {

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
router.get("/user/:email", async (req, res) => {
  try {
    const email = req.params.email ? req.params.email.toLowerCase().trim() : "";
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
router.get("/:id", async (req, res) => {
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
router.put("/:id/assign", async (req, res) => {

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

    const order =
      await Order.findByIdAndUpdate(

        req.params.id,

        {
          deliveryPartnerId:
            partnerId,

          status: "Assigned",

          earning: earning || 0,
        },

        { new: true }
      );

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });
    }

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
router.put("/:id/status", async (req, res) => {

  try {

    const { status } = req.body;

    const validStatuses = [

      "Placed",

      "Assigned",

      "Reached Vendor",

      "Out for Delivery",

      "Delivered",
    ];

    if (
      !validStatuses.includes(status)
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


// 🔥 VERIFY ROUTE
router.put("/:id/verify", async (req, res) => {

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
      );

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.paymentStatus = "paid";

    order.status = "Placed";

    order.notifyAdmin = false;

    await order.save();

    res.json({
      success: true,
      order,
    });

  } catch (err) {

    console.error(
      "Verify error:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});


// ✅ DISABLE POPUP
router.put(
  "/orders/:id/disable-notify",
  async (req, res) => {

    try {

      await Order.findByIdAndUpdate(
        req.params.id,
        {
          notifyAdmin: false,
        }
      );

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
router.get("/:id/download", async (req, res) => {

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
  async (req, res) => {

    try {

      const {
        email,
        pdf,
        orderId,
      } = req.body;

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

        to: email,

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