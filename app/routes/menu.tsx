import { useState, useEffect } from 'react';
import Header from '../components/utils/header';
import Footer from '../components/utils/footer';
import { useUserProfile } from '../context/userContext/userProfile';
import { useAuth } from '../context/authContext/authContext';
import { getMenuData } from '../services/menuService';
import { useEditMenu } from '../components/editMenu/editMenu';
import type { MenuItem, MenuCategory } from '../types/types';
import '../styles/menu.css';

export default function Menu() {
  const { user } = useAuth();
  const profile = useUserProfile();
  const isAdmin = user && profile?.role === "admin";

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuNote, setMenuNote] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('Full Menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    categoryBeingEdited,
    categoryBeingDeleted,
    categoryForNewDish,
    editCategory,
    deleteCategory,
    addDish,
    closeAll
  } = useEditMenu();


  // Fetch menu data from Firebase on component mount
  useEffect(() => {
    async function fetchMenuData() {
      try {
        setLoading(true);
        const data = await getMenuData();
        setCategories(data.categories);
        setMenuItems(data.items);
        setMenuNote(data.menuNote);
        setError(null);
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Failed to load menu. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchMenuData();
  }, []);

  const editMenu = () => {
    console.log("editing menu here");
  };

  // Create categories array with "Full Menu" as first option
  const allCategories = ['Full Menu', ...categories.map(cat => cat.name)];

  // Filter items based on selected category
  const filteredItems = selectedCategory === 'Full Menu'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  // Group items by category
  const groupedItems = selectedCategory === 'Full Menu'
    ? categories.reduce((acc, category) => {
      const items = menuItems.filter(item => item.category === category.name);
      if (items.length > 0) {
        acc[category.name] = {
          items,
          hasTwoSizes: category.hasTwoSizes
        };
      }
      return acc;
    }, {} as Record<string, { items: MenuItem[], hasTwoSizes: boolean }>)
    : {
      [selectedCategory]: {
        items: filteredItems,
        hasTwoSizes: categories.find(cat => cat.name === selectedCategory)?.hasTwoSizes || false
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        <Header />
        <main className="menu-container">
          <div className="menu-header">
            <h1>Loading Menu...</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        <Header />
        <main className="menu-container">
          <div className="menu-header">
            <h1>Our Menu</h1>
            <p className="error-message">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Header />

      <main className="menu-container">
        <div className="menu-header">
          <h1>Our Menu</h1>
          <p>Authentic Greek cuisine made with traditional recipes and the finest ingredients</p>
          {isAdmin && (
            <button
              onClick={editMenu}
              className="filter-btn"
            >
              Edit Menu
            </button>
          )}
        </div>

        <div className="menu-filters">
          {allCategories.map(category => (
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
          {Object.entries(groupedItems).map(([categoryName, { items, hasTwoSizes }]) => (
            <div key={categoryName} className="menu-category">
              <div className="category-header">
                <h2 className="category-title">{categoryName}</h2>
                {isAdmin && (
                  <div className="category-admin-controls">
                    <button onClick={() => editCategory(categoryName)}>✏</button>
                    <button onClick={() => deleteCategory(categoryName)}>🗑</button>
                    <button onClick={() => addDish(categoryName)}>➕</button>
                  </div>
                )}
                {hasTwoSizes && (
                  <div className="size-headers">
                    <span className="size-header">Large / Small</span>
                  </div>
                )}
              </div>
              <div className="menu-items">
                {items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="item-content">
                      <h3 className="item-name">{item.name}</h3>
                      {item.isTopSeller && <span className="top-seller-badge">(Top seller)</span>}
                    </div>
                    <div className="item-pricing">
                      {hasTwoSizes ? (
                        <span className="price">
                          ${item.price}.00 / {item.secondPrice ? `$${item.secondPrice}.00` : '-'}
                        </span>
                      ) : (
                        <span className="price single-price">${item.price}.00</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {menuNote && (
          <div className="menu-note">
            <p>{menuNote}</p>
          </div>
        )}

        {categoryBeingEdited && (
          <div className="edit-menu-popup">
            <h2>Edit Category</h2>
            <p>Currently editing: <strong>{categoryBeingEdited}</strong></p>

            <label>New name:</label>
            <input type="text" placeholder="Enter new category name" />

            <button onClick={() => console.log("Save category changes")}>
              Save
            </button>

            <button className="edit-menu-close" onClick={closeAll}>
              Close
            </button>
          </div>
        )}


        {categoryBeingDeleted && (
          <div className="edit-menu-popup">
            <h2>Delete Category</h2>
            <p>Are you sure you want to delete <strong>{categoryBeingDeleted}</strong>?</p>

            <button onClick={() => console.log("Delete fired")}>
              Yes, delete
            </button>

            <button className="edit-menu-close" onClick={closeAll}>
              Cancel
            </button>
          </div>
        )}


        {categoryForNewDish && (
          <div className="edit-menu-popup">
            <h2>Add Dish</h2>
            <p>Category: <strong>{categoryForNewDish}</strong></p>

            <label>Dish name:</label>
            <input type="text" placeholder="Dish name" />

            <label>Price:</label>
            <input type="number" placeholder="10" />

            <button onClick={() => console.log("Add dish fired")}>
              Add Dish
            </button>

            <button className="edit-menu-close" onClick={closeAll}>
              Close
            </button>
          </div>
        )}


      </main>

      <Footer />
    </div>
  );
}