import { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

const CartProvider = ({ children }) => {

  // 🔥 Load cart
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // 🔥 Save cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // ➕ Add
  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id);

    if (existing) {
      setCart(
        cart.map((i) =>
          i.id === item.id
            ? i.voiceWeightBased
              ? {
                  ...i,
                  weight: Number(i.weight) + Number(item.weight || 1),
                  price:
                    Number(i.pricePerKg) *
                    (Number(i.weight) + Number(item.weight || 1)),
                }
              : { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const addVoiceOrderItems = (items) => {
    setCart((currentCart) => {
      let updatedCart = [...currentCart];

      for (const { product, quantity } of items) {
        const productId = String(product._id);
        const matchingItems = updatedCart.filter(
          (item) => String(item.productId ?? item.id) === productId
        );
        const existingWeight = matchingItems.reduce(
          (total, item) =>
            total +
            Number(item.weight ?? 1) * Number(item.quantity ?? 1),
          0
        );
        const totalWeight = existingWeight + Number(quantity);
        const pricePerKg = Number(product.pricePerKg);
        const firstMatchingIndex = updatedCart.findIndex(
          (item) => String(item.productId ?? item.id) === productId
        );
        const voiceCartItem = {
          id: product._id,
          productId: product._id,
          name: product.name,
          price: pricePerKg * totalWeight,
          pricePerKg,
          weight: totalWeight,
          quantity: 1,
          image: product.image,
          voiceWeightBased: true,
        };

        updatedCart = updatedCart.filter(
          (item) => String(item.productId ?? item.id) !== productId
        );
        updatedCart.splice(
          firstMatchingIndex < 0 ? updatedCart.length : firstMatchingIndex,
          0,
          voiceCartItem
        );
      }

      return updatedCart;
    });
  };

  // ❌ Remove
  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // ➕ Increase
  const increaseQty = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id
          ? item.voiceWeightBased
            ? {
                ...item,
                weight: Number(item.weight) + 0.25,
                price:
                  Number(item.pricePerKg) * (Number(item.weight) + 0.25),
              }
            : { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // ➖ Decrease
  const decreaseQty = (id) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? item.voiceWeightBased
              ? {
                  ...item,
                  weight: Number(item.weight) - 0.25,
                  price:
                    Number(item.pricePerKg) * (Number(item.weight) - 0.25),
                }
              : { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) =>
          item.voiceWeightBased
            ? Number(item.weight) > 0
            : item.quantity > 0
        )
    );
  };

  // 🧹 CLEAR CART (UPDATED)
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  // 💰 Total
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // 🧮 Total items
  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addVoiceOrderItems,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        totalPrice,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;