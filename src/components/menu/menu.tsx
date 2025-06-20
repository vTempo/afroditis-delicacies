// src/components/menu/menu.tsx
'use client';
import { useState } from 'react';
import Header from '../utils/header';
import Footer from '../utils/footer';
import { menuData, categories, menuNote, MenuItem } from '@/data/menu';
import './menu.css';

const MenuPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('Full Menu');

    const filteredItems = selectedCategory === 'Full Menu'
        ? menuData
        : menuData.filter(item => item.category === selectedCategory);

    const groupedItems = selectedCategory === 'Full Menu'
        ? categories.slice(1).reduce((acc, category) => {
            const items = menuData.filter(item => item.category === category);
            if (items.length > 0) {
                acc[category] = items;
            }
            return acc;
        }, {} as Record<string, MenuItem[]>)
        : { [selectedCategory]: filteredItems };

    return (
        <div className="min-h-screen bg-white">
            <Header />

            <main className="menu-container">
                <div className="menu-header">
                    <h1>Our Menu</h1>
                    <p>Authentic Greek cuisine made with traditional recipes and the finest ingredients</p>
                </div>

                <div className="menu-filters">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="menu-content">
                    {Object.entries(groupedItems).map(([categoryName, items]) => {
                        const categoryHasTwoSizes = categoryName === 'Traditional Greek Pies' || categoryName === 'Beef Dishes';

                        return (
                            <div key={categoryName} className="menu-category">
                                <div className="category-header">
                                    <h2 className="category-title">{categoryName}</h2>
                                    {categoryHasTwoSizes && (
                                        <div className="size-headers">
                                            <span className="size-header">Large / Small</span>
                                        </div>
                                    )}
                                </div>
                                <div className="menu-items">
                                    {items.map((item, index) => (
                                        <div key={`${item.name}-${index}`} className="menu-item">
                                            <div className="item-content">
                                                <h3 className="item-name">{item.name}</h3>
                                                {item.isTopSeller && <span className="top-seller-badge">(Top seller)</span>}
                                            </div>
                                            <div className="item-pricing">
                                                {categoryHasTwoSizes ? (
                                                    <span className="price">
                                                        ${item.price}.00 / {item.secondPrice ? `${item.secondPrice}.00` : '-'}
                                                    </span>
                                                ) : (
                                                    <span className="price single-price">${item.price}.00</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="menu-note">
                    <p>{menuNote}</p>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default MenuPage;