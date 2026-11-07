import { useContext, useState, useEffect, useMemo } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { CreditCard, Wallet, Truck, ShieldCheck, MapPin, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiUrl } from "../config/api";
import { calculateCartPricing } from "../utils/money";
import LocationPicker from "../components/LocationPicker";

const Payment = () => {
  const navigate = useNavigate();

  const { cart, totalPrice, clearCart } = useContext(CartContext);

  const [method, setMethod] = useState("ONLINE");
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const pricing = calculateCartPricing(totalPrice);
  const { discount, gst, total: finalTotal } = pricing;

  const user = JSON.parse(localStorage.getItem("user"));
  const checkoutFingerprint = useMemo(
    () =>
      JSON.stringify(
        cart
          .map((item) => ({
            productId: String(item.productId ?? item.id),
            quantity: Number(item.quantity),
            weight: Number(item.weight),
          }))
          .sort((left, right) => left.productId.localeCompare(right.productId))
      ),
    [cart]
  );

  const getCheckoutRequestId = () => {
    const storageKey = `checkout-request:${checkoutFingerprint}`;
    let requestId = sessionStorage.getItem(storageKey);

    if (!requestId) {
      requestId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestId);
    }

    return requestId;
  };

  const clearCheckoutRequestId = () => {
    sessionStorage.removeItem(`checkout-request:${checkoutFingerprint}`);
  };

  const checkoutHeaders = (requestId) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "Idempotency-Key": requestId,
  });

  useEffect(() => {
    if (!cart || cart.length === 0) {
      navigate("/cart");
    } else if (totalPrice < 100) {
      navigate("/cart");
    }
  }, [cart, totalPrice, navigate]);

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

  const closeOnlineCheckout = async (order) => {
    try {
      const response = await fetch(apiUrl("/payment/payment-failed"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          dbOrderId: order.dbOrderId,
          razorpay_order_id: order.orderId,
        }),
      });

      const result = await response.json();
      return (response.ok && result.success) || result.refunded === true;
    } catch (error) {
      console.error("Unable to close online checkout:", error);
      return false;
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

      const orderRes = await fetch(apiUrl("/payment/create-order"), {
        method: "POST",
        headers: checkoutHeaders(getCheckoutRequestId()),
        body: JSON.stringify({
          items: cart,
          customerLocation: { lat: location.lat, lng: location.lng },
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok || !order.success) {
        throw new Error(order.message || "Unable to create payment order");
      }
      console.log("Create Order Response:", order);

      //---------------------------------------
      // Razorpay Options
      //---------------------------------------

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "VIJJIES-MART",
        description: "Fresh produce order",
        image: "/favicon.svg",
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
          color: "#174833",
        },

        modal: {
          ondismiss: async () => {
            const closed = await closeOnlineCheckout(order);
            if (closed) clearCheckoutRequestId();
            setLoading(false);
          },
        },

        handler: async function (response) {
          try {
            //----------------------------------
            // Verify Payment
            //----------------------------------

            const verifyRes = await fetch(
              apiUrl("/payment/verify"),
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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
              clearCheckoutRequestId();

              alert(
                "Payment Successful\n\nTransaction ID:\n" +
                response.razorpay_payment_id
              );

              navigate("/order-success");
            } else {
              if (verify.refunded) clearCheckoutRequestId();
              alert(verify.message || "Payment Verification Failed");
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
        void closeOnlineCheckout(order).then((closed) => {
          if (closed) clearCheckoutRequestId();
        });
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
      const res = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: checkoutHeaders(getCheckoutRequestId()),
        body: JSON.stringify({
          items: cart,
          paymentMethod: "COD",
          customerLocation: { lat: location.lat, lng: location.lng },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to place COD order");
      }

      clearCart();
      clearCheckoutRequestId();
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
    if (!customerLocation) {
      setErrorMessage("Choose and confirm your delivery location before placing the order.");
      return;
    }

    try {
      setLoading(true);
      const location = {
        lat: Number(customerLocation.lat),
        lng: Number(customerLocation.lng),
      };
      if (
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng) ||
        (location.lat === 0 && location.lng === 0)
      ) {
        throw new Error("Please choose and confirm a valid delivery location.");
      }

      if (method === "ONLINE") {
        await payWithRazorpay(location);
      } else {
        await placeCODOrder(location);
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      setErrorMessage(error.message || "Unable to acquire your delivery location. Please enable location permissions.");
      setLoading(false);
    }
  };

  return (
    <div className="vm-checkout-page min-h-screen bg-[#F7F8F5] flex items-center justify-center p-4 sm:p-6 text-[#1F2937]">
      <div className="w-full max-w-lg bg-white text-gray-900 rounded-3xl shadow-lg overflow-hidden border border-[#E5E7EB]">

        {/* Header */}
        <div className="vm-checkout-heading bg-gradient-to-r from-emerald-700 to-green-600 text-white p-6 relative">
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
              Review your order total and delivery destination before payment.
            </p>
          </div>
        </div>

        <div className="p-6">

          {/* Delivery location selection and explicit confirmation */}
          <div className="mb-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Delivery Destination
            </h2>
            {customerLocation ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="min-w-0">
                  <span className="block">Delivery location confirmed</span>
                  <span className="mt-1 block break-words font-normal">
                    {customerLocation.address || "Selected map location"} ·{" "}
                    {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                  </span>
                </span>
              </div>
            ) : selectedLocation ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
                <MapPin size={18} className="shrink-0 text-amber-700" />
                <span>
                  Location selected. Confirm it before placing your order.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-xs font-medium">
                <MapPin size={18} className="text-emerald-600 shrink-0" />
                <span>Search for your address or use GPS, then confirm the selected location.</span>
              </div>
            )}
            <LocationPicker
              onLocationSelect={(location) => {
                setSelectedLocation(location);
                setCustomerLocation(null);
                setErrorMessage("");
              }}
            />
            {selectedLocation && !customerLocation && (
              <button
                type="button"
                onClick={() => {
                  setCustomerLocation(selectedLocation);
                  setErrorMessage("");
                }}
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Confirm this delivery location
              </button>
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
                <span className="font-semibold text-gray-900">₹{pricing.subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>10% Discount (₹300+)</span>
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
            <span>Online payment is processed through Razorpay.</span>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handlePayment}
            disabled={loading || !customerLocation}
            className="vm-place-order w-full mt-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
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