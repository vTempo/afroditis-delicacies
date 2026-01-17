// app/services/menuService.ts
import { collection, getDocs, query, where, writeBatch, addDoc, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { MenuItem, MenuCategory } from '../types/types';

/**
 * Get all menu data (categories and items)
 */
export async function getMenuData(): Promise<{
    categories: MenuCategory[];
    items: MenuItem[];
    menuNote: string;
}> {
    try {
        // Fetch categories
        const categoriesRef = collection(db, 'categories');
        const categoriesQuery = query(categoriesRef, orderBy('order', 'asc'));
        const categoriesSnapshot = await getDocs(categoriesQuery);

        const categories: MenuCategory[] = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            hasTwoSizes: doc.data().hasTwoSizes || false,
            order: doc.data().order || 0,
        }));

        // Fetch menu items
        const menuItemsRef = collection(db, 'menuItems');
        const menuItemsQuery = query(menuItemsRef, orderBy('order', 'asc'));
        const menuItemsSnapshot = await getDocs(menuItemsQuery);

        const items: MenuItem[] = menuItemsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            category: doc.data().category,
            price: doc.data().price,
            secondPrice: doc.data().secondPrice || undefined,
            available: doc.data().available ?? true,
            imageUrl: doc.data().imageUrl || '',
            isTopSeller: doc.data().isTopSeller || false,
            description: doc.data().description || '',
            order: doc.data().order || 0,
        }));

        return {
            categories,
            items,
            menuNote: '',
        };
    } catch (error) {
        console.error('Error fetching menu data:', error);
        throw new Error('Failed to fetch menu data');
    }
}

/**
 * Update a category name and all associated menu items
 */
export async function updateCategoryName(oldName: string, newName: string): Promise<void> {
    try {
        const batch = writeBatch(db);

        // 1. Update the category document
        const categoriesRef = collection(db, 'categories');
        const categoryQuery = query(categoriesRef, where('name', '==', oldName));
        const categorySnapshot = await getDocs(categoryQuery);

        if (categorySnapshot.empty) {
            throw new Error(`Category "${oldName}" not found`);
        }

        categorySnapshot.forEach((docSnapshot) => {
            batch.update(docSnapshot.ref, {
                name: newName,
                updatedAt: new Date(),
            });
        });

        // 2. Update all menu items with this category
        const menuItemsRef = collection(db, 'menuItems');
        const itemsQuery = query(menuItemsRef, where('category', '==', oldName));
        const itemsSnapshot = await getDocs(itemsQuery);

        itemsSnapshot.forEach((docSnapshot) => {
            batch.update(docSnapshot.ref, {
                category: newName,
                updatedAt: new Date(),
            });
        });

        // 3. Commit all updates in a single batch
        await batch.commit();

        console.log(`Successfully updated category "${oldName}" to "${newName}" and ${itemsSnapshot.size} menu items`);
    } catch (error) {
        console.error('Error updating category name:', error);
        throw new Error('Failed to update category name');
    }
}

/**
 * Delete a category and all associated menu items
 */
export async function deleteCategory(categoryName: string): Promise<void> {
    try {
        const batch = writeBatch(db);

        // 1. Find and delete the category document
        const categoriesRef = collection(db, 'categories');
        const categoryQuery = query(categoriesRef, where('name', '==', categoryName));
        const categorySnapshot = await getDocs(categoryQuery);

        if (categorySnapshot.empty) {
            throw new Error(`Category "${categoryName}" not found`);
        }

        categorySnapshot.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref);
        });

        // 2. Find and delete all menu items with this category
        const menuItemsRef = collection(db, 'menuItems');
        const itemsQuery = query(menuItemsRef, where('category', '==', categoryName));
        const itemsSnapshot = await getDocs(itemsQuery);

        itemsSnapshot.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref);
        });

        // 3. Commit all deletions in a single batch
        await batch.commit();

        console.log(`Successfully deleted category "${categoryName}" and ${itemsSnapshot.size} menu items`);
    } catch (error) {
        console.error('Error deleting category:', error);
        throw new Error('Failed to delete category');
    }
}

/**
 * Add a new dish to a category
 * FIXED: Removed orderBy to avoid composite index requirement
 */
export async function addDish(dishData: {
    name: string;
    category: string;
    price: number;
    secondPrice?: number;
    available: boolean;
    imageUrl?: string;
}): Promise<void> {
    try {
        // Get all items in this category (without orderBy to avoid index requirement)
        const menuItemsRef = collection(db, 'menuItems');
        const itemsQuery = query(menuItemsRef, where('category', '==', dishData.category));
        const itemsSnapshot = await getDocs(itemsQuery);

        // Find max order manually
        let maxOrder = 0;
        itemsSnapshot.forEach((doc) => {
            const order = doc.data().order || 0;
            if (order > maxOrder) {
                maxOrder = order;
            }
        });

        // Create new dish with order = maxOrder + 1
        const newDish = {
            name: dishData.name,
            category: dishData.category,
            price: dishData.price,
            secondPrice: dishData.secondPrice || null,
            available: dishData.available,
            imageUrl: dishData.imageUrl || '',
            isTopSeller: false,
            description: '',
            order: maxOrder + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await addDoc(menuItemsRef, newDish);

        console.log(`Successfully added dish "${dishData.name}" to category "${dishData.category}"`);
    } catch (error) {
        console.error('Error adding dish:', error);
        throw new Error('Failed to add dish');
    }
}

/**
 * Add a new category
 * FIXED: Removed orderBy to avoid index requirement
 */
export async function addCategory(categoryData: {
    name: string;
    hasTwoSizes: boolean;
}): Promise<void> {
    try {
        // Get all categories (without orderBy to avoid potential issues)
        const categoriesRef = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesRef);

        // Find max order manually
        let maxOrder = 0;
        categoriesSnapshot.forEach((doc) => {
            const order = doc.data().order || 0;
            if (order > maxOrder) {
                maxOrder = order;
            }
        });

        // Create new category with order = maxOrder + 1
        const newCategory = {
            name: categoryData.name,
            hasTwoSizes: categoryData.hasTwoSizes,
            order: maxOrder + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await addDoc(categoriesRef, newCategory);

        console.log(`Successfully added category "${categoryData.name}"`);
    } catch (error) {
        console.error('Error adding category:', error);
        throw new Error('Failed to add category');
    }
}

/**
 * Update a dish
 */
export async function updateDish(dishId: string, dishData: {
    name: string;
    price: number;
    secondPrice?: number;
    available: boolean;
    imageUrl?: string;
}): Promise<void> {
    try {
        const dishDocRef = doc(db, 'menuItems', dishId);
        
        await updateDoc(dishDocRef, {
            name: dishData.name,
            price: dishData.price,
            secondPrice: dishData.secondPrice || null,
            available: dishData.available,
            imageUrl: dishData.imageUrl || '',
            updatedAt: new Date(),
        });

        console.log(`Successfully updated dish "${dishData.name}"`);
    } catch (error) {
        console.error('Error updating dish:', error);
        throw new Error('Failed to update dish');
    }
}

/**
 * Delete a dish
 */
export async function deleteDish(dishId: string): Promise<void> {
    try {
        const dishDocRef = doc(db, 'menuItems', dishId);
        await deleteDoc(dishDocRef);

        console.log(`Successfully deleted dish with ID "${dishId}"`);
    } catch (error) {
        console.error('Error deleting dish:', error);
        throw new Error('Failed to delete dish');
    }
}