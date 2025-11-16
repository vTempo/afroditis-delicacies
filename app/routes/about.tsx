import React from "react";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import "../styles/about.css";

export default function About() {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            <Header />
            <main className="w-full flex-grow">
                <div className="about-container">
                    <div className="about-content">
                        {/* Left side - Text content */}
                        <div className="about-text">
                            <p>
                                Afroditi's Delicacies is a small Greek homemade catering business built around tradition, heart, and the flavors of the Mediterranean. Afroditi Kritikou, the founder and cook behind every dish, moved to the Seattle area in 2013 and started the business in 2018 after seeing a growing appreciation for authentic Greek food in Washington.
                            </p>

                            <p>
                                Afroditi's goal has always been simple. She wants to bring the familiar tastes of home to the Greek community in the Seattle area while also introducing others to the warmth of traditional Greek cooking. Every recipe she prepares is rooted in the techniques she learned growing up. Everything is made by hand, using organic ingredients and the same slow, thoughtful approach that defines a true Greek kitchen.
                            </p>

                            <p>
                                Over the years, her food has found its way into the routines and celebrations of people all across the region. Orders continue to grow each year, mostly through personal recommendations and the genuine connection customers feel to her cooking. Her presence on social media has helped her reach even more food lovers who appreciate honest, homemade meals.
                            </p>

                            <p>
                                A special moment for Afroditi and her customers came when she was invited for a live interview on the Greek TV channel SKAI. She spoke about her journey, her cooking, and the joy of helping people in Washington experience the comfort and nostalgia of real Greek flavors.
                            </p>

                            <p className="about-closing">
                                Afroditi's Delicacies is more than a catering service. It is a taste of tradition, a reminder of home, and a celebration of the dishes that bring people together.
                            </p>
                        </div>

                        {/* Right side - Image */}
                        <div className="about-image">
                            <img
                                src="/img/afroditi.png"
                                alt="Afroditi Kritikou"
                            />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}