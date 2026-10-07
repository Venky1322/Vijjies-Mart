const express = require("express");
const router = express.Router();

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");



// 🔍 TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Auth route working ✅");
});


// 🔐 VERIFY TOKEN (IMPROVED)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("AUTH HEADER:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED USER:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("TOKEN ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};


// 🧑‍💼 ADMIN ONLY
const isAdmin = (req, res, next) => {
  console.log("USER ROLE:", req.user?.role);

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied (Admin only)",
    });
  }
  next();
};


// 🚚 DELIVERY ONLY
const isDelivery = (req, res, next) => {
  if (req.user.role !== "delivery") {
    return res.status(403).json({
      success: false,
      message: "Access denied (Delivery only)",
    });
  }
  next();
};

// ==============================
// ✅ REGISTER (EMAIL + MOBILE)
// ==============================
router.post("/register", async (req, res) => {
  try {
    let {
      email,
      mobile,
      password,
      role,
    } = req.body;

    if (
      !email ||
      !mobile ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, mobile and password required",
      });
    }

    email = email.toLowerCase().trim();
    mobile = mobile.trim();

    const existingUser =
      await User.findOne({
        $or: [
          { email },
          { mobile },
        ],
      });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "Email or mobile already registered",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user = new User({
      email,
      mobile,
      password:
        hashedPassword,
      role:
        role || "user",
    });

    await user.save();

    res.status(201).json({
      success: true,
      message:
        "User registered successfully",
    });

  } catch (err) {

    console.error(
      "Register error:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
});


// ==============================
// ✅ LOGIN (EMAIL OR MOBILE)
// ==============================
router.post("/login", async (req, res) => {
  try {
    let { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    login = login.trim();

    // 🔐 ADMIN LOGIN
    if (
      login.toLowerCase() === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        {
          id: "admin-fixed-id",
          role: "admin",
          email: login,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: "admin-fixed-id",
          email: login,
          role: "admin",
        },
      });
    }

    // ✅ FIND USER BY EMAIL OR MOBILE
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { mobile: login }
      ]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user,
    });

  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// ==============================
// ✅ GET DELIVERY PARTNERS
// ==============================
router.get("/delivery-partners", verifyToken, isAdmin, async (req, res) => {
  try {
    const partners = await User.find({ role: "delivery" })
      .select("_id email")
      .lean();

    res.json({
      success: true,
      partners,
    });

  } catch (err) {
    console.error("Fetch partners error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// 🔐 GET CURRENT USER
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .lean();

    res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


module.exports = router;

// 🔥 EXPORT MIDDLEWARE
module.exports.verifyToken = verifyToken;
module.exports.isAdmin = isAdmin;
module.exports.isDelivery = isDelivery;