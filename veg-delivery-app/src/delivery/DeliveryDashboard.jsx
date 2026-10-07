import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [orders, setOrders] = useState([]);

  const [location, setLocation] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const partnerId = user?._id;

  useEffect(() => {
    if (!user || user.role !== "delivery") {
      navigate("/delivery-login");
      return;
    }

    fetchOrders();

    // 📍 Start live GPS tracking
    const watchId = startLiveTracking();

    // 🛑 Stop tracking when dashboard closes
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [partnerId]);

  const fetchOrders = async () => {
    try {
      if (!partnerId) {
        return;
      }

      const res = await fetch(
        `${API}/orders/partner/${partnerId}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(
          data.message || "Failed to fetch orders"
        );

        return;
      }

      setOrders(data.orders || []);

    } catch (error) {
      console.error(
        "Error fetching delivery orders:",
        error
      );
    }
  };

  // ✅ LIVE GPS TRACKING (with return watchId)
  const startLiveTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported on this device.");
      return;
    }

    if (!partnerId) {
      console.error("Delivery partner ID not found.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Update frontend location
        setLocation({
          lat,
          lng,
        });

        console.log("📍 LIVE LOCATION:", {
          lat,
          lng,
        });

        try {
          // Send location to backend
          const res = await fetch(
            `${API}/delivery/update-location`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                partnerId,
                lat,
                lng,
              }),
            }
          );

          const data = await res.json();

          if (!res.ok) {
            console.error(
              "Location update failed:",
              data.message
            );
            return;
          }

          console.log(
            "✅ Location saved:",
            data.liveLocation
          );

        } catch (error) {
          console.error(
            "❌ Location API error:",
            error
          );
        }
      },

      (error) => {
        console.error(
          "GPS tracking error:",
          error
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return watchId;
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API}/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      fetchOrders();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };
  const navigateToLocation = (location) => {
    if (!location) {
      alert("Location is not available.");
      return;
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.log("INVALID LOCATION:", location);
      alert("Invalid location coordinates.");
      return;
    }

    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lng}` +
      `&travelmode=driving`;

    console.log("OPENING MAP:", googleMapsUrl);

    window.open(googleMapsUrl, "_blank");
  };

  const totalEarnings = orders.reduce(
    (sum, o) => sum + (o.earning || 0),
    0
  );

  // 🚀 SWIPE BUTTON
  const SwipeButton = ({ text, onSwipe, color }) => {
    const x = useMotionValue(0);
    const maxSwipe = 220;

    const bg = useTransform(
      x,
      [0, maxSwipe],
      ["#374151", color]
    );

    const handleDragEnd = (event, info) => {
      console.log("Swipe distance:", info.offset.x);

      if (info.offset.x >= 120) {
        console.log("SWIPE SUCCESS");

        onSwipe();

        // Reset slider
        setTimeout(() => {
          x.set(0);
        }, 200);
      } else {
        console.log("SWIPE TOO SHORT");
        x.set(0);
      }
    };

    return (
      <div className="relative w-full mt-4 h-14 rounded-full overflow-hidden bg-gray-700">

        <motion.div
          className="absolute inset-0"
          style={{
            background: bg,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-semibold">
          {text}
        </div>

        <motion.div
          drag="x"
          dragElastic={0}
          dragMomentum={false}
          dragConstraints={{
            left: 0,
            right: maxSwipe,
          }}
          style={{ x }}
          onDragEnd={handleDragEnd}
          className="absolute top-1 left-1 h-12 w-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing z-10 select-none"
        >
          ➡️
        </motion.div>

      </div>
    );
  };
  return (
    <div className="min-h-screen flex 
    bg-[#F7F8F5] text-[#1F2937]">

      {/* SIDEBAR */}
      <div className="w-64 bg-white p-6 shadow-sm border-r border-[#E5E7EB]">
        <h2 className="text-2xl font-bold mb-8 tracking-wide">
          🚚 Delivery
        </h2>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#EAF6EC] text-green-800 flex items-center gap-2">
            📦 Orders
          </div>
          <div className="p-3 rounded-xl hover:bg-[#F1F8F3] cursor-pointer">
            💰 Earnings
          </div>
          <div className="p-3 rounded-xl hover:bg-[#F1F8F3] cursor-pointer">
            ⚙️ Settings
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        <h1 className="text-3xl font-bold mb-6">
          🚚 Delivery Dashboard
        </h1>

        {/* WALLET */}
        <div className="mb-8 flex gap-6 flex-wrap">
          <div className="w-56 h-40 bg-[#EAF6EC] text-green-900 border border-[#E5E7EB]
          rounded-2xl flex flex-col justify-center items-center shadow-sm">
            <p className="text-sm opacity-80">Wallet Balance</p>
            <p className="text-3xl font-bold mt-2">₹{totalEarnings}</p>

            <button className="mt-3 bg-white px-4 py-1 rounded-lg text-sm text-green-800 hover:bg-green-50">
              Withdraw
            </button>
          </div>
        </div>

        {/* ORDERS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {orders.map((order) => {

            console.log("ORDER:", order._id);
            console.log("STATUS:", order.status);
            console.log("VENDOR:", order.vendorLocation);
            console.log("CUSTOMER:", order.customerLocation);

            const isGoingToVendor =
              order.status === "Assigned" ||
              order.status === "Reached Vendor";

            const destinationLocation = isGoingToVendor
              ? order.vendorLocation
              : order.customerLocation;

            console.log(
              "NAVIGATION DESTINATION:",
              isGoingToVendor ? "VENDOR" : "CUSTOMER",
              destinationLocation
            );

            const mapLocation =
              destinationLocation
                ? `${destinationLocation.lat},${destinationLocation.lng}`
                : "17.385,78.4867";

            return (
              <div
                key={order._id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] flex flex-col justify-between"
              >

                <h2 className="font-bold text-lg mb-2">
                  Order #{order._id.slice(-6)}
                </h2>

                <p className="text-sm text-gray-600">
                  Status: {order.status}
                </p>

                {/* MAP */}
                <iframe
                  src={`https://www.google.com/maps?q=${mapLocation}&output=embed`}
                  className="w-full h-44 rounded-xl mt-3 border border-green-700/30"
                />
                <button
                  onClick={() => {
                    const targetLocation =
                      order.status === "Assigned" ||
                        order.status === "Reached Vendor"
                        ? order.vendorLocation
                        : order.customerLocation;

                    navigateToLocation(targetLocation);
                  }}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold transition"
                >
                  🧭 Navigate
                </button>

                {/* SWIPE BUTTONS */}
                {order.status === "Assigned" && (
                  <SwipeButton
                    text="Slide to Reach Vendor"
                    color="#2563eb"
                    onSwipe={() =>
                      updateStatus(order._id, "Reached Vendor")
                    }
                  />
                )}

                {order.status === "Reached Vendor" && (
                  <SwipeButton
                    text="Slide to Start Delivery"
                    color="#f97316"
                    onSwipe={() =>
                      updateStatus(order._id, "Out for Delivery")
                    }
                  />
                )}

                {order.status === "Out for Delivery" && (
                  <SwipeButton
                    text="Slide to Deliver"
                    color="#16a34a"
                    onSwipe={() =>
                      updateStatus(order._id, "Delivered")
                    }
                  />
                )}

                <p className="mt-4 text-green-300 font-bold text-lg">
                  💰 ₹{order.earning || 0}
                </p>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;