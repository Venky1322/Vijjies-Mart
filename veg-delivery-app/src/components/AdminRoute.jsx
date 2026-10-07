import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // ❌ Not logged in
    if (!token || !user) {
      return <Navigate to="/admin-login" replace />;
    }

    // ❌ Not admin
    if (user.role !== "admin") {
      return <Navigate to="/" replace />;
    }

    // ✅ Allow access
    return children;

  } catch (err) {
    console.error("AdminRoute error:", err);
    return <Navigate to="/admin-login" replace />;
  }
};

export default AdminRoute;