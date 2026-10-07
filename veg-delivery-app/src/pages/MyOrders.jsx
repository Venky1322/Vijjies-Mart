import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Truck, CheckCircle2, Clock, MapPin, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusColors = {
  Placed: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  Assigned: "bg-purple-500/20 text-purple-300 border-purple-400/30",
  "Reached Vendor": "bg-amber-500/20 text-amber-300 border-amber-400/30",
  "Out for Delivery": "bg-orange-500/20 text-orange-300 border-orange-400/30",
  Delivered: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchCustomerOrders();
  }, []);

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/orders/user/${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Fetch customer orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-gray-200 cursor-pointer"
              title="Home"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">My Orders</h1>
              <p className="text-sm text-green-700 font-medium">
                Track status and view history for {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={fetchCustomerOrders}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F1F8F3] border border-[#E5E7EB] text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-3xl bg-white border border-[#E5E7EB] p-6 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm max-w-md mx-auto mt-12"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl">
              📦
            </div>
            <h2 className="text-2xl font-bold text-[#1F2937]">No Orders Found</h2>
            <p className="mt-2 text-sm text-gray-500">
              You haven't placed any vegetable orders yet.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 transition-all text-white font-bold text-sm shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              🥦 Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={order._id}
                  className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:border-emerald-500/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-[#1F2937]">
                          Order #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold border ${
                            statusColors[order.status] || "bg-gray-500/20 text-gray-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Clock size={13} /> {dateStr}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xl font-extrabold text-green-700">
                        ₹{Number(order.total || 0).toFixed(2)}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}>
                        {order.paymentMethod} • {order.paymentStatus?.toUpperCase() || "PENDING"}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="py-4 space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm text-gray-600">
                        <span>
                          {item.name} × {item.weight >= 1 ? `${item.weight}kg` : `${item.weight * 1000}g`} ({item.quantity} qty)
                        </span>
                        <span className="font-medium text-[#1F2937]">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin size={14} className="text-green-700" />
                      {order.customerLocation?.lat && order.customerLocation?.lng
                        ? `GPS: ${order.customerLocation.lat.toFixed(4)}, ${order.customerLocation.lng.toFixed(4)}`
                        : "Location recorded"}
                    </div>

                    <button
                      onClick={() => navigate(`/delivery?orderId=${order._id}`)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck size={14} /> Live Tracking <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
