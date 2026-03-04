import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import "./header.css";
import logo from "../../img/logo_t.png";
import HeaderAccount from "./headerAccount";
import CartPopup from "../cartPopup/CartPopup";
import { useCart } from "../../context/cartContext/cartContext";
import { useAuth } from "../../context/authContext/authContext";
import { useUserProfile } from "../../context/userContext/userProfile";
import { getNewOrderCount } from "../../services/orderService";

const Header: React.FC = () => {
  const { user } = useAuth();
  const profile = useUserProfile();
  const isAdmin = user && profile?.role === "admin";
  const { cartCount } = useCart();
  const navigate = useNavigate();

  // Account side menu
  const [isAccMenuOpen, setIsAccMenuOpen] = useState(false);

  // Cart popup (customers only)
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Admin: live count of new (unactioned) orders
  const [newOrderCount, setNewOrderCount] = useState(0);

  // Subscribe to new order count when admin is logged in
  useEffect(() => {
    if (!isAdmin) {
      setNewOrderCount(0);
      return;
    }

    const unsubscribe = getNewOrderCount((count: number) => {
      setNewOrderCount(count);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const openAccMenu = () => {
    setIsAccMenuOpen(true);
    document.body.classList.add("modal-open");
  };

  const closeAccMenu = () => {
    setIsAccMenuOpen(false);
    document.body.classList.remove("modal-open");
  };

  const openCart = () => {
    setIsCartOpen(true);
    document.body.classList.add("modal-open");
  };

  const closeCart = () => {
    setIsCartOpen(false);
    document.body.classList.remove("modal-open");
  };

  const handleOrdersClick = () => {
    navigate("/orders");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <>
      <header className="container-fluid">
        <nav className="navbar">
          {/* Left side - Logo */}
          <div className="navbar-brand">
            <img src={logo} alt="Afroditi's Logo" />
          </div>

          {/* Center - Title and Navigation */}
          <div id="nav-middle">
            <h1>Afroditi's Delicacies</h1>
            <div id="navbar">
              <div className="navbar-collapse">
                <div className="nav-item">
                  <a href="/" className="nav-link">
                    Home
                  </a>
                </div>
                <div className="nav-item">
                  <a href="/menu" className="nav-link">
                    Menu
                  </a>
                </div>
                <div className="nav-item">
                  <a href="/about" className="nav-link">
                    About Us
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - User Account and Cart / Orders */}
          <div className="nav-account">
            <button
              onClick={openAccMenu}
              className="nav-link"
              aria-label="Account"
            >
              <svg
                className="user-icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </button>

            {/* Admin: Orders icon with notification badge */}
            {isAdmin ? (
              <button
                onClick={handleOrdersClick}
                className="nav-link orders-button"
                aria-label="Orders"
              >
                <div className="orders-icon-wrapper">
                  {/* Bell / clipboard icon for orders */}
                  <svg
                    className="orders-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                  {newOrderCount > 0 && (
                    <span className="orders-badge">{newOrderCount}</span>
                  )}
                </div>
              </button>
            ) : (
              /* Customer: Cart icon */
              <button
                onClick={openCart}
                className="nav-link cart-button"
                aria-label="Shopping Cart"
              >
                <div className="cart-icon-wrapper">
                  <svg
                    className="cart-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </div>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Auth Modal */}
      <HeaderAccount isOpen={isAccMenuOpen} onClose={closeAccMenu} />

      {/* Cart Popup — only rendered for non-admin */}
      {!isAdmin && <CartPopup isOpen={isCartOpen} onClose={closeCart} />}
    </>
  );
};

export default Header;
