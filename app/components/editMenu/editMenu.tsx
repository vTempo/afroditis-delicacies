// app/components/editMenu/editMenu.tsx
import { useState } from "react";

export function useEditMenu() {
  // Popup states
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<string | null>(null);
  const [categoryBeingDeleted, setCategoryBeingDeleted] = useState<string | null>(null);
  const [categoryForNewDish, setCategoryForNewDish] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);

  // Edit category form
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Add dish form
  const [dishName, setDishName] = useState<string>('');
  const [dishPrice, setDishPrice] = useState<string>('');
  const [dishSecondPrice, setDishSecondPrice] = useState<string>('');
  const [dishAvailable, setDishAvailable] = useState<boolean>(true);
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState<string>('');

  // Add category form
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');
  const [newCategoryHasTwoSizes, setNewCategoryHasTwoSizes] = useState<boolean>(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  function editCategory(name: string) {
    console.log("Edit category:", name);
    setCategoryBeingEdited(name);
    setNewCategoryName(name); // Pre-fill with current name
  }

  function deleteCategory(name: string) {
    console.log("Delete category:", name);
    setCategoryBeingDeleted(name);
  }

  function addDish(categoryName: string) {
    console.log("Add dish to:", categoryName);
    setCategoryForNewDish(categoryName);
    // Reset form
    setDishName('');
    setDishPrice('');
    setDishSecondPrice('');
    setDishAvailable(true);
    setDishImage(null);
    setDishImagePreview('');
  }

  function openAddCategory() {
    setShowAddCategory(true);
    setNewCategoryNameInput('');
    setNewCategoryHasTwoSizes(false);
  }

  function closeAll() {
    setCategoryBeingEdited(null);
    setCategoryBeingDeleted(null);
    setCategoryForNewDish(null);
    setShowAddCategory(false);
    setNewCategoryName('');
    setDishName('');
    setDishPrice('');
    setDishSecondPrice('');
    setDishAvailable(true);
    setDishImage(null);
    setDishImagePreview('');
    setNewCategoryNameInput('');
    setNewCategoryHasTwoSizes(false);
    setIsSubmitting(false);
  }

  return {
    // Popup states
    categoryBeingEdited,
    categoryBeingDeleted,
    categoryForNewDish,
    showAddCategory,

    // Edit category
    newCategoryName,
    setNewCategoryName,

    // Add dish
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

    // Add category
    newCategoryNameInput,
    setNewCategoryNameInput,
    newCategoryHasTwoSizes,
    setNewCategoryHasTwoSizes,

    // Loading
    isSubmitting,
    setIsSubmitting,

    // Actions
    editCategory,
    deleteCategory,
    addDish,
    openAddCategory,
    closeAll
  };
}