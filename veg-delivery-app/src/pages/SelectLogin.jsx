import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SelectLogin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex justify-center items-center 
    bg-[#F7F8F5] text-[#1F2937]">

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#E5E7EB] p-10 rounded-2xl shadow-lg w-[320px] text-center"
      >
        <h2 className="text-2xl font-bold mb-6">
          🔐 Choose Login Type
        </h2>

        {/* CUSTOMER */}
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-lg mb-4 font-semibold transition"
        >
          👤 Customer Login
        </button>

        {/* ADMIN */}
        <button
          onClick={() => navigate("/admin-login")}
          className="w-full bg-purple-500 hover:bg-purple-600 py-3 rounded-lg mb-4 font-semibold transition"
        >
          🛡️ Admin Login
        </button>

        {/* DELIVERY */}
        <button
          onClick={() => navigate("/delivery-login")}
          className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded-lg font-semibold transition"
        >
          🚚 Delivery Boy Login
        </button>

      </motion.div>
    </div>
  );
};

export default SelectLogin;