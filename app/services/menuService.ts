// app/services/menuService.ts
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
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

        console.log(querySnapshot);
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
                available: data.available !== false, // Default to true if not specified
                order: data.order,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        console.log('Fetched menu items:', items);
        // Filter out unavailable items
        return items.filter(item => item.available);
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