import { useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    login: "",
    password: "",
  });

  const [loading, setLoading] =
    useState(false);

  // ✅ EMAIL / MOBILE LOGIN
  const handleLogin = async () => {
    try {
      setLoading(true);

      console.log(
        "🔐 Sending login request:",
        form
      );

      const res = await fetch(
        `${API}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            login: form.login,
            password: form.password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            "Login failed"
        );

        setLoading(false);
        return;
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      if (data.user.role === "admin") {
        localStorage.setItem("admin", "true");
      } else {
        localStorage.removeItem("admin");
      }

      alert("✅ Login successful");

      if (
        data.user.role === "admin"
      ) {
        navigate("/admin");
      } else {
        navigate("/");
      }

      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error(
        "❌ Login error:",
        err
      );

      alert(
        "Server error - check backend"
      );
    }

    setLoading(false);
  };

  return (
    <div
      className="
      flex
      justify-center
      items-center
      min-h-screen
      bg-[#F7F8F5]
      text-[#1F2937]
    "
    >
      <div
        className="
        bg-white
        p-8
        rounded-3xl
        shadow-2xl
        w-80
        border
        border-[#E5E7EB]
      "
      >
        <h2
          className="
          text-2xl
          font-bold
          mb-6
          text-center
          text-[#1F2937]
        "
        >
          🔐 Login
        </h2>

        {/* ✅ EMAIL OR MOBILE */}
        <input
          placeholder="Email or Mobile Number"
          value={form.login}
          className="
          bg-white
          text-[#1F2937]
          placeholder-gray-500
          border
          border-[#E5E7EB]
          p-3
          w-full
          mb-4
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-green-400
        "
          onChange={(e) =>
            setForm({
              ...form,
              login: e.target.value,
            })
          }
        />

        {/* ✅ PASSWORD */}
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          className="
          bg-white
          text-[#1F2937]
          placeholder-gray-500
          border
          border-[#E5E7EB]
          p-3
          w-full
          mb-4
          rounded-xl
          focus:outline-none
          focus:ring-2
          focus:ring-green-400
        "
          onChange={(e) =>
            setForm({
              ...form,
              password:
                e.target.value,
            })
          }
        />

        {/* ✅ LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="
          w-full
          py-3
          rounded-xl
          font-semibold
          bg-gradient-to-r
          from-green-400
          to-emerald-600
          hover:scale-105
          transition
          duration-300
          shadow-lg
        "
        >
          {loading
            ? "Processing..."
            : "Login"}
        </button>

        {/* ✅ REGISTER */}
        <p
          className="
          text-sm
          mt-5
          text-center
          text-gray-600
        "
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            className="
            text-green-700
            font-semibold
            hover:underline
          "
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;