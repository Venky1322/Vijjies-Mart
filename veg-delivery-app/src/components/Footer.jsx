import { ArrowUpRight, Leaf } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  const { pathname } = useLocation();
  const compactPages = [
    "/admin",
    "/admin-login",
    "/delivery-dashboard",
    "/delivery-login",
    "/delivery-register",
    "/login",
    "/register",
    "/select-login",
  ];

  if (compactPages.includes(pathname)) return null;

  return (
    <footer className="vm-footer">
      <div className="vm-footer-inner">
        <div className="vm-footer-brand">
          <Link className="vm-brand" to="/" aria-label="Vijjies-Mart home">
            <span className="vm-brand-mark"><Leaf size={21} /></span>
            <span className="vm-brand-wordmark">
              <strong>VIJJIES<span>-</span>MART</strong>
              <small>Fresh from the market</small>
            </span>
          </Link>
          <p>Everyday produce, a little easier to bring home.</p>
        </div>
        <div className="vm-footer-links">
          <div>
            <strong>Explore</strong>
            <Link to="/">Shop vegetables</Link>
            <Link to="/recipes">Recipes</Link>
            <Link to="/gallery">Gallery</Link>
          </div>
          <div>
            <strong>Vijjies-Mart</strong>
            <Link to="/about">About us</Link>
            <Link to="/contact">Contact & support</Link>
            <Link to="/my-orders">Your orders</Link>
          </div>
        </div>
        <a className="vm-footer-support" href="mailto:freshveg.support@gmail.com">
          Need a hand? <span>Contact support <ArrowUpRight size={15} /></span>
        </a>
      </div>
      <div className="vm-footer-bottom">
        <span>© {new Date().getFullYear()} Vijjies-Mart</span>
        <span>Made for your everyday kitchen</span>
      </div>
    </footer>
  );
};

export default Footer;
