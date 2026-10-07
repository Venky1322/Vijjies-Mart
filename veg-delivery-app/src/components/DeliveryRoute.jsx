import { Navigate } from "react-router-dom";

const DeliveryRoute = ({ children }) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.role !== "delivery") {
      return <Navigate to="/delivery-login" replace />;
    }

    return children;
  } catch (err) {
    return <Navigate to="/delivery-login" replace />;
  }
};

export default DeliveryRoute;