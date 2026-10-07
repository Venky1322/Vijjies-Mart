const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

// ➕ Add Product (Cloudinary Upload)
exports.addProduct = async (req, res) => {
  try {
    console.log("BODY:", req.body);     // 🔍 debug
    console.log("FILE:", req.file);     // 🔍 debug

    const { name, pricePerKg, stock } = req.body;

    // ❌ If multer not working → req.body undefined
    if (!req.body || !name || !pricePerKg || !req.file) {
      return res.status(400).json({
        message: "Name, price and image are required",
      });
    }

    // ☁️ Upload to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { folder: "products" },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ message: "Upload failed" });
        }

        const product = new Product({
          name,
          pricePerKg: Number(pricePerKg),
          stock: stock ? Number(stock) : 0,
          image: result.secure_url, // ✅ Cloudinary URL
        });

        await product.save();

        res.status(201).json({
          message: "✅ Product added successfully",
          product,
        });
      }
    );

    // 🔥 Convert buffer → stream
    result.end(req.file.buffer);

  } catch (err) {
    console.error("🔥 ADD PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};


// 📦 Get All Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("GET ERROR:", err);
    res.status(500).json({
      message: "Error fetching products",
    });
  }
};