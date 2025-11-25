// app/services/menuService.ts
import { collection, getDocs, query, orderBy, doc, getDoc, writeBatch, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { MenuItem, MenuCategory } from '../types/types';

/**
 * Fetch all categories from Firestore, ordered by 'order' field
 */
export async function getCategories(): Promise<MenuCategory[]> {
    try {
        const categoriesRef = collection(db, 'categories');
        const q = query(categoriesRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);

        const categories: MenuCategory[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            categories.push({
                id: doc.id,
                name: data.name,
                order: data.order,
                hasTwoSizes: data.hasTwoSizes || false,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        console.log('Fetched categories:', categories);
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new Error('Failed to fetch categories');
    }
}

/**
 * Fetch all menu items from Firestore, ordered by 'order' field
 */
export async function getMenuItems(): Promise<MenuItem[]> {
    try {
        const menuItemsRef = collection(db, 'menuItems');
        const q = query(menuItemsRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);

        const items: MenuItem[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                name: data.name,
                category: data.category,
                price: data.price,
                secondPrice: data.secondPrice,
                isTopSeller: data.isTopSeller || false,
                description: data.description,
                imageUrl: data.imageUrl,
                available: data.available !== false,
                order: data.order,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        console.log('Fetched menu items:', items);
        return items;
    } catch (error) {
        console.error('Error fetching menu items:', error);
        throw new Error('Failed to fetch menu items');
    }
}

/**
 * Fetch menu note from a settings document in Firestore
 */
export async function getMenuNote(): Promise<string> {
    try {
        const settingsRef = doc(db, 'settings', 'menu');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            return settingsDoc.data().note || '';
        }

        return '';
    } catch (error) {
        console.error('Error fetching menu note:', error);
        return '';
    }
}

/**
 * Fetch all menu data at once
 */
export async function getMenuData() {
    try {
        const [categories, items, menuNote] = await Promise.all([
            getCategories(),
            getMenuItems(),
            getMenuNote(),
        ]);

        return { categories, items, menuNote };
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

        // 1. Find and update the category document
        const categoriesRef = collection(db, 'categories');
        const categoryQuery = query(categoriesRef, where('name', '==', oldName));
        const categorySnapshot = await getDocs(categoryQuery);

        if (categorySnapshot.empty) {
            throw new Error(`Category "${oldName}" not found`);
        }

        // Update category name
        categorySnapshot.forEach((docSnapshot) => {
            batch.update(docSnapshot.ref, {
                name: newName,
                updatedAt: new Date()
            });
        });

        // 2. Find and update all menu items with this category
        const menuItemsRef = collection(db, 'menuItems');
        const itemsQuery = query(menuItemsRef, where('category', '==', oldName));
        const itemsSnapshot = await getDocs(itemsQuery);

        itemsSnapshot.forEach((docSnapshot) => {
            batch.update(docSnapshot.ref, {
                category: newName,
                updatedAt: new Date()
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
        // Get the highest order number for items in this category
        const menuItemsRef = collection(db, 'menuItems');
        const itemsQuery = query(menuItemsRef, where('category', '==', dishData.category), orderBy('order', 'desc'));
        const itemsSnapshot = await getDocs(itemsQuery);

        let maxOrder = 0;
        if (!itemsSnapshot.empty) {
            const firstDoc = itemsSnapshot.docs[0];
            maxOrder = firstDoc.data().order || 0;
        }

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
 */
export async function addCategory(categoryData: {
    name: string;
    hasTwoSizes: boolean;
}): Promise<void> {
    try {
        // Get the highest order number for categories
        const categoriesRef = collection(db, 'categories');
        const categoriesQuery = query(categoriesRef, orderBy('order', 'desc'));
        const categoriesSnapshot = await getDocs(categoriesQuery);

        let maxOrder = 0;
        if (!categoriesSnapshot.empty) {
            const firstDoc = categoriesSnapshot.docs[0];
            maxOrder = firstDoc.data().order || 0;
        }

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