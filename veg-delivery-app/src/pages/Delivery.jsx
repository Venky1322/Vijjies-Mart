import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Clock3, MapPin, Truck, CheckCircle2, ArrowLeft, RefreshCw, ShoppingBag, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Exact backend order status sequence
const ORDER_STEPS = [
  { key: "Placed", label: "Order Placed", desc: "Order received & confirmed" },
  { key: "Assigned", label: "Partner Assigned", desc: "Delivery partner assigned" },
  { key: "Reached Vendor", label: "Reached Vendor", desc: "Vegetables being collected" },
  { key: "Out for Delivery", label: "Out for Delivery", desc: "On the way to your address" },
  { key: "Delivered", label: "Delivered", desc: "Package handed over" },
];

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const Delivery = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderIdFromUrl = searchParams.get("orderId");

  const [order, setOrder] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Fetch target order
  const fetchOrderDetails = async () => {
    try {
      if (orderIdFromUrl) {
        const res = await fetch(`${API}/orders/${orderIdFromUrl}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
          updatePartnerCoordinates(data.order);
        } else {
          setError(data.message || "Order not found");
        }
      } else if (user?.email) {
        // Fetch latest order for logged in customer
        const res = await fetch(`${API}/orders/user/${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setOrder(data.orders[0]);
          updatePartnerCoordinates(data.orders[0]);
        } else {
          setError("No active orders found to track.");
        }
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Tracking fetch error:", err);
      setError("Unable to connect to tracking service.");
    } finally {
      setLoading(false);
    }
  };

  const updatePartnerCoordinates = async (orderData) => {
    if (orderData?.deliveryPartnerId?._id) {
      const partnerId = orderData.deliveryPartnerId._id;
      try {
        const res = await fetch(`${API}/delivery/location/${partnerId}`);
        const data = await res.json();
        if (data.success && data.liveLocation?.lat && data.liveLocation?.lng) {
          setPartnerLocation(data.liveLocation);
        } else if (orderData.deliveryPartnerId.liveLocation?.lat) {
          setPartnerLocation(orderData.deliveryPartnerId.liveLocation);
        }
      } catch (e) {
        console.error("Partner location fetch error:", e);
      }
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    // Poll order status & partner location every 6 seconds
    const interval = setInterval(fetchOrderDetails, 6000);
    return () => clearInterval(interval);
  }, [orderIdFromUrl]);

  // Current Step Index based on actual backend status
  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const idx = ORDER_STEPS.findIndex((s) => s.key === order.status);
    return idx >= 0 ? idx : 0;
  }, [order?.status]);

  // Distance & Transparent ETA Calculation
  const { distanceKm, etaMinutes } = useMemo(() => {
    const custLoc = order?.customerLocation;
    const refLoc = partnerLocation?.lat ? partnerLocation : order?.vendorLocation;

    if (!custLoc?.lat || !refLoc?.lat) {
      return { distanceKm: null, etaMinutes: null };
    }

    const dist = calculateHaversineDistance(
      Number(refLoc.lat),
      Number(refLoc.lng),
      Number(custLoc.lat),
      Number(custLoc.lng)
    );

    if (dist === null) return { distanceKm: null, etaMinutes: null };

    // Estimation: 25 km/h urban speed + 5 min buffer
    const mins = Math.max(5, Math.round((dist / 25) * 60 + 5));
    return { distanceKm: dist, etaMinutes: mins };
  }, [order, partnerLocation]);

  // Active Map Coordinates: Prioritize Partner Live Location if out for delivery, else Customer
  const mapCenter = useMemo(() => {
    if (partnerLocation?.lat && partnerLocation?.lng) {
      return `${partnerLocation.lat},${partnerLocation.lng}`;
    }
    if (order?.customerLocation?.lat && order?.customerLocation?.lng) {
      return `${order.customerLocation.lat},${order.customerLocation.lng}`;
    }
    return "16.7890,80.8492"; // Default shop coordinates
  }, [partnerLocation, order]);

  const mapSrc = useMemo(() => {
    return `https://www.google.com/maps?q=${mapCenter}&z=15&output=embed`;
  }, [mapCenter]);

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/my-orders")}
              className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F1F8F3] transition text-gray-700 cursor-pointer"
              title="My Orders"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Live Order Tracking</h1>
              <p className="text-sm text-green-700 font-medium">
                {order?._id ? `Order #${order._id.slice(-6).toUpperCase()}` : "Real-time delivery progress"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {etaMinutes && order?.status !== "Delivered" && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 shadow-sm">
                <p className="text-xs text-gray-500">Estimated Arrival</p>
                <p className="text-lg font-extrabold text-green-700">
                  ~{etaMinutes} mins{" "}
                  {distanceKm && <span className="text-xs font-medium text-gray-600">({distanceKm} km)</span>}
                </p>
              </div>
            )}
            <button
              onClick={fetchOrderDetails}
              className="p-3 rounded-2xl bg-white hover:bg-[#F1F8F3] border border-[#E5E7EB] transition cursor-pointer"
              title="Refresh tracking"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-12 text-center max-w-lg mx-auto mt-10 shadow-sm">
            <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold">{error}</h2>
            <button
              onClick={() => navigate("/my-orders")}
              className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
            >
              View Order History
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

            {/* Tracking Timeline */}
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-6">
                  <h2 className="text-lg font-bold text-[#1F2937]">Delivery Journey</h2>
                  <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#EAF6EC] text-green-800 border border-green-200">
                    {order?.status || "Placed"}
                  </span>
                </div>

                <div className="space-y-6">
                  {ORDER_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <motion.div
                        key={step.key}
                        initial={{ x: -15, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-start gap-4 relative"
                      >
                        {/* Vertical line connecting steps */}
                        {idx < ORDER_STEPS.length - 1 && (
                          <div
                            className={`absolute left-2.5 top-6 w-0.5 h-10 ${
                              idx < currentStepIndex ? "bg-emerald-500" : "bg-white/15"
                            }`}
                          />
                        )}

                        {/* Dot indicator */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            isCompleted
                              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/50"
                              : "bg-gray-100 border border-gray-300"
                          } ${isCurrent ? "ring-4 ring-emerald-500/30" : ""}`}
                        >
                          {isCompleted ? <CheckCircle2 size={14} className="text-black stroke-[3]" /> : null}
                        </div>

                        <div>
                          <p
                            className={`font-bold text-sm ${
                              isCurrent ? "text-green-700" : isCompleted ? "text-gray-800" : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Order Quick Summary */}
              {order && (
                <div className="mt-8 pt-4 border-t border-[#E5E7EB] text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="font-semibold text-gray-800">
                      {order.paymentMethod} ({order.paymentStatus})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-bold text-green-700 text-sm">
                      ₹{Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items Count:</span>
                    <span className="font-semibold text-gray-800">{order.items?.length || 0} items</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Map & GPS section */}
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2937]">Live Location Radar</h2>
                    <p className="text-xs text-gray-500">
                      {partnerLocation
                        ? "Delivery partner live GPS active"
                        : "Tracking customer destination coordinate"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#EAF6EC] border border-green-200 px-3 py-1.5 text-xs text-green-800 font-semibold">
                    <Truck size={14} /> Live Sync
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-inner">
                  <iframe
                    title="Delivery Route Map"
                    src={mapSrc}
                    className="h-[380px] sm:h-[430px] w-full"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-green-700" />
                  <span>
                    Destination GPS:{" "}
                    {order?.customerLocation?.lat
                      ? `${order.customerLocation.lat.toFixed(4)}, ${order.customerLocation.lng.toFixed(4)}`
                      : "Verified"}
                  </span>
                </div>

                {order?.customerLocation?.lat && (
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${order.customerLocation.lat},${order.customerLocation.lng}`;
                      window.open(url, "_blank");
                    }}
                    className="text-green-700 hover:text-green-800 font-semibold underline cursor-pointer"
                  >
                    Open in Google Maps ↗
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Delivery;
