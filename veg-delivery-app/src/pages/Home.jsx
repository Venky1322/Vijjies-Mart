import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, X, ArrowUpDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import VegetableCard from "../components/VegetableCard";
import VoiceShoppingAssistant from "../components/VoiceShoppingAssistant";
import { CartContext } from "../context/CartContext";
import { apiUrl } from "../config/api";

const MotionImage = motion.img;

// Normalize text so search is case-insensitive and ignores extra spaces.
const normalizeSearchText = (value) =>
  String(value ?? "").toLocaleLowerCase().trim().replace(/\s+/g, " ");

const getProductSearchText = (product) =>
  [
    product?.name,
    product?.category,
    product?.description,
    product?.unit,
    product?.brand,
  ]
    .filter(Boolean)
    .join(" ");

// 🔥 UPDATED → load from public folder
const images = [
  "/IMG_20260421_101702[1].jpg",
  "/IMG_20260421_101614[1].jpg",
  "/IMG_20260421_101543[1].jpg",
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { totalItems, totalPrice } = useContext(CartContext);

  const [vegetables, setVegetables] = useState([]);
  const [loadingVegetables, setLoadingVegetables] = useState(true);
  const [productLoadError, setProductLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || ""
  );
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

  // Keep the Home search field synchronized with searches submitted in the Navbar.
  // This also runs when Home is opened directly from another route with ?search=...
  useEffect(() => {
    const incomingQuery = searchParams.get("search") || "";
    setSearchQuery(incomingQuery);

    // A navbar search should search the complete catalog, not remain restricted
    // by a category the customer selected earlier on the Home page.
    if (incomingQuery) {
      setSelectedCategory("All");
    }

    // React Router may render the Home route after the browser has processed
    // the URL hash. Scroll after render so the target element is available.
    if (incomingQuery || window.location.hash === "#products-section") {
      window.requestAnimationFrame(() => {
        document.getElementById("products-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoadingVegetables(true);
      setProductLoadError(false);
      const res = await fetch(
        apiUrl("/products")
      );
      if (!res.ok) {
        throw new Error(`Product request failed with status ${res.status}.`);
      }
      const data = await res.json();
      const products = Array.isArray(data) ? data : data?.products;
      if (!Array.isArray(products)) {
        throw new Error("The product service returned an invalid response.");
      }
      setVegetables(products);
    } catch (err) {
      console.error("Fetch products error:", err);
      setVegetables([]);
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
  const clearSearch = () => {
    setSearchQuery("");

    if (searchParams.has("search")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("search");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSearchSubmit = (event) => {
    event?.preventDefault();

    const query = searchQuery.trim().replace(/\s+/g, " ");
    setSearchQuery(query);

    const nextParams = new URLSearchParams(searchParams);
    if (query) {
      nextParams.set("search", query);
    } else {
      nextParams.delete("search");
    }

    // Write the submitted query to the URL. Navbar and Home now share one
    // search value, and a copied/shared URL keeps the same product results.
    setSearchParams(nextParams);
    setSelectedCategory("All");

    window.requestAnimationFrame(() => {
      document.getElementById("products-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

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
        apiUrl("/api/recipes/generate"),
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

      setRecipes((currentRecipes) => [data, ...currentRecipes]);

    } catch (error) {

      console.log(error);

    } finally {

      setLoadingRecipe(false);
    }
  };


  // ====================================
  // Category + Search filter
  // ====================================
  const categories = ["All", "Leafy", "Root", "Fruiting", "Exotic", "Fruits"];

  const categoryKeywords = {
    Leafy: ["spinach", "coriander", "mint", "methi", "palak", "pudina", "lettuce"],
    Root: ["carrot", "potato", "onion", "beet", "radish", "turnip", "ginger", "garlic", "chamadumpa"],
    Fruiting: ["tomato", "brinjal", "capsicum", "chilli", "okra", "benda", "donda", "kakarakaya", "goruchikkudu"],
    Exotic: ["mushroom", "broccoli", "zucchini", "asparagus", "avocado"],
    Fruits: ["apple", "banana", "orange", "mango", "grape", "papaya", "guava", "watermelon", "pineapple", "pomegranate", "lemon", "pear", "kiwi", "strawberry"],
  };

  const getCategoryCount = (cat) => {
    if (cat === "All") return vegetables.length;
    const keywords = categoryKeywords[cat] || [];
    return vegetables.filter((veg) => {
      const searchableText = normalizeSearchText(getProductSearchText(veg));
      return keywords.some((keyword) => searchableText.includes(keyword));
    }).length;
  };

  const normalizedQuery = normalizeSearchText(searchQuery);

  const filteredVegetables = vegetables.filter((veg) => {
    const searchableText = normalizeSearchText(getProductSearchText(veg));
    const matchesSearch =
      !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : (categoryKeywords[selectedCategory] || []).some((keyword) =>
            searchableText.includes(keyword)
          );
    return matchesSearch && matchesCategory;
  });

  const sortedVegetables = [...filteredVegetables].sort((a, b) => {
    if (sortBy === "price-asc") return (a.pricePerKg || 0) - (b.pricePerKg || 0);
    if (sortBy === "price-desc") return (b.pricePerKg || 0) - (a.pricePerKg || 0);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  return (
    <div className="vm-home min-h-screen bg-[#F7F8F5] pb-36 text-[#1F2937] sm:pb-32">

      <main className="vm-home-scroll-content">
      {/* ============================================ */}
      {/* 🌿 HERO SECTION */}
      {/* ============================================ */}
      <div className="vm-home-hero relative mx-3 mt-4 h-[54vh] min-h-[360px] max-h-[620px] overflow-hidden rounded-[1.75rem] border border-white bg-[#F1F8F3] shadow-[0_20px_60px_rgba(22,101,52,0.16)] sm:mx-5 sm:h-[66vh] md:mx-auto md:mt-6 md:h-[72vh] md:max-h-[760px] md:max-w-[1400px] md:rounded-[2rem]">

        <AnimatePresence mode="sync">
          <MotionImage
            key={index}
            src={images[index]}
            alt="Fresh vegetables"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {/* Hero content */}
        <div className="vm-home-hero-content absolute inset-0 flex flex-col justify-center items-center text-center px-4">

          {/* Brand pill */}
          <div className="vm-hero-kicker mb-4 inline-flex items-center gap-2 bg-white border border-[#E5E7EB] px-5 py-2 rounded-full text-green-700 text-sm font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            A better way to shop your daily produce
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[0.98] tracking-[-0.035em]"
          >
            <span className="text-[#22C55E]">Good food</span><br />
            <span className="text-[#FACC15]">
              starts fresh.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-[#FEFCE8] drop-shadow-[0_1px_5px_rgba(0,0,0,0.75)] sm:text-base md:text-xl">
            Find the vegetables you love, choose just the right amount, and shop with confidence.
          </p>

          {/* Search bar in hero */}
          <form role="search" onSubmit={handleSearchSubmit} className="mt-8 w-full max-w-xl flex gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                aria-label="Search products"
                placeholder="Search fresh vegetables..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full min-w-0 px-5 py-4 pr-11 rounded-2xl bg-white border border-[#E5E7EB] text-[#1F2937] placeholder:text-gray-500 outline-none text-base focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="shrink-0 px-5 sm:px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold hover:brightness-105 transition-all duration-200 shadow-lg shadow-green-500/30 text-sm cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Delivery badges */}
          <div className="mt-5 flex flex-wrap gap-3 justify-center text-sm">
            {["Fresh picks for everyday cooking", "Free delivery"].map((badge) => (
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
      <div className="bg-[#EAF6EC] py-3 px-4">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-2">
          {[
            "Free delivery on your First-order",
            "Save 10% when your basket reaches ₹300",
          ].map((msg) => (
            <span key={msg} className="text-green-800 font-semibold text-sm">
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* 🥕 PRODUCTS SECTION */}
      {/* ============================================ */}
      <div id="products-section" className="max-w-7xl mx-auto px-4 py-12 bg-[#F7F8F5]">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="vm-eyebrow">TODAY'S MARKET</p>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              Fresh produce
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {normalizedQuery
                ? `${filteredVegetables.length} matching ${filteredVegetables.length === 1 ? "product" : "products"}`
                : `${vegetables.length} ${vegetables.length === 1 ? "product" : "products"} available`} · Prices in ₹/kg
            </p>
          </div>

          {/* Controls: Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <form role="search" onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                aria-label="Filter products"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="px-4 py-2 pr-9 rounded-xl bg-white border border-[#E5E7EB] text-[#1F2937] placeholder:text-gray-500 outline-none text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/15 transition w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                >
                  <X size={14} />
                </button>
              )}
            </form>

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
                  {cat === "Fruits" && "🍎"}
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
        ) : productLoadError ? (
          <div
            role="alert"
            className="text-center py-16 bg-white rounded-3xl border border-red-200 p-8"
          >
            <h3 className="text-xl font-semibold text-gray-800">
              Products are temporarily unavailable
            </h3>
            <p className="text-gray-600 mt-2 text-sm">
              We couldn&apos;t load the catalog. Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={fetchProducts}
              disabled={loadingVegetables}
              className="mt-4 px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {loadingVegetables ? "Retrying..." : "Try again"}
            </button>
          </div>
        ) : sortedVegetables.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E5E7EB] p-8">
            <div className="text-6xl mb-4">🥦</div>
            <h3 className="text-xl font-semibold text-gray-700">No vegetables found</h3>
            <p className="text-gray-500 mt-2 text-sm">Try a different search term or category</p>
            <button
              onClick={() => { clearSearch(); setSelectedCategory("All"); setSortBy("default"); }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition shadow-md"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedVegetables.map((veg) => (
              <VegetableCard key={veg._id} veg={veg} />
            ))}
          </div>
        )}

      </div>

      <section className="vm-voice-shopping max-w-7xl mx-auto px-4 py-8">
        <div>
          <div className="vm-section-heading">
            <div>
              <p className="vm-eyebrow">A HANDS-FREE WAY TO SHOP</p>
              <h2>Prefer to speak your list?</h2>
            </div>
            <p>Tell the shopping assistant what you need.</p>
          </div>
          <VoiceShoppingAssistant
            products={vegetables}
            productLoadError={productLoadError}
            user={customerUser}
          />
        </div>
      </section>


      {/* ============================================ */}
      {/* 🚀 WHY VIJJIESMART */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 py-10 pb-0">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Why shop with <span className="text-green-400">VIJJIES-MART</span>?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: "🌱", title: "Market produce", desc: "Browse the current product catalogue" },
            { icon: "💳", title: "Clear checkout", desc: "Review taxes and discounts before payment" },
            { icon: "📍", title: "Order tracking", desc: "Follow your order status after checkout" },
            { icon: "🚚", title: "Free delivery", desc: "No delivery charge at checkout" },
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


      </main>

      {/* ============================================ */}
      {/* 🛒 FLOATING BOTTOM CART BAR (SWIGGY/ZEPTO STYLE) */}
      {/* ============================================ */}
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="vm-home-cart-bar fixed left-1/2 z-[70] flex w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-3.5 text-[#172B20] shadow-[0_12px_40px_rgba(15,23,42,0.28)] sm:w-[92%]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ShoppingCart size={21} className="text-emerald-800" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight text-[#172B20]">
                {totalItems} {totalItems === 1 ? "item" : "items"} in cart
              </p>
              <p className="text-xs font-semibold text-[#475569]">
                Total: ₹{totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/cart")}
            className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-800 cursor-pointer sm:px-5"
          >
            View Cart →
          </button>
        </motion.div>
      )}

    </div>
  );
}
