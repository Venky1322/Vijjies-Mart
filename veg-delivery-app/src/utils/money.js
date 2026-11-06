export const toPaise = (amount) =>
  Math.round((Number(amount) || 0) * 100);

export const fromPaise = (amount) => amount / 100;

export const roundMoney = (amount) => fromPaise(toPaise(amount));

export const priceForWeight = (pricePerKg, weight) =>
  roundMoney((Number(pricePerKg) || 0) * (Number(weight) || 0));

export const calculateCartPricing = (subtotal) => {
  const subtotalPaise = Math.max(0, toPaise(subtotal));
  const discountPaise =
    subtotalPaise >= 30000 ? Math.round(subtotalPaise * 0.1) : 0;
  const taxablePaise = subtotalPaise - discountPaise;
  const gstPaise = Math.round(taxablePaise * 0.05);

  return {
    subtotal: fromPaise(subtotalPaise),
    discount: fromPaise(discountPaise),
    gst: fromPaise(gstPaise),
    total: fromPaise(taxablePaise + gstPaise),
  };
};
