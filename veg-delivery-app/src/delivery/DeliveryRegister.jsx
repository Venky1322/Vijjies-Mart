import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DeliveryRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = async () => {
    try {
      // 🔐 Validation
      if (
        !form.email ||
        !form.mobile ||
        !form.password ||
        !form.confirmPassword
      ) {
        return alert("All fields are required");
      }

      if (form.password !== form.confirmPassword) {
        return alert("Passwords do not match");
      }

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          role: "delivery",
        }),
      });

      const data = await res.json();

      console.log("Register response:", data);

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("✅ Delivery Partner Registered Successfully");

      navigate("/delivery-login");

    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#F7F8F5]">
      <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-lg w-80">
        <h2 className="text-xl font-bold text-center mb-4">
          🚚 Delivery Register
        </h2>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />
        <input
          type="tel"
          placeholder="Mobile Number"
          className="border p-2 w-full mb-3 rounded"
          value={form.mobile}
          onChange={(e) =>
            setForm({
              ...form,
              mobile: e.target.value,
            })
          }
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {/* Confirm Password */}
        <input
          type="password"
          placeholder="Confirm Password"
          className="border p-2 w-full mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
        />

        {/* Register Button */}
        <button
          onClick={handleRegister}
          className="bg-blue-600 text-white w-full py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Register
        </button>

        {/* Login Link */}
        <p className="text-center text-sm mt-3">
          Already registered?{" "}
          <Link to="/delivery-login" className="text-blue-600 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DeliveryRegister;