import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import VegetableCard from "../components/VegetableCard";
import VoiceShoppingAssistant from "../components/VoiceShoppingAssistant";
import { CartContext } from "../context/CartContext";

const MotionImage = motion.img;

// 🔥 UPDATED → load from public folder
const images = [
  "/IMG_20260421_101702[1].jpg",
  "/IMG_20260421_101614[1].jpg",
  "/IMG_20260421_101543[1].jpg",
];

export default function Home() {
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useContext(CartContext);

  const [vegetables, setVegetables] = useState([]);
  const [loadingVegetables, setLoadingVegetables] = useState(true);
  const [productLoadError, setProductLoadError] = useState(false);
  const [showVeggies, setShowVeggies] = useState(true);
  const [index, setIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");

  // 🤖 AI Recipe States
  const [recipeInput, setRecipeInput] = useState("");
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    fetchProducts();

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingVegetables(true);
      setProductLoadError(false);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/products`
      );
      if (!res.ok) {
        throw new Error(`Product request failed with status ${res.status}.`);
      }
      const data = await res.json();
      setVegetables(data.products || data || []);
    } catch (err) {
      console.error("Fetch products error:", err);
      setProductLoadError(true);
    } finally {
      setLoadingVegetables(false);
    }
  };

  let customerUser = null;
  try {
    customerUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Unable to read signed-in customer:", error);
  }
  const showVoiceAssistant =
    Boolean(localStorage.getItem("token")) &&
    Boolean(customerUser) &&
    customerUser.role !== "admin";


  // ======================================
  // 🤖 GENERATE AI RECIPE
  // ======================================

  const generateRecipe = async () => {

    try {

      setLoadingRecipe(true);

      const vegArray =
        recipeInput
        .split(",")
        .map((item) =>
          item.trim()
        );

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/recipes/generate`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            vegetables: vegArray,
          }),
        }
      );

      const data = await res.json();

      setRecipes([
        data,
        ...recipes,
      ]);

    } catch (error) {

      console.log(error);

    } finally {

      setLoadingRecipe(false);
    }
  };


  // ====================================
  // Category + Search filter
  // ====================================
  const categories = ["All", "Leafy", "Root", "Fruiting", "Exotic"];

  const categoryKeywords = {
    Leafy: ["spinach", "coriander", "mint", "methi", "palak", "pudina", "lettuce"],
    Root: ["carrot", "potato", "onion", "beet", "radish", "turnip", "ginger", "garlic", "chamadumpa"],
    Fruiting: ["tomato", "brinjal", "capsicum", "chilli", "okra", "benda", "donda", "kakarakaya", "goruchikkudu"],
    Exotic: ["mushroom", "broccoli", "zucchini", "asparagus", "avocado"],
  };

  const getCategoryCount = (cat) => {
    if (cat === "All") return vegetables.length;
    return vegetables.filter((veg) => {
      const name = veg.name?.toLowerCase() || "";
      return (categoryKeywords[cat] || []).some((kw) => name.includes(kw));
    }).length;
  };

  const filteredVegetables = vegetables.filter((veg) => {
    const name = veg.name?.toLowerCase() || "";
    const matchesSearch = name.includes(searchQuery.toLowerCase().trim());
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : (categoryKeywords[selectedCategory] || []).some((kw) => name.includes(kw));
    return matchesSearch && matchesCategory;
  });

  const sortedVegetables = [...filteredVegetables].sort((a, b) => {
    if (sortBy === "price-asc") return (a.pricePerKg || 0) - (b.pricePerKg || 0);
    if (sortBy === "price-desc") return (b.pricePerKg || 0) - (a.pricePerKg || 0);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] pb-20">

      {/* ============================================ */}
      {/* 🌿 HERO SECTION */}
      {/* ============================================ */}
      <div className="relative mx-3 mt-4 h-[54vh] min-h-[360px] max-h-[620px] overflow-hidden rounded-[1.75rem] border border-white bg-[#F1F8F3] shadow-[0_20px_60px_rgba(22,101,52,0.16)] sm:mx-5 sm:h-[66vh] md:mx-auto md:mt-6 md:h-[72vh] md:max-h-[760px] md:max-w-[1400px] md:rounded-[2rem]">

        <AnimatePresence mode="sync">
          <MotionImage
            key={index}
            src={images[index]}
            alt="Fresh vegetables"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/15 to-[#F1F8F3]/70" />

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">

          {/* Brand pill */}
          <div className="mb-4 inline-flex items-center gap-2 bg-white border border-[#E5E7EB] px-5 py-2 rounded-full text-green-700 text-sm font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            🌿 VIJJIESMART — Farm Fresh, Delivered Fast
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[0.98] tracking-[-0.035em]"
            style={{
              WebkitTextStroke: "1.5px #000",
              textShadow:
                "2px 2px 0 #000, 4px 4px 6px rgba(0, 0, 0, 0.75), 6px 6px 12px rgba(0, 0, 0, 0.55), 0 8px 18px rgba(0, 0, 0, 0.45)",
            }}
          >
            <span className="text-[#22C55E]">Fresh Veggies</span><br />
            <span className="text-[#FACC15]">
              To Your Doorstep
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-[#FEFCE8] drop-shadow-[0_1px_5px_rgba(0,0,0,0.75)] sm:text-base md:text-xl">
            Order farm-fresh vegetables online. Fast delivery. No minimum. 100% fresh guaranteed.
          </p>

          {/* Search bar in hero */}
          <div className="mt-8 w-full max-w-xl flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="🔍 Search fresh vegetables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 pr-10 rounded-2xl bg-white border border-[#E5E7EB] text-[#1F2937] placeholder:text-gray-500 outline-none text-base focus:border-green-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-6 py-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl font-bold hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/30 text-sm cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Delivery badges */}
          <div className="mt-5 flex flex-wrap gap-3 justify-center text-sm">
            {["🚀 Fast Delivery", "💚 100% Fresh", "✅ Verified Vendor", "🆓 Free Delivery Above ₹300"].map((badge) => (
              <span key={badge} className="bg-white border border-[#E5E7EB] px-4 py-1.5 rounded-full text-gray-600">
                {badge}
              </span>
            ))}
          </div>

        </div>
      </div>


      {/* ============================================ */}
      {/* 🎁 OFFER STRIP */}
      {/* ============================================ */}
      <div className="bg-[#EAF6EC] py-3 px-4 overflow-hidden">
        <div className="flex gap-10 animate-marquee whitespace-nowrap">
          {[
            "🎉 Free delivery on all orders!",
            "💰 10% discount on orders above ₹300",
            "🥦 Fresh vegetables sourced daily",
            "⚡ Lightning-fast delivery to your doorstep",
            "🌱 Farm to table — always fresh",
            "🎉 Free delivery on all orders!",
          ].map((msg, i) => (
            <span key={i} className="text-green-800 font-semibold text-sm mx-6">
              {msg}
            </span>
          ))}
        </div>
      </div>


      {/* ============================================ */}
      {/* 📦 ORDER-NOW FLOATING BANNER */}
      {/* ============================================ */}
      <div className="max-w-6xl mx-auto mt-[-28px] px-4 z-10 relative">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">🛒</div>
            <div>
              <h3 className="font-bold text-lg">Start Your Fresh Order</h3>
              <p className="text-sm text-gray-500">Prices start from ₹20/kg • Minimum order ₹100</p>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="#products-section"
              className="px-6 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 hover:scale-105 transition-all shadow-lg shadow-green-500/30"
            >
              🥦 Shop Now
            </a>
            <a
              href="#ai-recipe"
              className="px-6 py-3 text-sm font-bold rounded-xl bg-[#F1F8F3] border border-[#E5E7EB] hover:bg-[#EAF6EC] transition-all"
            >
              🍛 Get Recipe
            </a>
          </div>

        </div>
      </div>


      {/* ============================================ */}
      {/* 🥕 PRODUCTS SECTION */}
      {/* ============================================ */}
      <div id="products-section" className="max-w-7xl mx-auto px-4 py-12 bg-[#F7F8F5]">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              🛍️ Fresh Vegetables
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {sortedVegetables.length} products available · Prices in ₹/kg
            </p>
          </div>

          {/* Controls: Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 pr-8 rounded-xl bg-white border border-[#E5E7EB] text-[#1F2937] placeholder:text-gray-500 outline-none text-sm focus:border-green-500 transition w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm">
              <ArrowUpDown size={14} className="text-green-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[#1F2937] outline-none cursor-pointer text-xs sm:text-sm font-medium"
              >
                <option value="default">Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category chips with count badges */}
        <div className="flex gap-2 flex-wrap mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const count = getCategoryCount(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-2 ${
                  selectedCategory === cat
                    ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30 scale-105"
                    : "bg-white border-[#E5E7EB] text-gray-700 hover:bg-[#F1F8F3]"
                }`}
              >
                <span>
                  {cat === "All" && "🌿"}
                  {cat === "Leafy" && "🥬"}
                  {cat === "Root" && "🥕"}
                  {cat === "Fruiting" && "🍅"}
                  {cat === "Exotic" && "✨"}
                </span>
                <span>{cat}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat ? "bg-white/30 text-white" : "bg-[#F1F8F3] text-gray-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading Skeletons */}
        {loadingVegetables ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="rounded-2xl bg-white border border-[#E5E7EB] p-4 animate-pulse">
                <div className="h-40 bg-gray-100 rounded-xl mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : sortedVegetables.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E5E7EB] p-8">
            <div className="text-6xl mb-4">🥦</div>
            <h3 className="text-xl font-semibold text-gray-700">No vegetables found</h3>
            <p className="text-gray-500 mt-2 text-sm">Try a different search term or category</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setSortBy("default"); }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition shadow-md"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
            {sortedVegetables.map((veg) => (
              <VegetableCard key={veg._id} veg={veg} />
            ))}
          </div>
        )}

      </div>



      {/* ============================================ */}
      {/* 🚀 WHY VIJJIESMART */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 py-10 pb-0">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Why Choose <span className="text-green-400">VIJJIESMART</span>?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: "🚀", title: "Fast Delivery", desc: "Delivered in under 60 minutes" },
            { icon: "🌱", title: "Farm Fresh", desc: "Direct from local farmers" },
            { icon: "💰", title: "Best Prices", desc: "No hidden charges ever" },
            { icon: "📍", title: "Live Tracking", desc: "Track your order in real time" },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 text-center hover:border-green-500/30 transition-all">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="font-bold text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>


      {/* ============================================ */}
      {/* 🤖 AI CURRY GENERATOR */}
      {/* ============================================ */}
      <div id="ai-recipe" className="max-w-6xl mx-auto px-4 py-12">

        <div className="bg-[#EAF6EC] border border-[#E5E7EB] rounded-3xl p-8 shadow-sm">

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 px-4 py-1.5 rounded-full text-orange-300 text-xs font-semibold mb-4">
              ⚡ Powered by Gemini AI
            </div>
            <h2 className="text-3xl font-bold">
              🍛 AI Curry Generator
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Enter the vegetables you have and get delicious curry recipes instantly.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="onion, tomato, potato, brinjal..."
              value={recipeInput}
              onChange={(e) => setRecipeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateRecipe()}
              className="flex-1 p-4 rounded-2xl bg-white border border-[#E5E7EB] text-[#1F2937] outline-none text-base placeholder:text-gray-500 focus:border-green-500 transition"
            />

            <button
              onClick={generateRecipe}
              disabled={loadingRecipe || !recipeInput.trim()}
              className="px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-orange-400 to-red-500 hover:scale-105 transition-all duration-200 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loadingRecipe ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Generating...
                </span>
              ) : "✨ Generate Recipe"}
            </button>

          </div>

        </div>
      </div>


      {/* ============================================ */}
      {/* 🍲 GENERATED RECIPES */}
      {/* ============================================ */}
      {recipes.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-12">

          <h2 className="text-3xl font-bold mb-8 text-center">
            🍲 AI Generated Recipes
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {recipes.map((recipe, i) => (
              <div
                key={recipe._id || i}
                onClick={() => navigate(`/recipe/${recipe._id}`)}
                className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-md hover:scale-[1.02] hover:border-orange-400/40 transition-all duration-300 cursor-pointer group"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={recipe.image || "https://placehold.co/600x400/1a1a2e/ffffff?text=Recipe"}
                    alt={recipe.title}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-orange-300">{recipe.title}</h3>
                  <p className="mt-2 text-gray-600 text-sm line-clamp-2">{recipe.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="bg-orange-500/20 text-orange-200 px-3 py-1 rounded-full text-xs">
                      ⏱ {recipe.cookingTime}
                    </span>
                    <span className="text-orange-400 text-sm font-semibold group-hover:underline">View Recipe →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}


      {/* ============================================ */}
      {/* ⭐ CUSTOMER REVIEWS */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 py-12">

        <h2 className="text-2xl font-bold text-center mb-8">
          💬 What Our Customers Say
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { text: "Super fresh vegetables! Loved it 🥦", name: "Priya K.", rating: 5 },
            { text: "Amazing quality and super quick delivery 🚀", name: "Rajan M.", rating: 5 },
            { text: "Best online veggie store in my area ❤️", name: "Sushma T.", rating: 5 },
          ].map((r, i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm hover:border-green-400/30 transition-all"
            >
              <div className="text-yellow-400 text-base mb-3">{"⭐".repeat(r.rating)}</div>
              <p className="text-gray-700 text-sm leading-relaxed">{r.text}</p>
              <p className="mt-3 text-xs text-gray-500 font-medium">— {r.name}</p>
            </div>
          ))}
        </div>

      </div>


      {/* ============================================ */}
      {/* 🩺 HEALTH BENEFITS */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 pb-16">

        <h2 className="text-2xl font-bold text-center mb-8">
          🩺 Health Benefits of Vegetables
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { veg: "🥕 Carrot", benefit: "Improves eyesight & boosts immunity" },
            { veg: "🥦 Broccoli", benefit: "Helps prevent cancer & improves digestion" },
            { veg: "🍅 Tomato", benefit: "Good for heart health & skin glow" },
            { veg: "🥬 Spinach", benefit: "Rich in iron, helps fight anemia" },
            { veg: "🧄 Garlic", benefit: "Reduces blood pressure & improves immunity" },
            { veg: "🧅 Onion", benefit: "Controls blood sugar & boosts heart health" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-[#F1F8F3] border border-[#E5E7EB] p-5 rounded-2xl hover:border-green-400/30 hover:scale-[1.02] transition-all"
            >
              <h3 className="text-base font-bold">{item.veg}</h3>
              <p className="mt-1.5 text-gray-300 text-sm">{item.benefit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* 🦶 FOOTER */}
      {/* ============================================ */}
      <footer className="bg-[#166534] border-t border-green-800 py-8 text-center text-[#DCFCE7] text-sm">
        <p>🌿 VIJJIESMART — Fresh Vegetables Delivered Fast</p>
        <p className="mt-1">Made with ❤️ for healthy living</p>
      </footer>

      {/* ============================================ */}
      {/* 🛒 FLOATING BOTTOM CART BAR (SWIGGY/ZEPTO STYLE) */}
      {/* ============================================ */}
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg bg-emerald-600/95 backdrop-blur-xl text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-400/50"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight">
                {totalItems} {totalItems === 1 ? "item" : "items"} in cart
              </p>
              <p className="text-xs text-emerald-100 font-medium">
                Total: ₹{totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/cart")}
            className="bg-white text-emerald-800 font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-md hover:bg-emerald-50 transition cursor-pointer"
          >
            View Cart →
          </button>
        </motion.div>
      )}

      {showVoiceAssistant && (
        <VoiceShoppingAssistant
          products={vegetables}
          productLoadError={productLoadError}
          user={customerUser}
        />
      )}

    </div>
  );
}
