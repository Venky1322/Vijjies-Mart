import { useContext, useMemo } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, ArrowLeft, Tag, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const Cart = () => {
  const navigate = useNavigate();

  const {
    cart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    totalPrice,
    clearCart,
  } = useContext(CartContext);

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Business rules: Minimum order ₹100, 10% discount above ₹300
  const discount = useMemo(() => {
    return totalPrice >= 300 ? Number((totalPrice * 0.10).toFixed(2)) : 0;
  }, [totalPrice]);

  const meetsMinimum = totalPrice >= 100;
  const amountToMinimum = Math.max(0, 100 - totalPrice);
  const amountToDiscount = Math.max(0, 300 - totalPrice);

  const discountedTotal = Number((totalPrice - discount).toFixed(2));

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Back and Title Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F8F3] transition text-gray-700"
              title="Continue Shopping"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-[#1F2937] tracking-tight">Shopping Cart</h1>
              <p className="text-sm text-green-700 font-medium">
                {itemCount} {itemCount === 1 ? "item" : "items"} selected for checkout
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-5 py-3 border border-[#E5E7EB] flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#EAF6EC] flex items-center justify-center text-green-700 font-bold">
              ₹
            </div>
            <div>
              <p className="text-xs text-gray-500">Cart Total</p>
              <p className="text-2xl font-extrabold text-green-700">₹{totalPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm max-w-lg mx-auto mt-12"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#EAF6EC] flex items-center justify-center text-4xl">
              🥬
            </div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Your cart is empty</h2>
            <p className="mt-2 text-sm text-gray-600">
              Fresh, farm-harvested vegetables are waiting for you.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 transition-all text-white font-bold text-sm shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              🥦 Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* Cart Items List */}
            <div className="space-y-4">

              {/* Promotional Discount & Minimum Order Alert */}
              {!meetsMinimum ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-sm">
                  <AlertCircle size={20} className="shrink-0 text-amber-600" />
                  <span>
                    Minimum order amount is <strong>₹100</strong>. Add <strong>₹{amountToMinimum.toFixed(2)}</strong> more to place order.
                  </span>
                </div>
              ) : amountToDiscount > 0 ? (
                <div className="bg-[#F1F8F3] border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-900 text-sm">
                  <Tag size={20} className="shrink-0 text-green-700" />
                  <span>
                    Add <strong>₹{amountToDiscount.toFixed(2)}</strong> more to unlock an instant <strong>10% OFF discount</strong>!
                  </span>
                </div>
              ) : (
                <div className="bg-[#EAF6EC] border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-900 text-sm font-semibold">
                  <Tag size={20} className="shrink-0 text-green-700" />
                  <span>🎉 10% Discount applied! You saved ₹{discount.toFixed(2)}</span>
                </div>
              )}

              {cart.map((item) => {
                const weight = parseFloat(item.weight || 1);
                const pricePerKg = item.pricePerKg ? parseFloat(item.pricePerKg) : (weight > 0 ? item.price / weight : item.price);
                const itemSubtotal = item.price * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200"}
                          alt={item.name}
                          className="h-20 w-20 rounded-2xl object-cover border border-[#E5E7EB] shadow-sm"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-[#1F2937]">
                            {item.name}
                          </h3>
                          <p className="text-xs text-green-700 font-semibold mt-0.5">
                            {item.voiceWeightBased
                              ? `${weight.toFixed(2).replace(/\.?0+$/, "")} kg total`
                              : `${weight >= 1 ? `${weight} kg` : `${weight * 1000}g`} packet`}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            ₹{item.price.toFixed(2)} / pack{" "}
                            <span className="text-xs text-gray-500">
                              (₹{pricePerKg.toFixed(2)}/kg)
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-red-400 transition hover:bg-red-500 hover:text-white cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-3 py-1.5 bg-[#F7F8F5]">
                        <button
                          onClick={() => decreaseQty(item.id)}
                          className="text-gray-600 hover:text-gray-900 transition cursor-pointer p-0.5"
                          title="Decrease"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="min-w-6 text-center font-bold text-sm text-[#1F2937]">
                          {item.voiceWeightBased
                            ? `${weight.toFixed(2).replace(/\.?0+$/, "")} kg`
                            : item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQty(item.id)}
                          className="text-gray-600 hover:text-gray-900 transition cursor-pointer p-0.5"
                          title="Increase"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      {/* Line Item Subtotal */}
                      <p className="text-sm text-gray-600">
                        Subtotal:{" "}
                        <span className="font-bold text-[#1F2937] text-base">
                          ₹{itemSubtotal.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary Sidebar */}
            <div className="h-fit rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sticky top-24">
              <h3 className="text-xl font-bold text-[#1F2937] pb-3 border-b border-[#E5E7EB]">
                Order Summary
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Cart Items</span>
                  <span className="font-semibold text-[#1F2937]">{itemCount}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1F2937]">₹{totalPrice.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>10% Discount (&gt;₹300)</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="text-green-700 font-semibold">FREE</span>
                </div>

                <div className="flex justify-between border-t border-[#E5E7EB] pt-3 text-lg font-extrabold text-[#1F2937]">
                  <span>Order Total</span>
                  <span className="text-green-700 text-2xl">₹{discountedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Secure badge */}
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                <ShieldCheck size={16} className="text-green-700" />
                <span>100% Fresh & Contactless Delivery</span>
              </div>

              {/* Proceed to Checkout / Payment */}
              <button
                onClick={() => navigate("/payment")}
                disabled={!meetsMinimum}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm transition-all shadow-lg ${
                  meetsMinimum
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:scale-[1.02] shadow-emerald-500/30 cursor-pointer"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                }`}
              >
                <CreditCard size={18} />
                {meetsMinimum ? "Proceed to Payment" : `Add ₹${amountToMinimum.toFixed(2)} more`}
              </button>

              <button
                onClick={clearCart}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-[#E5E7EB] py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <Trash2 size={14} />
                Clear Cart
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;