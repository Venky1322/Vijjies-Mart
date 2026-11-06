import { createContext, useState, useEffect } from "react";
import { priceForWeight, roundMoney, toPaise, fromPaise } from "../utils/money";

export const CartContext = createContext();

const matchesCartItem = (item, id, weight = 1, voiceWeightBased = false) => {
  const sameProduct = String(item.productId ?? item.id) === String(id);
  const sameKind = Boolean(item.voiceWeightBased) === voiceWeightBased;
  const sameWeight =
    voiceWeightBased || Number(item.weight ?? 1) === Number(weight ?? 1);

  return sameProduct && sameKind && sameWeight;
};

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
    setCart((currentCart) => {
      const existing = currentCart.find((cartItem) =>
        matchesCartItem(
          cartItem,
          item.id,
          item.weight,
          Boolean(item.voiceWeightBased)
        )
      );

      if (!existing) {
        return [
          ...currentCart,
          {
            ...item,
            price: roundMoney(item.price),
            quantity: 1,
          },
        ];
      }

      return currentCart.map((cartItem) => {
        if (!matchesCartItem(
          cartItem,
          item.id,
          item.weight,
          Boolean(item.voiceWeightBased)
        )) {
          return cartItem;
        }

        if (cartItem.voiceWeightBased) {
          const weight =
            Number(cartItem.weight) + Number(item.weight || 1);
          return {
            ...cartItem,
            weight,
            price: priceForWeight(cartItem.pricePerKg, weight),
          };
        }

        return {
          ...cartItem,
          quantity: Number(cartItem.quantity || 1) + 1,
        };
      });
    });
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
          price: priceForWeight(pricePerKg, totalWeight),
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
  const removeFromCart = (id, weight = 1, voiceWeightBased = false) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => !matchesCartItem(item, id, weight, voiceWeightBased)
      )
    );
  };

  // ➕ Increase
  const increaseQty = (id, weight = 1, voiceWeightBased = false) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (!matchesCartItem(item, id, weight, voiceWeightBased)) {
          return item;
        }

        if (item.voiceWeightBased) {
          const nextWeight = Number(item.weight) + 0.25;
          return {
            ...item,
            weight: nextWeight,
            price: priceForWeight(item.pricePerKg, nextWeight),
          };
        }

        return { ...item, quantity: Number(item.quantity || 1) + 1 };
      })
    );
  };

  // ➖ Decrease
  const decreaseQty = (id, weight = 1, voiceWeightBased = false) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (!matchesCartItem(item, id, weight, voiceWeightBased)) {
            return item;
          }

          if (item.voiceWeightBased) {
            const nextWeight = Number(item.weight) - 0.25;
            return {
              ...item,
              weight: nextWeight,
              price: priceForWeight(item.pricePerKg, nextWeight),
            };
          }

          return { ...item, quantity: Number(item.quantity || 1) - 1 };
        })
        .filter((item) =>
          item.voiceWeightBased
            ? Number(item.weight) > 0
            : Number(item.quantity) > 0
        )
    );
  };

  // 🧹 CLEAR CART (UPDATED)
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  // 💰 Total
  const totalPrice = fromPaise(
    cart.reduce(
      (total, item) =>
        total + toPaise(item.price) * Number(item.quantity || 1),
      0
    )
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