import {
  ArrowRight,
  ChevronDown,
  CircleUserRound,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  ShoppingBasket,
  X,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const promoRef = useRef(null);
  const { totalItems } = useContext(CartContext);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const promo = promoRef.current;
    if (!promo) {
      document.documentElement.style.removeProperty("--vm-shop-banner-height");
      return undefined;
    }

    const updatePromoHeight = () => {
      document.documentElement.style.setProperty(
        "--vm-shop-banner-height",
        `${promo.getBoundingClientRect().height}px`
      );
    };

    updatePromoHeight();
    const observer = new ResizeObserver(updatePromoHeight);
    observer.observe(promo);
    if (promo.firstElementChild) observer.observe(promo.firstElementChild);
    window.addEventListener("resize", updatePromoHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePromoHeight);
      document.documentElement.style.removeProperty("--vm-shop-banner-height");
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
    setSearchQuery(
      new URLSearchParams(location.search).get("search") || ""
    );

    try {
      const savedUser = localStorage.getItem("user");
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      setUser(parsedUser);
      setIsAdmin(
        Boolean(localStorage.getItem("admin")) || parsedUser?.role === "admin"
      );
    } catch (error) {
      console.error("Unable to read signed-in user:", error);
      setUser(null);
      setIsAdmin(false);
    }
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");
    setUser(null);
    setIsAdmin(false);
    setShowProfile(false);
    navigate("/");
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(
      query
        ? `/?search=${encodeURIComponent(query)}#products-section`
        : "/#products-section"
    );
  };

  const customerName = user?.name || user?.email?.split("@")[0] || "Your account";
  const deliveryAddress = user?.address || "Choose at checkout";

  return (
    <>
      <header className="vm-header">
        <div className="vm-header-main">
          <Link className="vm-brand" to="/" aria-label="Vijjies-Mart home">
            <span className="vm-brand-mark"><Leaf size={22} strokeWidth={2.2} /></span>
            <span className="vm-brand-wordmark">
              <strong>VIJJIES<span>-</span>MART</strong>
              <small>Fresh from the market</small>
            </span>
          </Link>

          <div className="vm-delivery-note" aria-label={`Delivery address: ${deliveryAddress}`}>
            <MapPin size={18} />
            <span>
              <small>DELIVERING TO</small>
              <strong>{deliveryAddress}</strong>
            </span>
            <ChevronDown size={15} />
          </div>

          <form className="vm-search" role="search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="site-search">Search groceries</label>
            <Search size={19} aria-hidden="true" />
            <input
              id="site-search"
              type="search"
              placeholder="Search vegetables, fruits and more"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="vm-search-clear"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="vm-search-submit">Search</button>
          </form>

          <div className="vm-header-actions">
            {user && !isAdmin ? (
              <button
                type="button"
                className="vm-header-link vm-account-trigger"
                onClick={() => setShowProfile(true)}
                aria-label={`Open account for ${customerName}`}
              >
                <CircleUserRound size={20} />
                <span><small>Hello,</small><strong>{customerName}</strong></span>
              </button>
            ) : isAdmin ? (
              <Link className="vm-header-link" to="/admin">
                <ShieldCheck size={20} />
                <span><small>Manage</small><strong>Dashboard</strong></span>
              </Link>
            ) : (
              <Link className="vm-header-link" to="/select-login">
                <CircleUserRound size={20} />
                <span><small>Welcome</small><strong>Sign in</strong></span>
              </Link>
            )}

            {isAdmin && (
              <button type="button" className="vm-header-link vm-signout-link" onClick={handleLogout}>
                <LogOut size={18} />
                <span><small>Admin</small><strong>Sign out</strong></span>
              </button>
            )}

            {user && !isAdmin && (
              <Link className="vm-header-link vm-orders-link" to="/my-orders">
                <Package size={20} />
                <span><small>Track & view</small><strong>Your orders</strong></span>
              </Link>
            )}

            <Link className="vm-cart-link" to="/cart" aria-label={`Cart, ${totalItems} items`}>
              <span className="vm-cart-icon">
                <ShoppingBasket size={23} />
                {totalItems > 0 && <span className="vm-cart-count">{totalItems}</span>}
              </span>
              <strong>Cart</strong>
              <ArrowRight className="vm-cart-arrow" size={15} />
            </Link>
          </div>

          <button
            type="button"
            className="vm-mobile-menu"
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            <span>{isMenuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>

        <nav
          id="primary-navigation"
          className={`vm-category-nav${isMenuOpen ? " vm-category-nav-open" : ""}`}
          aria-label="Main navigation"
        >
          <Link className="vm-category-home" to="/">Home</Link>
          <Link to="/#products-section">Shop all</Link>
          <Link to="/#category-section">Categories</Link>
          <Link to="/recipes">Recipes</Link>
          <Link to="/about">About us</Link>
          <Link to="/contact">Help & contact</Link>
          {user && !isAdmin && (
            <button type="button" className="vm-mobile-logout" onClick={handleLogout}>
              <LogOut size={16} /> Sign out
            </button>
          )}
        </nav>

        {location.pathname === "/" && (
          <div ref={promoRef} className="vm-shop-banner">
            <div className="vm-order-promo bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="vm-promo-mark"><ShoppingCart size={21} /></div>
                <div>
                  <h3 className="font-bold text-lg">A little more in your basket, a little more value</h3>
                  <p className="text-sm text-gray-500">Enjoy 10% off orders of ₹300 or more. Minimum order ₹100.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="#products-section"
                  className="vm-button-primary px-6 py-3 text-sm font-bold rounded-xl"
                >
                  Shop fresh
                </a>
                <a
                  href="#ai-recipe"
                  className="vm-button-secondary px-6 py-3 text-sm font-bold rounded-xl bg-[#F1F8F3] border border-[#E5E7EB]"
                >
                  Find a recipe
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {showProfile && user && (
        <div
          className="vm-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowProfile(false);
          }}
        >
          <section
            className="vm-profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <button
              type="button"
              className="vm-modal-close"
              onClick={() => setShowProfile(false)}
              aria-label="Close profile"
            >
              <X size={20} />
            </button>
            <span className="vm-profile-icon"><CircleUserRound size={30} /></span>
            <p className="vm-eyebrow">YOUR ACCOUNT</p>
            <h2 id="profile-title">{customerName}</h2>
            <dl>
              <div><dt>Email</dt><dd>{user.email || "Not available"}</dd></div>
              <div><dt>Mobile number</dt><dd>{user.mobile || "Not available"}</dd></div>
              <div><dt>Address</dt><dd>{user.address || "Add an address at checkout"}</dd></div>
            </dl>
            <div className="vm-profile-actions">
              <Link to="/my-orders" onClick={() => setShowProfile(false)}>View orders</Link>
              <button type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Navbar;
