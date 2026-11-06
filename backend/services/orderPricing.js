const PRODUCT_ID_PATTERN = /^[a-f\d]{24}$/i;
const QUARTER_KG = 4;
const MINIMUM_ORDER_PAISE = 10000;

class OrderValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "OrderValidationError";
    this.statusCode = statusCode;
  }
}

const toPaise = (amount) => Math.round(amount * 100);
const fromPaise = (amount) => Number((amount / 100).toFixed(2));

const validateCustomerLocation = (location) => {
  const hasCoordinate = (value) =>
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "");

  if (!hasCoordinate(location?.lat) || !hasCoordinate(location?.lng)) {
    throw new OrderValidationError("Valid customer location is required");
  }

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    throw new OrderValidationError("Valid customer location is required");
  }

  return { lat, lng };
};

const sameCheckoutRequest = (order, items, location, paymentMethod) => {
  if (order.paymentMethod !== paymentMethod) return false;

  const normalize = (entries) =>
    entries
      .map((item) => ({
        productId: String(item.productId),
        weight: Number(item.weight),
        quantity: Number(item.quantity),
      }))
      .sort(
        (left, right) =>
          left.productId.localeCompare(right.productId) ||
          left.weight - right.weight ||
          left.quantity - right.quantity
      );

  return (
    JSON.stringify(normalize(order.items)) ===
      JSON.stringify(normalize(items)) &&
    Number(order.customerLocation?.lat) === location.lat &&
    Number(order.customerLocation?.lng) === location.lng
  );
};

const normalizeOrderItems = (items, products) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError("At least one product is required");
  }

  const productsById = new Map(
    products.map((product) => [String(product._id), product])
  );
  const stockRequirements = new Map();
  const normalizedItems = [];
  let subtotalPaise = 0;

  for (const item of items) {
    const productId = String(item?.productId ?? item?.id ?? "");
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      throw new OrderValidationError("Invalid product ID");
    }

    const product = productsById.get(productId);
    if (!product) {
      throw new OrderValidationError("Product not found", 404);
    }

    const weight = Number(item.weight);
    const quantity = Number(item.quantity);
    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      Math.abs(weight * QUARTER_KG - Math.round(weight * QUARTER_KG)) >
        1e-8 ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      throw new OrderValidationError(
        "Product weight must use 0.25 kg increments and quantity must be a positive whole number"
      );
    }

    const pricePerKg = Number(product.pricePerKg);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      throw new OrderValidationError("Product price is invalid", 409);
    }

    const requestedWeight = Math.round(weight * quantity * 10000) / 10000;
    stockRequirements.set(
      productId,
      (stockRequirements.get(productId) || 0) + requestedWeight
    );

    const unitPricePaise = toPaise(pricePerKg * weight);
    const lineTotalPaise = unitPricePaise * quantity;
    subtotalPaise += lineTotalPaise;
    if (
      !Number.isSafeInteger(unitPricePaise) ||
      !Number.isSafeInteger(lineTotalPaise) ||
      !Number.isSafeInteger(subtotalPaise)
    ) {
      throw new OrderValidationError("Order total exceeds the supported amount");
    }

    normalizedItems.push({
      productId,
      name: product.name,
      weight,
      quantity,
      price: fromPaise(unitPricePaise),
    });
  }

  for (const [productId, requestedWeight] of stockRequirements) {
    const product = productsById.get(productId);
    if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < requestedWeight) {
      throw new OrderValidationError(
        `Insufficient stock for ${product.name}`,
        409
      );
    }
  }

  if (subtotalPaise < MINIMUM_ORDER_PAISE) {
    throw new OrderValidationError("Minimum order amount is ₹100");
  }

  const discountPaise =
    subtotalPaise >= 30000 ? Math.round(subtotalPaise * 0.1) : 0;
  const taxablePaise = subtotalPaise - discountPaise;
  const gstPaise = Math.round(taxablePaise * 0.05);
  const totalPaise = taxablePaise + gstPaise;
  if (
    !Number.isSafeInteger(discountPaise) ||
    !Number.isSafeInteger(gstPaise) ||
    !Number.isSafeInteger(totalPaise)
  ) {
    throw new OrderValidationError("Order total exceeds the supported amount");
  }

  return {
    items: normalizedItems,
    stockRequirements,
    subtotalPaise,
    discountPaise,
    gstPaise,
    totalPaise,
    total: fromPaise(totalPaise),
  };
};

module.exports = {
  OrderValidationError,
  fromPaise,
  normalizeOrderItems,
  sameCheckoutRequest,
  toPaise,
  validateCustomerLocation,
};
