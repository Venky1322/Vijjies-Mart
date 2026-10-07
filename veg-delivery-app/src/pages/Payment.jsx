import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { CreditCard, Wallet, Truck, ShieldCheck, MapPin, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const Payment = () => {
  const navigate = useNavigate();

  const { cart, totalPrice, clearCart } = useContext(CartContext);

  const [method, setMethod] = useState("ONLINE");
  const [loading, setLoading] = useState(false);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const discount = totalPrice >= 300 ? Number((totalPrice * 0.10).toFixed(2)) : 0;
  const discountedSubtotal = Number((totalPrice - discount).toFixed(2));
  const gst = Number((discountedSubtotal * 0.05).toFixed(2));
  const finalTotal = Number((discountedSubtotal + gst).toFixed(2));

  const user = JSON.parse(localStorage.getItem("user"));
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!cart || cart.length === 0) {
      navigate("/cart");
    } else if (totalPrice < 100) {
      navigate("/cart");
    }
  }, [cart, totalPrice, navigate]);

  //------------------------------------------
  // Get Customer Current Location
  //------------------------------------------
  const getCustomerLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser. Please enable location permissions."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
            reject(new Error("Invalid coordinates detected. Please ensure GPS is active."));
            return;
          }

          const location = { lat, lng };
          setCustomerLocation(location);
          resolve(location);
        },
        (error) => {
          console.error("Location error code:", error.code, error.message);
          let msg = "Location permission is required to deliver your order.";
          if (error.code === 1) {
            msg = "Location permission was denied. Please allow location access in your browser to proceed.";
          } else if (error.code === 2) {
            msg = "Position unavailable. Please turn on your device GPS.";
          } else if (error.code === 3) {
            msg = "Location request timed out. Please try again.";
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  };


  //------------------------------------------
  // Load Razorpay SDK
  //------------------------------------------

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  //------------------------------------------
  // Save Order After Verification
  //------------------------------------------

  const saveOrder = async (
    paymentId,
    razorpayOrderId,
    transactionStatus
  ) => {
    try {
      await fetch(`${API}/orders`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userEmail: user.email,

          items: cart,

          total: finalTotal,

          paymentMethod: method,

          paymentStatus: transactionStatus,

          paymentId,

          razorpayOrderId,

          orderDate: new Date(),
        }),
      });

      clearCart();

      navigate("/order-success");
    } catch (err) {
      console.log(err);
      alert("Unable to save order.");
    }
  };

  //------------------------------------------
  // Razorpay Payment
  //------------------------------------------

  const payWithRazorpay = async (location) => { 
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);

    const loaded = await loadRazorpay();

    if (!loaded) {
      alert("Unable to load Razorpay SDK");
      setLoading(false);
      return;
    }

    try {
      //---------------------------------------
      // Create Razorpay Order
      //---------------------------------------

      const orderRes = await fetch(`${API}/payment/create-order`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          amount: finalTotal,
          items: cart,
          userEmail: user.email,
          paymentMethod: "ONLINE",
          customerLocation: location,
        }),
      });

      const order = await orderRes.json();
      console.log("Create Order Response:", order);

      //---------------------------------------
      // Razorpay Options
      //---------------------------------------

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Venky Startup",
        description: "Fresh Vegetable Purchase",
        image: "/logo.png",
        order_id: order.orderId,

        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "",
        },

        notes: {
          customer: user.email,
        },

        theme: {
          color: "#16a34a",
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },

        handler: async function (response) {
          try {
            //----------------------------------
            // Verify Payment
            //----------------------------------

            const verifyRes = await fetch(
              `${API}/payment/verify`,
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  dbOrderId: order.dbOrderId,
                }),
              }
            );

            const verify = await verifyRes.json();

            //----------------------------------
            // Payment Success
            //----------------------------------

            if (verify.success) {
              // Payment verified successfully

              clearCart();

              alert(
                "Payment Successful\n\nTransaction ID:\n" +
                response.razorpay_payment_id
              );

              navigate("/order-success");
            } else {
              alert("Payment Verification Failed");
            }

            setLoading(false);
          } catch (err) {
            console.log(err);
            alert("Payment Verification Failed");
            setLoading(false);
          }
        },
      };

      const razor = new window.Razorpay(options);

      razor.on("payment.failed", function (response) {
        alert(
          response.error.description ||
          "Payment Failed"
        );

        setLoading(false);
      });

      razor.open();
    } catch (err) {
      console.log(err);

      alert("Unable to start payment.");

      setLoading(false);
    }
  };

  //------------------------------------------
  // COD Order
  //------------------------------------------
  const placeCODOrder = async (location) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
          items: cart,
          total: finalTotal,
          paymentMethod: "COD",
          paymentStatus: "pending",
          paymentId: "",
          razorpayOrderId: "",
          customerLocation: location,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to place COD order");
      }

      clearCart();
      navigate("/order-success");
    } catch (err) {
      console.error("COD Order Error:", err);
      setErrorMessage(err.message || "Order creation failed. Please try again.");
      alert(err.message || "Order Failed");
    } finally {
      setLoading(false);
    }
  };

  //------------------------------------------
  // Proceed / Handle Payment
  //------------------------------------------
  const handlePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setErrorMessage("");

    try {
      setLoading(true);
      const location = await getCustomerLocation();
      setCustomerLocation(location);

      if (method === "ONLINE") {
        await payWithRazorpay(location);
      } else {
        await placeCODOrder(location);
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      setErrorMessage(error.message || "Unable to acquire your delivery location. Please enable location permissions.");
      alert(error.message || "Unable to get your location. Please allow location access.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex items-center justify-center p-4 sm:p-6 text-[#1F2937]">
      <div className="w-full max-w-lg bg-white text-gray-900 rounded-3xl shadow-lg overflow-hidden border border-[#E5E7EB]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 text-white p-6 relative">
          <button
            onClick={() => navigate("/cart")}
            className="absolute left-5 top-6 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            title="Back to Cart"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Secure Checkout</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1">
              Fresh vegetables delivered directly to your doorstep
            </p>
          </div>
        </div>

        <div className="p-6">

          {/* Delivery GPS Location Status */}
          <div className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Delivery Destination
            </h2>
            {customerLocation ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>
                  GPS Confirmed: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-xs font-medium">
                <MapPin size={18} className="text-emerald-600 shrink-0 animate-bounce" />
                <span>Device GPS will pinpoint your delivery address on click</span>
              </div>
            )}
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
            Select Payment Method
          </h2>

          <div className="space-y-3">
            <label
              className={`flex items-center justify-between border-2 rounded-2xl p-4 cursor-pointer transition ${
                method === "ONLINE"
                  ? "border-emerald-600 bg-emerald-50/70 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-700">
                  <Wallet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">Online Payment (Razorpay)</h3>
                  <p className="text-xs text-gray-500">
                    UPI, Google Pay, PhonePe, Cards, Netbanking
                  </p>
                </div>
              </div>

              <input
                type="radio"
                name="payment_method"
                checked={method === "ONLINE"}
                onChange={() => setMethod("ONLINE")}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </label>

            <label
              className={`flex items-center justify-between border-2 rounded-2xl p-4 cursor-pointer transition ${
                method === "COD"
                  ? "border-emerald-600 bg-emerald-50/70 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">Cash On Delivery</h3>
                  <p className="text-xs text-gray-500">
                    Pay with cash or QR upon delivery
                  </p>
                </div>
              </div>

              <input
                type="radio"
                name="payment_method"
                checked={method === "COD"}
                onChange={() => setMethod("COD")}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Order Bill Summary */}
          <div className="mt-5 border border-gray-200 rounded-2xl p-4 bg-gray-50/80">
            <h3 className="font-bold text-sm text-gray-800 mb-3 pb-2 border-b border-gray-200">
              Billing Breakdown
            </h3>

            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Items Total</span>
                <span className="font-semibold text-gray-900">₹{totalPrice.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>10% Discount (&gt;₹300)</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-semibold text-gray-900">₹{gst.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>

              <hr className="my-2 border-gray-200" />

              <div className="flex justify-between text-base sm:text-lg font-extrabold text-gray-900">
                <span>Grand Total</span>
                <span className="text-emerald-700">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={16} />
            <span>256-Bit SSL Encrypted & 100% Safe Payments</span>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full mt-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing Order...
              </span>
            ) : method === "ONLINE" ? (
              <>
                <CreditCard size={18} />
                Pay ₹{finalTotal.toFixed(2)} with Razorpay
              </>
            ) : (
              <>
                <Truck size={18} />
                Place Cash on Delivery Order (₹{finalTotal.toFixed(2)})
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};

export default Payment;