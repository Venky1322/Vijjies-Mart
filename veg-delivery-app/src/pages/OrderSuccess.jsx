import { motion } from "framer-motion";
import { CheckCircle, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { useEffect, useState, useContext } from "react";
import { CartContext } from "../context/CartContext";

const OrderSuccess = () => {
  const navigate = useNavigate();

  const { cartItems = [], totalAmount = 0, clearCart } =
    useContext(CartContext);

  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    clearCart();

    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F8F5]">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
        />
      )}

      <motion.div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md">
        <CheckCircle size={70} className="text-green-600 mx-auto" />

        <h1 className="text-2xl font-bold mt-4">
          Order Placed Successfully 🎉
        </h1>

        <p className="text-gray-500 mt-2">
          Your vegetables are on the way 🚚
        </p>

        <button
          onClick={() => navigate("/delivery")}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl"
        >
          Track Order
        </button>

        <button
          onClick={() => navigate("/")}
          className="mt-3 w-full bg-green-600 text-white py-3 rounded-xl"
        >
          Home
        </button>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;