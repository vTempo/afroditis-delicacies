import React from 'react';
import './footer.css';

const Footer: React.FC = () => {
    return (
        <footer>
            <div className="foot-pl">
                <h2>Afroditi's Delicacies</h2>
                <div className="row">
                    <div className="col-md-4">
                        <h4>Contact Us</h4>
                        <p>Phone: (555) 123-4567</p>
                        <p>Email: info@afroditisdelicacies.com</p>
                        <p>Seattle, WA</p>
                    </div>
                    <div className="col-md-4">
                        <h4>Hours</h4>
                        <p>Monday - Friday: 9am - 6pm</p>
                        <p>Saturday: 10am - 4pm</p>
                        <p>Sunday: Closed</p>
                    </div>
                    <div className="col-md-4">
                        <h4>Follow Us</h4>
                        <div className="social-links">
                            <a href="#" className="social-link">
                                <i className="fab fa-facebook"></i> Facebook
                            </a>
                            <a href="#" className="social-link">
                                <i className="fab fa-instagram"></i> Instagram
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bottom-footer">
                <p>&copy; 2025 Afroditi's Delicacies. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;