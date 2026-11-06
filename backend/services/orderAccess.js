const isOrderOwner = (user, order) =>
  user?.role === "user" &&
  typeof user.email === "string" &&
  user.email.toLowerCase().trim() === order?.userEmail;

const isAssignedDeliveryPartner = (user, order) => {
  const userId = user?.id;
  const deliveryPartnerId =
    order?.deliveryPartnerId?._id ?? order?.deliveryPartnerId;

  return (
    user?.role === "delivery" &&
    userId != null &&
    deliveryPartnerId != null &&
    String(deliveryPartnerId) === String(userId)
  );
};

const canAccessOrder = (user, order) =>
  user?.role === "admin" ||
  isOrderOwner(user, order) ||
  isAssignedDeliveryPartner(user, order);

const canEmailOrderInvoice = (user, order) =>
  user?.role === "admin" || isOrderOwner(user, order);

module.exports = {
  canAccessOrder,
  canEmailOrderInvoice,
};
