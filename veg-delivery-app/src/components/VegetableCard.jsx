import { motion } from "framer-motion";
import { ShoppingCart, Check, AlertCircle, Minus, Plus } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { CartContext } from "../context/CartContext";
import { priceForWeight } from "../utils/money";

const VegetableCard = ({ veg }) => {
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const [weight, setWeight] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // =========================================================
  // STOCK CHECK
  // =========================================================
  // Priority:
  // 1. If inStock exists, use it.
  // 2. Otherwise, check stock quantity.
  // 3. If neither exists, assume the product is available.
  // =========================================================

  const isOutOfStock = useMemo(() => {
    if (!veg) return false;

    // If backend provides an explicit inStock boolean,
    // trust that value first.
    if (typeof veg.inStock === "boolean") {
      return veg.inStock === false;
    }

    // If stock quantity exists, check the quantity.
    if (veg.stock !== undefined && veg.stock !== null && veg.stock !== "") {
      const stockValue = Number(veg.stock);

      if (Number.isFinite(stockValue)) {
        return stockValue <= 0;
      }
    }

    // If no stock information is available,
    // don't incorrectly mark the product as out of stock.
    return false;
  }, [veg]);

  const currentCartItem = cart?.find(
    (item) =>
      String(item.productId ?? item.id) === String(veg?._id) &&
      !item.voiceWeightBased &&
      Number(item.weight ?? 1) === weight
  );

  const price = useMemo(
    () => priceForWeight(veg?.pricePerKg, weight),
    [veg?.pricePerKg, weight]
  );

  const weightOptions = [
    { value: 0.25, label: "250g" },
    { value: 0.5, label: "500g" },
    { value: 1, label: "1kg" },
  ];

  const handleAdd = () => {
    if (isOutOfStock) return;

    addToCart({
      id: veg?._id,
      name: veg?.name,
      price,
      pricePerKg: veg?.pricePerKg,
      weight,
      image: veg?.image,
    });

    setJustAdded(true);

    setTimeout(() => {
      setJustAdded(false);
    }, 1200);
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className="vm-product-card w-full rounded-2xl overflow-hidden bg-white text-gray-800 border border-emerald-100 flex flex-col justify-between transition-all"
    >
      {/* IMAGE CONTAINER */}
      <div className="relative h-44 w-full bg-emerald-50/50 overflow-hidden">
        <img
          src={
            veg?.image ||
            "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"
          }
          alt={veg?.name || "Vegetable"}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${
            isOutOfStock ? "grayscale opacity-60" : ""
          }`}
          loading="lazy"
        />

        {/* STATUS BADGES */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {isOutOfStock ? (
            <span className="vm-stock-badge vm-stock-unavailable bg-red-600/95 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
              <AlertCircle size={12} /> Out of Stock
            </span>
          ) : (
            <span className="vm-stock-badge bg-emerald-700 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
              In stock
            </span>
          )}
        </div>

      </div>

      {/* CONTENT */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Name */}
        <h3
          className="text-base font-bold text-gray-900"
          title={veg?.name}
        >
          {veg?.name}
        </h3>

        {/* Price & Unit Display */}
        <div className="vm-card-pricing flex items-baseline justify-between">
          <p className="text-emerald-700 font-extrabold text-xl tracking-tight">
            ₹{price.toFixed(2)}<span className="vm-card-unit"> / {weight < 1 ? `${weight * 1000}g` : "kg"}</span>
          </p>

          <span className="text-xs text-gray-500 font-medium">
            ₹{Number(veg?.pricePerKg) || 0}/kg
          </span>
        </div>

        {/* WEIGHT SELECTOR */}
        <div className="flex gap-1.5 mt-1">
          {weightOptions.map((w) => (
            <button
              key={w.value}
              type="button"
              disabled={isOutOfStock}
              onClick={() => setWeight(w.value)}
              className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${
                weight === w.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
              } ${
                isOutOfStock
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* ACTION BUTTON */}
        {currentCartItem ? (
          <div className="vm-card-quantity" role="group" aria-label={`${currentCartItem.quantity} ${veg?.name} in cart`}>
            <button
              type="button"
              onClick={() => decreaseQty(veg?._id, weight)}
              aria-label={`Remove one ${veg?.name} from cart`}
            >
              <Minus size={16} />
            </button>
            <span>{currentCartItem.quantity} in cart</span>
            <button
              type="button"
              onClick={() => increaseQty(veg?._id, weight)}
              aria-label={`Add one ${veg?.name} to cart`}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <motion.button
            onClick={handleAdd}
            disabled={isOutOfStock}
            whileTap={{ scale: isOutOfStock ? 1 : 0.97 }}
            className={`vm-card-add mt-3 w-full py-2.5 rounded-xl flex items-center justify-center gap-2
          text-sm font-bold transition-all ${
            isOutOfStock
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : justAdded
              ? "bg-emerald-800 text-white"
              : "bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
          }`}
          >
            {isOutOfStock ? (
              "Out of Stock"
            ) : justAdded ? (
              <>
                <Check size={16} />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Add to cart
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default VegetableCard;