import { useState } from "react";

export function useEditMenu() {
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<string | null>(null);
  const [categoryBeingDeleted, setCategoryBeingDeleted] = useState<string | null>(null);
  const [categoryForNewDish, setCategoryForNewDish] = useState<string | null>(null);

  function editCategory(name: string) {
    console.log("Edit category:", name);
    setCategoryBeingEdited(name);
  }

  function deleteCategory(name: string) {
    console.log("Delete category:", name);
    setCategoryBeingDeleted(name);
  }

  function addDish(name: string) {
    console.log("Add dish to:", name);
    setCategoryForNewDish(name);
  }

  function closeAll() {
    setCategoryBeingEdited(null);
    setCategoryBeingDeleted(null);
    setCategoryForNewDish(null);
  }

  return {
    // state
    categoryBeingEdited,
    categoryBeingDeleted,
    categoryForNewDish,

    // actions
    editCategory,
    deleteCategory,
    addDish,

    // helper
    closeAll
  };
}