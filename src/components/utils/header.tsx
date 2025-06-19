import React from 'react';
import './header.css';

const Header: React.FC = () => {
    return (
        <header className="container-fluid">
            <nav className="navbar">
                <div className="nav-account">
                    <div className="nav-item">
                        <a href="/login" className="nav-link">Login</a>
                    </div>
                    <div className="nav-item">
                        <a href="/register" className="nav-link">Register</a>
                    </div>
                </div>

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
                                <a href="/about" className="nav-link">About</a>
                            </div>
                            <div className="nav-item">
                                <a href="/contact" className="nav-link">Contact</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-account">
                    <div className="nav-item">
                        <a href="/cart" className="nav-link">Cart</a>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;