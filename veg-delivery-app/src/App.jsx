import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// 🌍 Pages
const Home = lazy(() => import("./pages/Home"));
const Cart = lazy(() => import("./pages/Cart"));
const Vendor = lazy(() => import("./pages/Vendor"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Payment = lazy(() => import("./pages/Payment"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const About = lazy(() => import("./pages/About"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));

// ✅ ADDED IMPORT
const SelectLogin = lazy(() => import("./pages/SelectLogin"));
const MyOrders = lazy(() => import("./pages/MyOrders"));

// 🚚 DELIVERY
const DeliveryDashboard = lazy(() => import("./delivery/DeliveryDashboard.jsx"));
const DeliveryLogin = lazy(() => import("./delivery/DeliveryLogin.jsx"));
const DeliveryRegister = lazy(() => import("./delivery/DeliveryRegister.jsx"));

// 🔐 Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

// 🚚 Delivery Route
import DeliveryRoute from "./components/DeliveryRoute";

// 🧑‍💼 Admin
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
import AdminRoute from "./components/AdminRoute";

// =====================================
// 🍛 AI RECIPE PAGES
// =====================================

const RecipeDetails = lazy(() => import("./pages/RecipeDetails.jsx"));
const RecipesPage = lazy(() => import("./pages/RecipesPage"));

function App() {
  return (
    <BrowserRouter>
      {/* 🔝 Navbar */}
      <Navbar />

      <Suspense
        fallback={
          <div className="vm-route-loading" role="status">
            Loading your page...
          </div>
        }
      >
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
      </Suspense>
      <Footer />
    </BrowserRouter>
  );
}

export default App;