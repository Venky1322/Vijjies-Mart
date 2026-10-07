import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // ❌ Not logged in → redirect
  if (!token) {
    return <Navigate to="/login" />;
  }

  // ✅ Logged in → allow access
  return children;
};

export default ProtectedRoute;