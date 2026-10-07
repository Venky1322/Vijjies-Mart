const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");

const router = express.Router();

// =======================================
// 📍 UPDATE DELIVERY PARTNER LIVE LOCATION
// =======================================

router.post("/update-location", async (req, res) => {
  try {
    const {
      partnerId,
      lat,
      lng,
    } = req.body;

    // Validate partner ID
    if (
      !partnerId ||
      !mongoose.Types.ObjectId.isValid(partnerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid delivery partner ID is required",
      });
    }

    // Validate coordinates
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    // Find delivery partner
    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    // Make sure this user is a delivery partner
    if (partner.role !== "delivery") {
      return res.status(403).json({
        success: false,
        message: "User is not a delivery partner",
      });
    }

    // Update live location
    partner.liveLocation = {
      lat: latitude,
      lng: longitude,
      updatedAt: new Date(),
    };

    await partner.save();

    console.log(
      "📍 Delivery partner location updated:",
      partner.email,
      partner.liveLocation
    );

    res.json({
      success: true,
      message: "Live location updated",
      liveLocation: partner.liveLocation,
    });

  } catch (err) {
    console.error(
      "Update delivery location error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// =======================================
// 📍 GET DELIVERY PARTNER LIVE LOCATION
// =======================================

router.get("/location/:partnerId", async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(partnerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner ID",
      });
    }

    const partner = await User.findById(
      partnerId
    ).select(
      "email role liveLocation"
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    res.json({
      success: true,
      partnerId: partner._id,
      email: partner.email,
      liveLocation: partner.liveLocation,
    });

  } catch (err) {
    console.error(
      "Get delivery location error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;