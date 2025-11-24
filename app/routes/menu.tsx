import { useState } from 'react';
import Header from '../components/utils/header';
import Footer from '../components/utils/footer';
import { useUserProfile } from '../context/userContext/userProfile';
import { useAuth } from '../context/authContext/authContext';
import '../styles/menu.css';

export default function Menu() {
  const { user } = useAuth();
  const profile = useUserProfile();
  console.log(user);
  console.log(profile);

  const editMenu = () => {
    console.log("editing menu here");
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Header />

      <main className="menu-container">
        <div className="menu-header">
          <h1>Our Menu</h1>
          <p>Authentic Greek cuisine made with traditional recipes and the finest ingredients</p>
          {user && profile.role === "admin" && (
            <button
              onClick={editMenu}
              className="filter-btn"
            >
              Edit Menu
            </button>
          )}
        </div>

        <div className="menu-filters">

        </div>

        <div className="menu-content">

        </div>
      </main>

      <Footer />
    </div>
  );
};