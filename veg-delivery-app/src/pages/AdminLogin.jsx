import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    login: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!form.login || !form.password) {
        alert("Please fill all fields");
        return;
      }

      setLoading(true);

      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: form.login,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      if (data.user?.role !== "admin") {
        alert("Access denied. Admin only.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("admin", "true");
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("✅ Admin Login Successful");

      navigate("/admin");

    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen
      bg-[#F7F8F5] text-[#1F2937]"
    >
      <div
        className="bg-white p-8 rounded-3xl
        shadow-lg w-80 border border-[#E5E7EB]"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-[#1F2937]">
          🛡️ Admin Login
        </h2>

        <input
          placeholder="Admin Email"
          value={form.login}
          className="bg-white text-[#1F2937] placeholder-gray-500
          border border-[#E5E7EB] p-3 w-full mb-4 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-green-400"
          onChange={(e) =>
            setForm({
              ...form,
              login: e.target.value,
            })
          }
        />

        <input
          placeholder="Admin Password"
          type="password"
          value={form.password}
          className="bg-white text-[#1F2937] placeholder-gray-500
          border border-[#E5E7EB] p-3 w-full mb-4 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-green-400"
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold
          bg-gradient-to-r from-green-400 to-emerald-600
          hover:scale-105 transition duration-300 shadow-lg
          disabled:opacity-50"
        >
          {loading ? "Logging In..." : "Login as Admin"}
        </button>

        <p className="text-xs text-gray-600 mt-4 text-center">
          Only authorized admins can access dashboard
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;