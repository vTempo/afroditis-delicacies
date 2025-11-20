import type { Route } from "./+types/home";
import React, { useState, useEffect } from "react";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import "../styles/home.css"

// Import images from app/img folder
import pastitsioImage from "../img/pastitsio.jpg";
import tyropitaImage from "../img/tyropita.jpg";
import tritipImage from "../img/tritip.jpg";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  // Shuffle array function to randomize image order
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Food images for carousel - using imported images
  const baseFoodImages = [
    { url: pastitsioImage, alt: "Delicious Pastitsio", title: "Pastitsio" },
    { url: tyropitaImage, alt: "Cheese Pie", title: "Tyropita" },
    { url: tritipImage, alt: "Tri-Tip", title: "Tri-Tip" },
    // Add more images here as you get them
    { url: pastitsioImage, alt: "Traditional Greek Moussaka", title: "Moussaka" },
    { url: tyropitaImage, alt: "Fresh Spanakopita", title: "Spanakopita" },
    { url: tritipImage, alt: "Sweet Baklava", title: "Baklava" },
  ];

  // Randomize images on component mount
  const [foodImages] = useState(() => shuffleArray(baseFoodImages));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const reviews = [
    {
      stars: 5,
      title: "Amazing spanakopita",
      text: "Spanakopita is amazingly delicious, and you get the real taste of Greece, with traditional handmade fyllo!! Afroditi's Delicacies also delivered it warm at my place. I would highly recommend her menu for any occasion with your beloved ones... because you just have to share this kind of food with the ones you love!",
      author: "Eleni"
    },
    {
      stars: 5,
      title: "Loved it!",
      text: "Amazing Baklava. The best I have ever had.",
      author: "Harsh"
    },
    {
      stars: 5,
      title: "Great value – Personalised menus",
      text: "Amazing food!!! Well presented.. people loved it!",
      author: "Priti"
    }
  ];

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % foodImages.length);
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, foodImages.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % foodImages.length);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + foodImages.length) % foodImages.length);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Header />

      <main className="w-full flex-grow">
        {/* Hero Section with Carousel and Green Box */}
        <section className="hero-section">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* Carousel Section - Left Side */}
              <div className="relative w-full">
                <div className="carousel-container">
                  {/* Image Container */}
                  <div
                    className="carousel-track"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {foodImages.map((image, index) => (
                      <div key={index} className="carousel-slide">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="carousel-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="placeholder-image"><div class="placeholder-text"><p class="placeholder-title">${image.title}</p><p class="placeholder-subtitle">Image coming soon</p></div></div>`;
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={prevSlide}
                    className="carousel-arrow carousel-arrow-left"
                    aria-label="Previous slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextSlide}
                    className="carousel-arrow carousel-arrow-right"
                    aria-label="Next slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Dots Indicator */}
                  <div className="carousel-dots">
                    {foodImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`carousel-dot ${currentSlide === index ? 'carousel-dot-active' : ''}`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Green Info Box - Right Side */}
              <div className="hero-info-box">
                <h1 className="hero-title">
                  Greek Homemade Food
                </h1>
                <p className="hero-subtitle">
                  Catering and personal chef services in Seattle! Try our mousaka, pastitsio, pies, desserts and more.
                </p>
                <div className="hero-buttons">
                  <button className="btn-primary">
                    See what's cooking!
                  </button>
                  <button className="btn-secondary">
                    Make an order!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="reviews-section">
          <div className="container mx-auto px-4">
            <h2 className="section-title">
              What Our Customers Say
            </h2>
            <div className="reviews-grid">
              {reviews.map((review, index) => (
                <div key={index} className="review-card">
                  {/* Stars */}
                  <div className="review-stars">
                    {[...Array(review.stars)].map((_, i) => (
                      <svg key={i} className="star-icon" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="review-title">
                    "{review.title}"
                  </h3>

                  {/* Review Text */}
                  <p className="review-text">
                    {review.text}
                  </p>

                  {/* Author */}
                  <p className="review-author">
                    {review.author}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section className="video-section">
          <div className="container mx-auto px-4">
            <div className="video-container-wrapper">
              <h2 className="section-title">
                As Featured on SKAI TV
              </h2>
              <p className="video-description">
                Watch our exclusive interview about bringing authentic Greek cuisine to Seattle
              </p>

              {/* Video Embed Container */}
              <div className="video-embed-container">
                <div className="video-aspect-ratio">
                  {/* Replace YOUR_VIDEO_ID with your actual YouTube video ID */}
                  <iframe
                    className="video-iframe"
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                    title="SKAI TV Interview - Afroditi's Delicacies"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
              </div>

              {/* Video Description */}
              <p className="video-caption">
                Discover the story behind Afroditi's Delicacies and our passion for authentic Greek flavors
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="cta-section">
          <div className="container mx-auto px-4 text-center">
            <h2 className="cta-title">
              Ready to Experience Authentic Greek Cuisine?
            </h2>
            <p className="cta-text">
              From intimate family dinners to large catering events, we bring the taste of Greece to your table
            </p>
            <button className="cta-button">
              Browse Our Menu
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
