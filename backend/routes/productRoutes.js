const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");

// 📦 GET products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ products });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ➕ ADD product (with image)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, pricePerKg, stock } = req.body;

    if (!name || !pricePerKg || !req.file) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Validate stock
    const stockValue = Number(stock);

    if (!Number.isFinite(stockValue) || stockValue < 0) {
      return res.status(400).json({
        message: "Stock must be a valid number greater than or equal to 0",
      });
    }

    // 🔥 Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
    );

    const product = new Product({
      name: name.trim(),
      pricePerKg: Number(pricePerKg),
      stock: stockValue,
      image: result.secure_url,
    });

    await product.save();

    res.status(201).json(product);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// 🗑 DELETE PRODUCT
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Delete failed",
    });
  }
});

// ✏️ UPDATE PRODUCT
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pricePerKg, stock } = req.body;

    const stockValue = Number(stock);

    if (!Number.isFinite(stockValue) || stockValue < 0) {
      return res.status(400).json({
        message: "Stock must be a valid number greater than or equal to 0",
      });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      {
        name: name?.trim(),
        pricePerKg: Number(pricePerKg),
        stock: stockValue,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Update failed",
    });
  }
});

module.exports = router;