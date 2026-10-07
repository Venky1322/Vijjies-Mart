import {
  ShoppingCart,
  Leaf,
  Home,
  User,
  ShieldCheck,
  Image,
  Info,
  Phone,
  X,
  Package,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useContext(CartContext);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const adminFlag = localStorage.getItem("admin");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;

    if (parsedUser) {
      setUser(parsedUser);
      setIsAdmin(Boolean(adminFlag) || parsedUser.role === "admin");
    } else {
      setUser(null);
      setIsAdmin(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setIsAdmin(false);
    navigate("/");
  };

  return (
    <>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-[#E5E7EB] shadow-sm px-6 py-4 flex justify-between items-center text-[#1F2937]"
      >
        {/* 🌿 LOGO */}
        <Link to="/">
          <div className="flex items-center gap-2 text-xl font-bold cursor-pointer">
            <Leaf size={26} />
            Veggies-mart
          </div>
        </Link>

        <div className="flex items-center gap-6">
          {/* 👤 USER NAVIGATION */}
          {user && !isAdmin && (
            <>
              <Link to="/">
                <div className="flex items-center gap-1 hover:text-green-700 transition">
                  <Home size={18} /> Home
                </div>
              </Link>

              <Link to="/my-orders">
                <div className="flex items-center gap-1 hover:text-green-700 transition">
                  <Package size={18} /> Orders
                </div>
              </Link>

              <Link to="/gallery">
                <div className="flex items-center gap-1 hover:text-green-700 transition">
                  <Image size={18} /> Gallery
                </div>
              </Link>

              <Link to="/about">
                <div className="flex items-center gap-1 hover:text-green-700 transition">
                  <Info size={18} /> About
                </div>
              </Link>

              <Link to="/contact">
                <div className="flex items-center gap-1 hover:text-green-700 transition">
                  <Phone size={18} /> Contact
                </div>
              </Link>
            </>
          )}

          {/* 🛒 CART */}
          <Link to="/cart">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="relative flex items-center gap-2 bg-white text-green-700 px-4 py-2 rounded-xl shadow-md font-semibold"
            >
              <ShoppingCart size={20} />
              Cart

              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
                  {totalItems}
                </span>
              )}
            </motion.div>
          </Link>

          {/* 🔐 LOGIN OPTIONS */}
          {!user && !isAdmin && (
            <div className="flex items-center gap-2">
              <Link to="/select-login">
                <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition shadow">
                  👤 Customer
                </button>
              </Link>
            </div>
          )}

          {/* 🧑‍💼 ADMIN DASHBOARD */}
          {isAdmin && (
            <Link to="/admin">
              <button className="bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700 transition flex items-center gap-2">
                <ShieldCheck size={18} /> Dashboard
              </button>
            </Link>
          )}

          {/* 👤 USER INFO */}
          {user && (
            <div className="flex items-center gap-3">
              <div
                onClick={() => setShowProfile(true)}
                className="bg-[#F1F8F3] px-3 py-1 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-[#EAF6EC] transition"
              >
                <User size={18} />
                <span className="text-sm">{user.email}</span>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-500 px-3 py-1 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ================= PROFILE POPUP ================= */}
      {showProfile && user && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md relative"
          >
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
            >
              <X size={22} />
            </button>

            <div className="text-center mb-5">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <User size={40} className="text-green-700" />
              </div>

              <h2 className="text-2xl font-bold text-green-700 mt-3">
                User Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-semibold text-gray-700">Email</p>
                <p>{user.email || "Not Available"}</p>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-semibold text-gray-700">Mobile Number</p>
                <p>{user.mobile || "Not Available"}</p>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-semibold text-gray-700">Address</p>
                <p>{user.address || "Not Available"}</p>
              </div>
            </div>

            <button
              onClick={() => setShowProfile(false)}
              className="w-full mt-5 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default Navbar;