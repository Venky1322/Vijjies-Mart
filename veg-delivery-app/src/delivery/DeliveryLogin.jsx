import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DeliveryLogin = () => {
const navigate = useNavigate();

const [form, setForm] = useState({
login: "",
password: "",
});

const handleLogin = async () => {
try {
if (!form.login || !form.password) {
alert("Email/Mobile and password are required");
return;
}


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

  console.log("Login response:", data);

  if (!res.ok) {
    alert(data.message || "Login failed");
    return;
  }

  if (data.user.role !== "delivery") {
    alert("Not a delivery partner ❌");
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem(
    "user",
    JSON.stringify(data.user)
  );

  alert("✅ Delivery Partner Login Successful");

  navigate("/delivery-dashboard");

} catch (err) {
  console.error("Login error:", err);
  alert("Server error");
}


};

return ( <div className="flex justify-center items-center min-h-screen bg-[#F7F8F5]"> <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-lg w-80">


    <h2 className="text-xl font-bold text-center mb-4">
      🚚 Delivery Login
    </h2>

    {/* EMAIL OR MOBILE */}
    <input
      placeholder="Email or Mobile Number"
      className="border p-2 w-full mb-2 rounded"
      value={form.login}
      onChange={(e) =>
        setForm({
          ...form,
          login: e.target.value,
        })
      }
    />

    {/* PASSWORD */}
    <input
      type="password"
      placeholder="Password"
      className="border p-2 w-full mb-3 rounded"
      value={form.password}
      onChange={(e) =>
        setForm({
          ...form,
          password: e.target.value,
        })
      }
    />

    {/* LOGIN */}
    <button
      onClick={handleLogin}
      className="bg-blue-600 text-white w-full py-2 rounded-xl hover:bg-blue-700 transition"
    >
      Login
    </button>

    <p className="text-center text-sm mt-3">
      New?{" "}
      <Link
        to="/delivery-register"
        className="text-blue-600 font-semibold"
      >
        Register
      </Link>
    </p>

  </div>
</div>


);
};

export default DeliveryLogin;
