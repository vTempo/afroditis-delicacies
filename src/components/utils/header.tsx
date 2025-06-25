import React from 'react';
import './header.css';
import logo from '../../img/logo_t.png';

const Header: React.FC = () => {
    return (
        <header className="container-fluid">
            <nav className="navbar">
                {/* Left side - Logo */}
                <div className="navbar-brand">
                    <img src={logo.src} alt="Afroditi's Logo" />
                </div>

                {/* Center - Title and Navigation */}
                <div id="nav-middle">
                    <h1>Afroditi's Delicacies</h1>
                    <div id="navbar">
                        <div className="navbar-collapse">
                            <div className="nav-item">
                                <a href="/" className="nav-link">Home</a>
                            </div>
                            <div className="nav-item">
                                <a href="/menu" className="nav-link">Menu</a>
                            </div>
                            <div className="nav-item">
                                <a href="/about" className="nav-link">About Us</a>
                            </div>
                            <div className="nav-item">
                                <a href="/contact" className="nav-link">Contact Us</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - User Account and Cart */}
                <div className="nav-account">
                    <a href="/login" className="nav-link">
                        <svg className="user-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </a>
                    <a href="/cart" className="nav-link">
                        <svg className="cart-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </a>
                </div>
            </nav>
        </header>
    );
};

export default Header;