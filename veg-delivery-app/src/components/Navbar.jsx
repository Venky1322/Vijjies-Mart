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

    const query = searchQuery.trim().replace(/\s+/g, " ");
    const params = new URLSearchParams();
    if (query) params.set("search", query);

    // Always route to Home with the exact query. Home reads this URL parameter
    // and filters the products returned by the backend API.
    navigate({
      pathname: "/",
      search: params.toString() ? `?${params.toString()}` : "",
      hash: "#products-section",
    });

    // On an already-mounted Home page, explicitly scroll after navigation.
    if (location.pathname === "/") {
      window.requestAnimationFrame(() => {
        document.getElementById("products-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");

    // Clearing the Navbar search while on Home must also clear Home's URL-driven
    // filter. On other pages, just clear the input without unexpected navigation.
    if (location.pathname === "/" && new URLSearchParams(location.search).has("search")) {
      navigate(
        { pathname: "/", search: "", hash: "#products-section" },
        { replace: true }
      );
    }
  };

  const customerName = user?.name || user?.email?.split("@")[0] || "Your account";
  const deliveryAddress = user?.address || "Choose at checkout";

  return (
    <>
      <style>{`
        /* Compact, touch-friendly navbar layout on phones */
        @media (max-width: 640px) {
          .vm-header-main {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            padding: 9px 12px;
          }

          .vm-brand {
            min-width: 0;
            gap: 7px;
          }

          .vm-brand-mark {
            width: 34px;
            height: 34px;
            min-width: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .vm-brand-mark svg {
            width: 18px;
            height: 18px;
          }

          .vm-brand-wordmark strong {
            font-size: 14px;
            line-height: 1.1;
          }

          .vm-brand-wordmark small {
            font-size: 9px;
            line-height: 1.1;
          }

          .vm-delivery-note {
            display: none !important;
          }

          .vm-header-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 7px;
          }

          .vm-header-actions .vm-header-link {
            min-width: 34px;
            min-height: 34px;
            padding: 5px;
            justify-content: center;
          }

          .vm-header-actions .vm-header-link span,
          .vm-cart-arrow {
            display: none !important;
          }

          .vm-header-actions .vm-header-link svg {
            width: 18px;
            height: 18px;
          }

          .vm-cart-link {
            min-height: 34px;
            padding: 5px 8px;
            gap: 4px;
            font-size: 12px;
          }

          .vm-cart-icon svg {
            width: 19px;
            height: 19px;
          }

          .vm-cart-count {
            min-width: 15px;
            height: 15px;
            font-size: 9px;
            line-height: 15px;
          }

          .vm-mobile-menu {
            min-height: 34px;
            padding: 5px 8px;
            gap: 4px;
            font-size: 11px;
          }

          .vm-search {
            order: 5;
            flex: 1 1 100%;
            width: 100%;
            min-width: 0;
            min-height: 40px;
            gap: 7px;
            padding: 5px 7px 5px 10px;
            border-radius: 12px;
          }

          .vm-search > svg {
            width: 16px;
            height: 16px;
            flex: 0 0 auto;
          }

          .vm-search input {
            min-width: 0;
            width: 100%;
            font-size: 13px;
          }

          .vm-search-submit {
            padding: 7px 10px;
            min-height: 30px;
            font-size: 11px;
            white-space: nowrap;
          }

          .vm-search-clear {
            padding: 3px;
          }

          .vm-category-nav {
            padding: 6px 12px;
            gap: 7px;
          }

          .vm-category-nav a,
          .vm-mobile-logout {
            font-size: 12px;
          }

          .vm-shop-banner {
            padding: 8px 12px;
          }

          .vm-order-promo {
            padding: 10px !important;
            gap: 8px !important;
            border-radius: 12px !important;
          }

          .vm-promo-mark {
            width: 32px;
            height: 32px;
            min-width: 32px;
          }

          .vm-promo-mark svg {
            width: 17px;
            height: 17px;
          }

          .vm-order-promo h3 {
            font-size: 12px !important;
            line-height: 1.25;
          }

          .vm-order-promo p {
            font-size: 10px !important;
            line-height: 1.3;
          }

          .vm-order-promo .vm-button-primary {
            padding: 7px 11px !important;
            font-size: 11px !important;
            border-radius: 9px !important;
          }
        }

        @media (max-width: 380px) {
          .vm-brand-wordmark small {
            display: none;
          }

          .vm-header-main {
            gap: 6px;
            padding: 8px 9px;
          }

          .vm-search-submit {
            padding: 6px 8px;
          }
        }
      `}</style>
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
              name="search"
              type="search"
              autoComplete="off"
              placeholder="Search vegetables, fruits and more"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="vm-search-clear"
                aria-label="Clear search"
                onClick={handleClearSearch}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="vm-search-submit" aria-label="Submit product search">
              Search
            </button>
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

              <a
                href="#products-section"
                className="vm-button-primary px-6 py-3 text-sm font-bold rounded-xl"
              >
                Shop fresh
              </a>
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
