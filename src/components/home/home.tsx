import React from 'react';
import Header from '../utils/header';
import Footer from '../utils/footer';
import './home.css';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main className="w-full">
        {/* Hero Section with Carousel */}
        <div className="hero-section">
          <div className="hero-overlay"></div>
          <div className="carousel-inner">
            <div className="slide-container">
              <div className="slide-item" style={{
                backgroundImage: "url('/img/food/temp1.png')"
              }}>
              </div>
              {/* Add more slides as needed */}
            </div>
          </div>
          <div className="hero-content">
            <h1 style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              fontFamily: 'Cormorant Garamond, serif'
            }}>
              Authentic Greek Cuisine
            </h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
              Homemade with love, delivered with care
            </p>
            <a href="/menu" className="cta-button">View Our Menu</a>
          </div>
        </div>

        {/* Featured Items Section */}
        <section className="featured-section">
          <h2 style={{
            fontSize: '2.5rem',
            fontFamily: 'Cormorant Garamond, serif',
            color: 'var(--primary-green)',
            marginBottom: '1rem'
          }}>
            Featured Specialties
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
            Discover our most beloved traditional Greek dishes
          </p>

          <div className="featured-items">
            <div className="featured-item">
              <img src="/img/food/moussaka.jpg" alt="Moussaka" />
              <div className="featured-item-content">
                <h3>Traditional Moussaka</h3>
                <p>Layers of eggplant, ground meat, and béchamel sauce baked to perfection</p>
              </div>
            </div>

            <div className="featured-item">
              <img src="/img/food/pastitsio.jpg" alt="Pastitsio" />
              <div className="featured-item-content">
                <h3>Homemade Pastitsio</h3>
                <p>Greek pasta bake with rich meat sauce and creamy topping</p>
              </div>
            </div>

            <div className="featured-item">
              <img src="/img/food/spanakopita.jpg" alt="Spanakopita" />
              <div className="featured-item-content">
                <h3>Fresh Spanakopita</h3>
                <p>Crispy phyllo pastry filled with spinach and feta cheese</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="cta-section">
          <h2>Ready to Order?</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            Experience authentic Greek flavors made with traditional recipes and the finest ingredients
          </p>
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
            ✨ Free delivery available ✨
          </p>
          <a href="/contact" className="cta-button">Place Your Order</a>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;