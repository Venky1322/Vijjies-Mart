export const MINIMUM_ORDER_VALUE = 100;

export const calculateProspectiveCartTotal = (cart, voiceItems) => {
  let prospectiveCart = [...cart];

  for (const { product, quantity } of voiceItems) {
    const productId = String(product._id);
    const matchingItems = prospectiveCart.filter(
      (item) => String(item.productId ?? item.id) === productId
    );
    const existingWeight = matchingItems.reduce(
      (total, item) =>
        total +
        Number(item.weight ?? 1) * Number(item.quantity ?? 1),
      0
    );
    const firstMatchingIndex = prospectiveCart.findIndex(
      (item) => String(item.productId ?? item.id) === productId
    );
    const totalWeight = existingWeight + Number(quantity);
    const pricePerKg = Number(product.pricePerKg);
    const voiceCartItem = {
      id: product._id,
      productId: product._id,
      price: pricePerKg * totalWeight,
      quantity: 1,
    };

    prospectiveCart = prospectiveCart.filter(
      (item) => String(item.productId ?? item.id) !== productId
    );
    prospectiveCart.splice(
      firstMatchingIndex < 0 ? prospectiveCart.length : firstMatchingIndex,
      0,
      voiceCartItem
    );
  }

  return prospectiveCart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
};
