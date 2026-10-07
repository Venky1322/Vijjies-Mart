import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";

// 🌍 Pages
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Vendor from "./pages/Vendor";
import Delivery from "./pages/Delivery";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";

// ✅ ADDED IMPORT
import SelectLogin from "./pages/SelectLogin";
import MyOrders from "./pages/MyOrders";

// 🚚 DELIVERY
import DeliveryDashboard from "./delivery/DeliveryDashboard.jsx";
import DeliveryLogin from "./delivery/DeliveryLogin.jsx";
import DeliveryRegister from "./delivery/DeliveryRegister.jsx";

// 🔐 Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

// 🚚 Delivery Route
import DeliveryRoute from "./components/DeliveryRoute";

// 🧑‍💼 Admin
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";

// =====================================
// 🍛 AI RECIPE PAGES
// =====================================

import RecipeDetails from "./pages/RecipeDetails.jsx";
import RecipesPage from "./pages/RecipesPage";

function App() {
  return (
    <BrowserRouter>
      {/* 🔝 Navbar */}
      <Navbar />

      <Routes>
        {/* 🌍 PUBLIC ROUTES */}
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ✅ NEW ROUTE ADDED */}
        <Route
          path="/select-login"
          element={<SelectLogin />}
        />

        {/* ✅ EXISTING ROUTES */}
        <Route
          path="/about"
          element={<About />}
        />

        <Route
          path="/gallery"
          element={<Gallery />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        {/* 🚚 DELIVERY LOGIN */}
        <Route
          path="/delivery-login"
          element={<DeliveryLogin />}
        />

        <Route
          path="/delivery-register"
          element={<DeliveryRegister />}
        />

        {/* ===================================== */}
        {/* 🍛 AI RECIPE ROUTES */}
        {/* ===================================== */}

        <Route
          path="/recipes"
          element={<RecipesPage />}
        />

        <Route
          path="/recipe/:id"
          element={<RecipeDetails />}
        />

        {/* 🔒 USER PROTECTED ROUTES */}

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/delivery"
          element={
            <ProtectedRoute>
              <Delivery />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        {/* ✅ ORIGINAL ROUTE */}
        <Route
          path="/success"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />

        {/* ✅ OPTIONAL SAME PAGE */}
        <Route
          path="/order-success"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />

        {/* 🧑‍💼 ADMIN */}

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* 🚚 DELIVERY DASHBOARD */}

        <Route
          path="/delivery-dashboard"
          element={
            <DeliveryRoute>
              <DeliveryDashboard />
            </DeliveryRoute>
          }
        />

        {/* 🛠 OPTIONAL */}
        <Route
          path="/vendor"
          element={<Vendor />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;