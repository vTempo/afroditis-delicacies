// app/routes/menu.tsx
import { useState, useEffect } from 'react';
import Header from '../components/utils/header';
import Footer from '../components/utils/footer';
import { useUserProfile } from '../context/userContext/userProfile';
import { useAuth } from '../context/authContext/authContext';
import {
     getMenuData,
     updateCategoryName,
     deleteCategory as deleteCategoryService,
     addDish as addDishService,
     addCategory as addCategoryService,
     updateDish as updateDishService,
     deleteDish as deleteDishService
   } from '../services/menuService';
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
    showAddCategory,
    dishBeingEdited,
    dishBeingDeleted,
    newCategoryName,
    setNewCategoryName,
    dishName,
    setDishName,
    dishPrice,
    setDishPrice,
    dishSecondPrice,
    setDishSecondPrice,
    dishAvailable,
    setDishAvailable,
    dishImage,
    setDishImage,
    dishImagePreview,
    setDishImagePreview,
    newCategoryNameInput,
    setNewCategoryNameInput,
    newCategoryHasTwoSizes,
    setNewCategoryHasTwoSizes,
    isSubmitting,
    setIsSubmitting,
    editCategory,
    deleteCategory,
    addDish,
    editDish,
    deleteDishConfirm,
    openAddCategory,
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

  // Handle category name update
  const handleSaveCategoryName = async () => {
    if (!categoryBeingEdited || !newCategoryName.trim()) {
      alert('Please enter a valid category name');
      return;
    }

    if (newCategoryName.trim() === categoryBeingEdited) {
      closeAll();
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCategoryName(categoryBeingEdited, newCategoryName.trim());

      const data = await getMenuData();
      setCategories(data.categories);
      setMenuItems(data.items);

      if (selectedCategory === categoryBeingEdited) {
        setSelectedCategory(newCategoryName.trim());
      }

      alert('Category updated successfully!');
      closeAll();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!categoryBeingDeleted) return;

    try {
      setIsSubmitting(true);
      await deleteCategoryService(categoryBeingDeleted);

      const data = await getMenuData();
      setCategories(data.categories);
      setMenuItems(data.items);

      if (selectedCategory === categoryBeingDeleted) {
        setSelectedCategory('Full Menu');
      }

      alert('Category and associated dishes deleted successfully!');
      closeAll();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add dish
  const handleAddDish = async () => {
    if (!categoryForNewDish || !dishName.trim() || !dishPrice.trim()) {
      alert('Please fill in dish name and price');
      return;
    }

    const price = parseFloat(dishPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    let secondPrice = undefined;
    if (dishSecondPrice.trim()) {
      secondPrice = parseFloat(dishSecondPrice);
      if (isNaN(secondPrice) || secondPrice <= 0) {
        alert('Please enter a valid second price or leave it empty');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      await addDishService({
        name: dishName.trim(),
        category: categoryForNewDish,
        price: price,
        secondPrice: secondPrice,
        available: dishAvailable,
        imageUrl: '',
      });

      const data = await getMenuData();
      setCategories(data.categories);
      setMenuItems(data.items);

      alert('Dish added successfully!');
      closeAll();
    } catch (err) {
      console.error('Error adding dish:', err);
      alert('Failed to add dish. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add category
  const handleAddCategory = async () => {
    if (!newCategoryNameInput.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);

      await addCategoryService({
        name: newCategoryNameInput.trim(),
        hasTwoSizes: newCategoryHasTwoSizes,
      });

      const data = await getMenuData();
      setCategories(data.categories);
      setMenuItems(data.items);

      alert('Category added successfully!');
      closeAll();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit dish
const handleEditDish = async () => {
  if (!dishBeingEdited || !dishName.trim() || !dishPrice.trim()) {
    alert('Please fill in dish name and price');
    return;
  }

  const price = parseFloat(dishPrice);
  if (isNaN(price) || price <= 0) {
    alert('Please enter a valid price');
    return;
  }

  let secondPrice = undefined;
  if (dishSecondPrice.trim()) {
    secondPrice = parseFloat(dishSecondPrice);
    if (isNaN(secondPrice) || secondPrice <= 0) {
      alert('Please enter a valid second price or leave it empty');
      return;
    }
  }

  try {
    setIsSubmitting(true);

    await updateDishService(dishBeingEdited.id, {
      name: dishName.trim(),
      price: price,
      secondPrice: secondPrice,
      available: dishAvailable,
      imageUrl: dishImagePreview || '',
    });

    const data = await getMenuData();
    setCategories(data.categories);
    setMenuItems(data.items);

    alert('Dish updated successfully!');
    closeAll();
  } catch (err) {
    console.error('Error updating dish:', err);
    alert('Failed to update dish. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

// Handle delete dish
const handleDeleteDish = async () => {
  if (!dishBeingDeleted) return;

  try {
    setIsSubmitting(true);
    await deleteDishService(dishBeingDeleted.id);

    const data = await getMenuData();
    setCategories(data.categories);
    setMenuItems(data.items);

    alert('Dish deleted successfully!');
    closeAll();
  } catch (err) {
    console.error('Error deleting dish:', err);
    alert('Failed to delete dish. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};




  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDishImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDishImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create categories array with "Full Menu" as first option
  const allCategories = ['Full Menu', ...categories.map(cat => cat.name)];

  // Filter items based on selected category and admin status
  // Non-admins only see available items
  const getFilteredItems = () => {
    let items = selectedCategory === 'Full Menu'
      ? menuItems
      : menuItems.filter(item => item.category === selectedCategory);

    // Filter out unavailable items for non-admins
    if (!isAdmin) {
      items = items.filter(item => item.available);
    }

    return items;
  };

  const filteredItems = getFilteredItems();

  // Group items by category - Include empty categories for admins
  const groupedItems = selectedCategory === 'Full Menu'
    ? categories.reduce((acc, category) => {
      const items = menuItems.filter(item => item.category === category.name);
      // Filter unavailable items for non-admins
      const displayItems = isAdmin ? items : items.filter(item => item.available);

      // Show category even if empty for admins, or if it has visible items
      if (isAdmin || displayItems.length > 0) {
        acc[category.name] = {
          items: displayItems,
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

        {/* Add Category Button */}
        {isAdmin && (
          <div className="add-category-section">
            <button onClick={openAddCategory} className="add-category-btn">
              <span className="plus-icon">+</span>
              Add Category
            </button>
          </div>
        )}

        <div className="menu-content">
          {Object.entries(groupedItems).map(([categoryName, { items, hasTwoSizes }]) => (
            <div key={categoryName} className="menu-category">
              <div className="category-header-row">
                <h2 className="category-title">{categoryName}</h2>

                {isAdmin && (
                  <div className="category-admin-controls">
                    <button
                      onClick={() => editCategory(categoryName)}
                      className="admin-icon-btn edit-btn"
                      title="Edit category"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteCategory(categoryName)}
                      className="admin-icon-btn delete-btn"
                      title="Delete category"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                    <button
                      onClick={() => addDish(categoryName)}
                      className="admin-icon-btn add-btn"
                      title="Add dish"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                )}

                {hasTwoSizes && (
                  <div className="size-headers">
                    <span className="size-header">Large / Small</span>
                  </div>
                )}
              </div>

              <div className="menu-items">
                {items.length > 0 ? (
  items.map((item) => (
    <div
      key={item.id}
      className={`menu-item ${!item.available ? 'unavailable' : ''} ${isAdmin ? 'clickable' : ''}`}
      onClick={() => isAdmin ? editDish(item) : undefined}
      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
    >
      <div className="item-content">
        <h3 className="item-name">
          {item.name}
          {!item.available && <span className="unavailable-badge">(Unavailable)</span>}
        </h3>
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
  ))
) : (
  isAdmin && (
    <div className="empty-category">
      <p>No dishes in this category yet. Click the + button above to add one.</p>
    </div>
  )
)}
              </div>
            </div>
          ))}
        </div>

        {menuNote && (
          <div className="menu-note">
            <p>{menuNote}</p>
          </div>
        )}

        {/* Edit Category Popup */}
        {categoryBeingEdited && (
          <>
            <div className="edit-overlay" onClick={closeAll}></div>
            <div className="edit-menu-popup">
              <h2>Edit Category</h2>
              <p className="popup-subtitle">Update the category name</p>

              <div className="form-group">
                <label>Current name:</label>
                <div className="current-value">{categoryBeingEdited}</div>
              </div>

              <div className="form-group">
                <label>New name:</label>
                <input
                  type="text"
                  placeholder="Enter new category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="popup-buttons">
                <button
                  className="save-btn"
                  onClick={handleSaveCategoryName}
                  disabled={isSubmitting || !newCategoryName.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAll}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete Category Popup */}
        {categoryBeingDeleted && (
          <>
            <div className="edit-overlay" onClick={closeAll}></div>
            <div className="edit-menu-popup">
              <h2>Delete Category</h2>
              <p className="popup-subtitle warning">This action cannot be undone</p>

              <p className="confirmation-text">
                Are you sure you want to delete <strong>{categoryBeingDeleted}</strong>?
                <br />
                <span className="warning-subtext">All dishes in this category will also be deleted.</span>
              </p>

              <div className="popup-buttons">
                <button
                  className="delete-button"
                  onClick={handleDeleteCategory}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAll}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Dish Popup */}
        {categoryForNewDish && (
          <>
            <div className="edit-overlay" onClick={closeAll}></div>
            <div className="edit-menu-popup add-dish-popup">
              <h2>Add New Dish</h2>
              <p className="popup-subtitle">Category: <strong>{categoryForNewDish}</strong></p>

              <div className="form-group">
                <label>Dish name: *</label>
                <input
                  type="text"
                  placeholder="e.g., Moussaka"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price: *</label>
                  <input
                    type="number"
                    placeholder="15"
                    min="0"
                    step="0.01"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Second Price: (optional)</label>
                  <input
                    type="number"
                    placeholder="10"
                    min="0"
                    step="0.01"
                    value={dishSecondPrice}
                    onChange={(e) => setDishSecondPrice(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={dishAvailable}
                    onChange={(e) => setDishAvailable(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Dish is available</span>
                </label>
              </div>

              <div className="form-group">
                <label>Dish Image: (placeholder)</label>
                <div className="image-upload-section">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={isSubmitting}
                    className="file-input"
                    id="dish-image-upload"
                  />
                  <label htmlFor="dish-image-upload" className="file-input-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Choose Image
                  </label>
                  {dishImagePreview && (
                    <div className="image-preview">
                      <img src={dishImagePreview} alt="Preview" />
                    </div>
                  )}
                  <p className="image-note">Image upload will be implemented in a future update</p>
                </div>
              </div>

              <div className="popup-buttons">
                <button
                  className="save-btn"
                  onClick={handleAddDish}
                  disabled={isSubmitting || !dishName.trim() || !dishPrice.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Dish'}
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAll}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Category Popup */}
        {showAddCategory && (
          <>
            <div className="edit-overlay" onClick={closeAll}></div>
            <div className="edit-menu-popup">
              <h2>Add New Category</h2>
              <p className="popup-subtitle">Create a new menu category</p>

              <div className="form-group">
                <label>Category name: *</label>
                <input
                  type="text"
                  placeholder="e.g., Appetizers"
                  value={newCategoryNameInput}
                  onChange={(e) => setNewCategoryNameInput(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newCategoryHasTwoSizes}
                    onChange={(e) => setNewCategoryHasTwoSizes(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>This category has two sizes (Large/Small)</span>
                </label>
              </div>

              <div className="popup-buttons">
                <button
                  className="save-btn"
                  onClick={handleAddCategory}
                  disabled={isSubmitting || !newCategoryNameInput.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Category'}
                </button>

                <button
                  className="cancel-btn"
                  onClick={closeAll}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Edit Dish Popup */}
{dishBeingEdited && (
  <>
    <div className="edit-overlay" onClick={closeAll}></div>
    <div className="edit-menu-popup add-dish-popup">
      <h2>Edit Dish</h2>
      <p className="popup-subtitle">Category: <strong>{dishBeingEdited.category}</strong></p>

      <div className="form-group">
        <label>Dish name: *</label>
        <input
          type="text"
          placeholder="e.g., Moussaka"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price: *</label>
          <input
            type="number"
            placeholder="15"
            min="0"
            step="0.01"
            value={dishPrice}
            onChange={(e) => setDishPrice(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>Second Price: (optional)</label>
          <input
            type="number"
            placeholder="10"
            min="0"
            step="0.01"
            value={dishSecondPrice}
            onChange={(e) => setDishSecondPrice(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={dishAvailable}
            onChange={(e) => setDishAvailable(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>Dish is available</span>
        </label>
      </div>

      <div className="form-group">
        <label>Dish Image: (placeholder)</label>
        <div className="image-upload-section">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={isSubmitting}
            className="file-input"
            id="edit-dish-image-upload"
          />
          <label htmlFor="edit-dish-image-upload" className="file-input-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Choose Image
          </label>
          {dishImagePreview && (
            <div className="image-preview">
              <img src={dishImagePreview} alt="Preview" />
            </div>
          )}
          <p className="image-note">Image upload will be implemented in a future update</p>
        </div>
      </div>

      <div className="popup-buttons">
        <button
          className="save-btn"
          onClick={handleEditDish}
          disabled={isSubmitting || !dishName.trim() || !dishPrice.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          className="delete-button"
          onClick={() => {
            closeAll();
            deleteDishConfirm(dishBeingEdited);
          }}
          disabled={isSubmitting}
        >
          Delete Dish
        </button>

        <button
          className="cancel-btn"
          onClick={closeAll}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  </>
)}

{/* Delete Dish Confirmation Popup */}
{dishBeingDeleted && (
  <>
    <div className="edit-overlay" onClick={closeAll}></div>
    <div className="edit-menu-popup">
      <h2>Delete Dish</h2>
      <p className="popup-subtitle warning">This action cannot be undone</p>

      <p className="confirmation-text">
        Are you sure you want to delete <strong>{dishBeingDeleted.name}</strong>?
      </p>

      <div className="popup-buttons">
        <button
          className="delete-button"
          onClick={handleDeleteDish}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
        </button>

        <button
          className="cancel-btn"
          onClick={closeAll}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  </>
)}

      </main>

      <Footer />
    </div>
  );
}