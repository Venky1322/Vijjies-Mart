export const withStockAlternative = (items, productId, rawQuantity) => {
  const quantity = Number(rawQuantity);
  const item = items.find(
    (pendingItem) =>
      String(pendingItem.product._id) === String(productId) &&
      pendingItem.requiresStockApproval
  );
  const quarterKgIncrements = quantity * 4;

  if (
    !item ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > item.availableQuantity ||
    Math.abs(quarterKgIncrements - Math.round(quarterKgIncrements)) > 1e-8
  ) {
    return null;
  }

  return items.map((pendingItem) =>
    String(pendingItem.product._id) === String(productId)
      ? {
          ...pendingItem,
          quantity,
          stockApproved: true,
          requiresStockApproval: false,
        }
      : pendingItem
  );
};
