const cloudinary = require("cloudinary").v2;

// 🔍 Debug (optional but helpful)
if (!process.env.CLOUD_NAME || !process.env.API_KEY || !process.env.API_SECRET) {
  console.warn("⚠️ Cloudinary ENV variables missing!");
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// 🔍 Optional test log
console.log("☁️ Cloudinary Config Loaded:", {
  cloud_name: process.env.CLOUD_NAME ? "✅" : "❌",
  api_key: process.env.API_KEY ? "✅" : "❌",
  api_secret: process.env.API_SECRET ? "✅" : "❌",
});

module.exports = cloudinary;